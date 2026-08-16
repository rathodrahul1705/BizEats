from datetime import datetime, timedelta

def apply_offer_logic(queryset, offer_type):

    if offer_type == "BOGO":
        return queryset.filter(buy_one_get_one_free=True)

    elif offer_type == "DISCOUNT":
        return queryset.filter(discount_percent__gt=0)

    elif offer_type == "MIN_ORDER_VALUE":
        return queryset.filter(item_price__gte=200)

    elif offer_type == "FREE_DELIVERY":
        return queryset.filter(free_delivery=True)

    elif offer_type == "TRENDING":
        return queryset.order_by('-created_at')

    elif offer_type == "NEW":
        return queryset.order_by('-created_at')

    elif offer_type == "ALL_OFFER":
        return queryset.order_by('-created_at')
    
    return queryset

def is_banner_valid(banner):
    """Check if banner is active and within validity"""
    if not banner.get("is_active"):
        return False

    try:
        now = datetime.now()
        valid_from = datetime.fromisoformat(banner["validity"]["from"])
        valid_till = datetime.fromisoformat(banner["validity"]["till"])

        return valid_from <= now <= valid_till
    except Exception:
        return False
    
def get_dummy_banners():
    """Static banner data (can be moved to DB later)"""
    return [
        {
            "id": 7,
            "title": "Buy 1 Get 1 FREE",
            "subtitle": "Double the cravings. Double the happiness! 😍",
            "image_url": "https://eatoorprod.s3.eu-north-1.amazonaws.com/uploads/b1g1_cake.jpg",
            "theme": {
                "bg_color": "#E65C00",
                "text_color": "#FFFFFF",
                "icon_color": "#FFFFFF",
                "accent_color": "#FFD166",
                "secondary_color": "#3D1A00",
                "gradient_colors": [
                    "#E65C00",
                    "#FF814E"
                ],
                "gradient_direction": "horizontal"
            },
            "event": {
                "enabled": False,
                "type": "regular",
                "name": "Regular Offer",
                "short_name": "Special Offer",
                "icon": "🔥",
                "year": 2026,
                "theme": "default"
            },
            "offer": {
                "type": "bogo_offer",
                "banner_type": "special",
                "category": "BOGO",
                "discount": "Buy 1 Get 1",
                "code": "BOGOFREE",
                "api_params": {
                    "offer_type": "BOGO",
                    "sort_by": "item_price"
                }
            },
            "validity": {
                "from": "2026-08-16T00:00:00",
                "till": "2026-09-16T00:00:00"
            },
            "terms": [
                "Applicable on selected items only",
                "Buy 1 and Get 1 FREE",
                "Terms and conditions apply"
            ],
            "order": 3,
            "is_active": True
        }
    ]

def get_active_banners():
    """Return only active + valid banners"""

    banners = get_dummy_banners()
    active_banners = [b for b in banners if is_banner_valid(b)]

    # sort by order
    active_banners.sort(key=lambda x: x.get("order", 0))

    return active_banners