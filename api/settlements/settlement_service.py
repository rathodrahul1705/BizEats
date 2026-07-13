import logging
import uuid
import os
from decimal import Decimal
from datetime import timedelta
from io import BytesIO

import boto3
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from api.models import Settlement, SettlementOrder, Order

logger = logging.getLogger(__name__)

# ----------------------------------------------------------------------
# Font registration for INR (₹) symbol support
# ----------------------------------------------------------------------
FONT_PATH = os.path.join(settings.BASE_DIR, 'fonts', 'DejaVuSans.ttf')
FONT_PATH_BOLD = os.path.join(settings.BASE_DIR, 'fonts', 'DejaVuSans-Bold.ttf')
USE_RUPEE_SYMBOL = False
DEFAULT_FONT = 'Helvetica'
DEFAULT_FONT_BOLD = 'Helvetica-Bold'

if os.path.exists(FONT_PATH):
    try:
        pdfmetrics.registerFont(TTFont('DejaVuSans', FONT_PATH))
        DEFAULT_FONT = 'DejaVuSans'
        USE_RUPEE_SYMBOL = True
        if os.path.exists(FONT_PATH_BOLD):
            pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', FONT_PATH_BOLD))
            DEFAULT_FONT_BOLD = 'DejaVuSans-Bold'
        else:
            DEFAULT_FONT_BOLD = 'DejaVuSans'  # no bold variant available, reuse regular
        logger.info("Registered DejaVuSans font for Rupee symbol support.")
    except Exception as e:
        logger.warning("Failed to register DejaVuSans: %s", e)
        DEFAULT_FONT = 'Helvetica'
        DEFAULT_FONT_BOLD = 'Helvetica-Bold'
else:
    logger.warning("DejaVuSans font not found at %s. Rupee symbol will be shown as 'Rs.'.", FONT_PATH)


def inr_format(amount):
    """Format a Decimal as Indian Rupees with comma separators.
       Uses ₹ if font supports it, otherwise 'Rs.'"""
    symbol = "₹" if USE_RUPEE_SYMBOL else "Rs."
    return f"{symbol} {amount:,.2f}"


def get_s3_client():
    """Return a boto3 S3 client using settings."""
    return boto3.client(
        's3',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME,
    )


# ----------------------------------------------------------------------
# Design tokens - keep in one place so the invoice is easy to re-theme
# ----------------------------------------------------------------------
BRAND_COLOR = colors.HexColor('#FF6B35')       # primary brand orange
BRAND_DARK = colors.HexColor('#1A1A2E')        # near-black for headings
BRAND_LIGHT = colors.HexColor('#FFF3EC')       # very light orange (row tint)
TEXT_MUTED = colors.HexColor('#6B7280')        # muted grey for secondary text
BORDER_LIGHT = colors.HexColor('#E5E7EB')      # light grey borders
TOTAL_ROW_BG = colors.HexColor('#1A1A2E')      # dark band for the totals row
TOTAL_ROW_TEXT = colors.white


def _add_page_number(canvas, doc):
    """Draws a footer with page number + brand strip on every page."""
    canvas.saveState()
    canvas.setStrokeColor(BORDER_LIGHT)
    canvas.setLineWidth(0.75)
    canvas.line(0.75 * inch, 0.6 * inch, letter[0] - 0.75 * inch, 0.6 * inch)
    canvas.setFont(DEFAULT_FONT, 8)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(0.75 * inch, 0.42 * inch, "Vensavor FoodTech LLP")
    canvas.drawRightString(
        letter[0] - 0.75 * inch, 0.42 * inch, f"Page {doc.page}"
    )
    canvas.restoreState()


class SettlementService:
    COMMISSION_RATE = Decimal('0.10')  # 10%

    @staticmethod
    def get_current_weekly_period(reference_date=None):
        if reference_date is None:
            reference_date = timezone.now().date()
        start = reference_date - timedelta(days=reference_date.weekday())
        end = start + timedelta(days=6)
        return start, end

    @staticmethod
    def generate_settlement(restaurant_id, start_date, end_date, force=False):
        """
        Generate a settlement for a given restaurant and date range.
        Returns the created Settlement instance.
        Raises ValidationError with specific messages:
          - "Settlement already exists for this period."
          - "No completed orders found for this period."
        """
        logger.info(
            "Starting settlement generation for restaurant %s from %s to %s (force=%s)",
            restaurant_id, start_date, end_date, force
        )

        # Validate period
        if start_date.weekday() != 0:
            raise ValidationError("Start date must be a Monday.")
        if end_date.weekday() != 6:
            raise ValidationError("End date must be a Sunday.")
        if (end_date - start_date).days != 6:
            raise ValidationError("Period must be exactly 7 days (Monday to Sunday).")

        # Check for existing settlement
        existing = Settlement.objects.filter(
            restaurant_id=restaurant_id,
            start_date=start_date,
            end_date=end_date
        ).first()

        if existing:
            if force:
                with transaction.atomic():
                    existing.delete()
                logger.info("Deleted existing settlement %s due to force=True", existing.settlement_number)
            else:
                raise ValidationError("Settlement already exists for this period.")

        # Fetch completed orders not yet settled
        orders = Order.objects.filter(
            restaurant_id=restaurant_id,
            status=6,  # completed
            order_date__range=(start_date, end_date)
        ).select_related('restaurant')

        if not orders.exists():
            raise ValidationError("No completed orders found for this period.")

        logger.info("Found %d orders for settlement", orders.count())

        # Aggregates
        total_orders = orders.count()
        total_item_gross = Decimal('0.00')
        total_gross = Decimal('0.00')
        total_delivery = Decimal('0.00')
        total_tax = Decimal('0.00')
        total_commission = Decimal('0.00')
        total_payable = Decimal('0.00')
        settlement_orders = []

        for order in orders:
            subtotal = order.subtotal or Decimal('0.00')
            delivery = order.delivery_fee or Decimal('0.00')
            tax = order.tax or Decimal('0.00')
            total_amount = subtotal + delivery + tax

            commission = subtotal * SettlementService.COMMISSION_RATE
            payable = subtotal - commission

            total_item_gross += subtotal
            total_gross += total_amount
            total_delivery += delivery
            total_tax += tax
            total_commission += commission
            total_payable += payable

            settlement_orders.append(
                SettlementOrder(
                    settlement=None,
                    order=order,
                    item_gross_sales=subtotal,
                    gross_sales=total_amount,
                    delivery_charge=delivery,
                    taxes=tax,
                    commission=commission,
                    payable=payable
                )
            )

        adjustments = Decimal('0.00')

        logger.info(
            "Totals for restaurant %s: orders=%d, item_gross=%.2f, gross=%.2f, "
            "commission=%.2f, delivery=%.2f, tax=%.2f, payable=%.2f",
            restaurant_id, total_orders, total_item_gross, total_gross,
            total_commission, total_delivery, total_tax, total_payable
        )

        # Create settlement inside a transaction
        with transaction.atomic():
            settlement = Settlement.objects.create(
                settlement_number=SettlementService._generate_settlement_number(restaurant_id),
                restaurant_id=restaurant_id,
                start_date=start_date,
                end_date=end_date,
                payout_date=end_date + timedelta(days=1),   # next Monday after the week
                total_orders=total_orders,
                item_gross_sales=total_item_gross,
                gross_sales=total_gross,
                commission=total_commission,
                delivery_charge=total_delivery,
                taxes=total_tax,
                adjustments=adjustments,
                payable_amount=total_payable,
            )

            # Assign settlement to each order and bulk create
            for so in settlement_orders:
                so.settlement = settlement
            SettlementOrder.objects.bulk_create(settlement_orders)

        logger.info(
            "Settlement %s created for restaurant %s with %d orders, payable %.2f, payout on %s",
            settlement.settlement_number, restaurant_id, total_orders, total_payable,
            settlement.payout_date
        )
        return settlement

    @staticmethod
    def _generate_settlement_number(restaurant_id):
        short_uuid = uuid.uuid4().hex[:8].upper()
        return f"SET-{restaurant_id}-{short_uuid}"

    # --------------------------------------------------------------
    # Invoice PDF generation
    # --------------------------------------------------------------
    @staticmethod
    def generate_invoice(settlement):
        """
        Generate a professionally designed PDF invoice (INR currency) and upload it directly to S3.
        The S3 key is stored in the settlement_file field.
        """
        if isinstance(settlement, (int, str)):
            try:
                settlement = Settlement.objects.get(pk=settlement)
            except Settlement.DoesNotExist:
                raise ValidationError("Settlement not found.")

        settlement_orders = SettlementOrder.objects.filter(
            settlement=settlement
        ).select_related('order')

        if not settlement_orders.exists():
            raise ValidationError("No orders associated with this settlement.")

        restaurant = settlement.restaurant

        # --- Document setup ---
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            topMargin=0.75 * inch,
            bottomMargin=0.85 * inch,
            leftMargin=0.75 * inch,
            rightMargin=0.75 * inch,
            title=f"Settlement Invoice {settlement.settlement_number}",
        )
        avail_width = doc.width
        elements = []

        # --- Styles ---
        styles = getSampleStyleSheet()

        brand_name_style = ParagraphStyle(
            'BrandName', parent=styles['Normal'],
            fontName=DEFAULT_FONT_BOLD, fontSize=22, leading=26,
            textColor=BRAND_COLOR, alignment=TA_LEFT,
        )
        brand_tagline_style = ParagraphStyle(
            'BrandTagline', parent=styles['Normal'],
            fontName=DEFAULT_FONT, fontSize=8.5, leading=11,
            textColor=TEXT_MUTED, alignment=TA_LEFT,
        )
        invoice_title_style = ParagraphStyle(
            'InvoiceTitle', parent=styles['Normal'],
            fontName=DEFAULT_FONT_BOLD, fontSize=16, leading=19,
            textColor=BRAND_DARK, alignment=TA_RIGHT,
        )
        invoice_number_style = ParagraphStyle(
            'InvoiceNumber', parent=styles['Normal'],
            fontName=DEFAULT_FONT, fontSize=9.5, leading=13,
            textColor=TEXT_MUTED, alignment=TA_RIGHT,
        )
        label_style = ParagraphStyle(
            'Label', parent=styles['Normal'],
            fontName=DEFAULT_FONT, fontSize=8, leading=11,
            textColor=TEXT_MUTED, alignment=TA_LEFT,
        )
        value_style = ParagraphStyle(
            'Value', parent=styles['Normal'],
            fontName=DEFAULT_FONT_BOLD, fontSize=10.5, leading=14,
            textColor=BRAND_DARK, alignment=TA_LEFT,
        )
        heading_style = ParagraphStyle(
            'SectionHeading', parent=styles['Normal'],
            fontName=DEFAULT_FONT_BOLD, fontSize=11, leading=14,
            textColor=BRAND_DARK, alignment=TA_LEFT,
        )
        table_header_style = ParagraphStyle(
            'TableHeader', parent=styles['Normal'],
            fontName=DEFAULT_FONT_BOLD, fontSize=8.5, leading=11,
            textColor=colors.white, alignment=TA_CENTER,
        )
        cell_style = ParagraphStyle(
            'Cell', parent=styles['Normal'],
            fontName=DEFAULT_FONT, fontSize=9, leading=12,
            textColor=BRAND_DARK, alignment=TA_CENTER,
        )
        cell_right_style = ParagraphStyle(
            'CellRight', parent=cell_style, alignment=TA_RIGHT,
        )
        total_label_style = ParagraphStyle(
            'TotalLabel', parent=styles['Normal'],
            fontName=DEFAULT_FONT_BOLD, fontSize=9.5, leading=12,
            textColor=TOTAL_ROW_TEXT, alignment=TA_CENTER,
        )
        total_value_style = ParagraphStyle(
            'TotalValue', parent=total_label_style, alignment=TA_RIGHT,
        )
        summary_label_style = ParagraphStyle(
            'SummaryLabel', parent=styles['Normal'],
            fontName=DEFAULT_FONT, fontSize=9.5, leading=16,
            textColor=TEXT_MUTED, alignment=TA_LEFT,
        )
        summary_value_style = ParagraphStyle(
            'SummaryValue', parent=styles['Normal'],
            fontName=DEFAULT_FONT_BOLD, fontSize=9.5, leading=16,
            textColor=BRAND_DARK, alignment=TA_RIGHT,
        )
        payable_label_style = ParagraphStyle(
            'PayableLabel', parent=styles['Normal'],
            fontName=DEFAULT_FONT_BOLD, fontSize=12, leading=18,
            textColor=colors.white, alignment=TA_LEFT,
        )
        payable_value_style = ParagraphStyle(
            'PayableValue', parent=payable_label_style, alignment=TA_RIGHT, fontSize=14,
        )
        footer_style = ParagraphStyle(
            'Footer', parent=styles['Normal'],
            fontName=DEFAULT_FONT, fontSize=8.5, leading=13,
            textColor=TEXT_MUTED, alignment=TA_CENTER,
        )

        # =====================================================
        # HEADER: brand block (left) + invoice title block (right)
        # =====================================================
        header_data = [
            [
                Paragraph("EATOOR", brand_name_style),
                Paragraph("SETTLEMENT INVOICE", invoice_title_style),
            ],
            [
                Paragraph("Food delivery, simplified.", brand_tagline_style),
                Paragraph(f"Invoice #: {settlement.settlement_number}", invoice_number_style),
            ],
            [
                "",
                Paragraph(
                    f"Issued: {timezone.now().date().strftime('%d %b %Y')}",
                    invoice_number_style
                ),
            ],
        ]
        header_table = Table(header_data, colWidths=[avail_width * 0.5, avail_width * 0.5])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 0.16 * inch))
        elements.append(HRFlowable(width="100%", thickness=2, color=BRAND_COLOR, spaceAfter=0))
        elements.append(Spacer(1, 0.28 * inch))

        # =====================================================
        # META STRIP: Restaurant / Period / Payout — 3 clean columns
        # =====================================================
        restaurant_name = restaurant.restaurant_name if restaurant else 'N/A'
        meta_data = [
            [
                Paragraph("BILLED TO", label_style),
                Paragraph("SETTLEMENT PERIOD", label_style),
                Paragraph("PAYOUT DATE", label_style),
            ],
            [
                Paragraph(f"{restaurant_name} (ID: {settlement.restaurant_id})", value_style),
                Paragraph(
                    f"{settlement.start_date.strftime('%d %b %Y')} &ndash; "
                    f"{settlement.end_date.strftime('%d %b %Y')}",
                    value_style
                ),
                Paragraph(settlement.payout_date.strftime('%d %b %Y'), value_style),
            ],
        ]
        meta_col_w = avail_width / 3.0
        meta_table = Table(meta_data, colWidths=[meta_col_w] * 3)
        meta_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, 0), 0),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 4),
            ('TOPPADDING', (0, 1), (-1, 1), 0),
            ('BOTTOMPADDING', (0, 1), (-1, 1), 0),
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 0.3 * inch))

        # =====================================================
        # ORDER TABLE
        # =====================================================
        elements.append(Paragraph("Order Breakdown", heading_style))
        elements.append(Spacer(1, 0.1 * inch))

        col_frac = [0.13, 0.15, 0.14, 0.14, 0.12, 0.15, 0.17]
        col_widths = [avail_width * f for f in col_frac]

        headers = ["Order #", "Date", "Subtotal", "Delivery", "Tax", "Commission", "Payable"]
        table_data = [[Paragraph(h, table_header_style) for h in headers]]

        total_subtotal = Decimal('0.00')
        total_delivery = Decimal('0.00')
        total_tax = Decimal('0.00')
        total_commission = Decimal('0.00')
        total_payable = Decimal('0.00')

        for so in settlement_orders:
            order = so.order
            table_data.append([
                Paragraph(f"#{order.id}", cell_style),
                Paragraph(order.order_date.strftime('%d-%b-%Y') if order.order_date else '-', cell_style),
                Paragraph(inr_format(so.item_gross_sales), cell_right_style),
                Paragraph(inr_format(so.delivery_charge), cell_right_style),
                Paragraph(inr_format(so.taxes), cell_right_style),
                Paragraph(inr_format(so.commission), cell_right_style),
                Paragraph(inr_format(so.payable), cell_right_style),
            ])
            total_subtotal += so.item_gross_sales
            total_delivery += so.delivery_charge
            total_tax += so.taxes
            total_commission += so.commission
            total_payable += so.payable

        total_row_index = len(table_data)  # index of the row we're about to add
        table_data.append([
            Paragraph("TOTAL", total_label_style),
            "",
            Paragraph(inr_format(total_subtotal), total_value_style),
            Paragraph(inr_format(total_delivery), total_value_style),
            Paragraph(inr_format(total_tax), total_value_style),
            Paragraph(inr_format(total_commission), total_value_style),
            Paragraph(inr_format(total_payable), total_value_style),
        ])

        order_table = Table(table_data, colWidths=col_widths, repeatRows=1)

        table_style_cmds = [
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), BRAND_DARK),
            ('TOPPADDING', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 9),
            # Body rows
            ('TOPPADDING', (0, 1), (-1, -2), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -2), 6),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            # Zebra striping for readability
            ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, BRAND_LIGHT]),
            # Total row
            ('BACKGROUND', (0, total_row_index), (-1, total_row_index), TOTAL_ROW_BG),
            ('TOPPADDING', (0, total_row_index), (-1, total_row_index), 9),
            ('BOTTOMPADDING', (0, total_row_index), (-1, total_row_index), 9),
            ('SPAN', (0, total_row_index), (1, total_row_index)),
            # Gridlines - subtle, horizontal only for a cleaner look
            ('LINEBELOW', (0, 0), (-1, 0), 0, colors.white),
            ('LINEBELOW', (0, 1), (-1, -2), 0.5, BORDER_LIGHT),
            ('BOX', (0, 0), (-1, -1), 0.75, BORDER_LIGHT),
        ]
        order_table.setStyle(TableStyle(table_style_cmds))
        elements.append(order_table)
        elements.append(Spacer(1, 0.35 * inch))

        # =====================================================
        # SUMMARY — two-column detail rows + prominent payable banner
        # =====================================================
        elements.append(Paragraph("Summary", heading_style))
        elements.append(Spacer(1, 0.1 * inch))

        summary_rows = [
            [Paragraph("Total Orders", summary_label_style),
             Paragraph(str(settlement.total_orders), summary_value_style)],
            [Paragraph("Item Gross Sales", summary_label_style),
             Paragraph(inr_format(settlement.item_gross_sales), summary_value_style)],
            [Paragraph("Gross Sales", summary_label_style),
             Paragraph(inr_format(settlement.gross_sales), summary_value_style)],
            [Paragraph("Delivery Charges", summary_label_style),
             Paragraph(inr_format(settlement.delivery_charge), summary_value_style)],
            [Paragraph("Taxes", summary_label_style),
             Paragraph(inr_format(settlement.taxes), summary_value_style)],
            [Paragraph("Commission (10%)", summary_label_style),
             Paragraph(f"-{inr_format(settlement.commission)}", summary_value_style)],
            [Paragraph("Adjustments", summary_label_style),
             Paragraph(inr_format(settlement.adjustments), summary_value_style)],
        ]
        # Keep the detail summary to the right half of the page, like a typical invoice total block
        summary_table = Table(summary_rows, colWidths=[avail_width * 0.32, avail_width * 0.24])
        summary_wrapper = Table(
            [[Spacer(0, 0), summary_table]],
            colWidths=[avail_width * 0.44, avail_width * 0.56]
        )
        summary_table.setStyle(TableStyle([
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LINEBELOW', (0, 0), (-1, -2), 0.5, BORDER_LIGHT),
        ]))
        summary_wrapper.setStyle(TableStyle([
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        elements.append(summary_wrapper)
        elements.append(Spacer(1, 0.18 * inch))

        # Prominent "Amount Payable" banner
        payable_data = [[
            Paragraph("AMOUNT PAYABLE TO RESTAURANT", payable_label_style),
            Paragraph(inr_format(settlement.payable_amount), payable_value_style),
        ]]
        payable_table = Table(payable_data, colWidths=[avail_width * 0.55, avail_width * 0.45])
        payable_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), BRAND_COLOR),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (0, 0), 14),
            ('RIGHTPADDING', (1, 0), (1, 0), 14),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ]))
        elements.append(payable_table)
        elements.append(Spacer(1, 0.45 * inch))

        # =====================================================
        # FOOTER NOTES
        # =====================================================
        elements.append(HRFlowable(width="100%", thickness=0.75, color=BORDER_LIGHT, spaceAfter=10))
        elements.append(Paragraph(
            "This is a system-generated invoice and does not require a signature.", footer_style
        ))
        elements.append(Paragraph(
            "Payment terms: Net 7 days from payout date. "
            "For queries, contact <b>contact@eatoor.com</b>", footer_style
        ))

        # --- Build the PDF with page-numbered footer on every page ---
        doc.build(elements, onFirstPage=_add_page_number, onLaterPages=_add_page_number)
        pdf_content = buffer.getvalue()
        buffer.close()

        # --- Upload PDF directly to S3 ---
        s3 = get_s3_client()
        bucket = settings.AWS_STORAGE_BUCKET_NAME
        file_key = f"settlements/invoices/settlement_{settlement.settlement_number}.pdf"

        s3.upload_fileobj(
            Fileobj=ContentFile(pdf_content),
            Bucket=bucket,
            Key=file_key,
            ExtraArgs={"ContentType": "application/pdf"}
        )

        settlement.settlement_file.name = file_key
        settlement.save(update_fields=['settlement_file'])

        logger.info(
            "Invoice PDF uploaded to S3 at %s for settlement %s",
            file_key, settlement.settlement_number
        )
        return settlement