# api/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

@api_view(['GET'])
@permission_classes([AllowAny])
def get_eatmart_home_data(request):
    """
    API endpoint to fetch Eatmart home data
    Returns dummy data for testing
    """
    # Your exact dummy response
    dummy_data = {
        "success": True,
        "data": {
            "CategoryList": [
            { "id": 1, "name": "Eggs", "icon": "🥚", "icon_type": "emoji", "item_count": 1, "is_active": True, "sort_order": 1 },
            { "id": 2, "name": "Spices", "icon": "🌶️", "icon_type": "emoji", "item_count": 3, "is_active": True, "sort_order": 2 },
            { "id": 3, "name": "Pulses", "icon": "🌾", "icon_type": "emoji", "item_count": 2, "is_active": True, "sort_order": 3 },
            { "id": 4, "name": "Rice", "icon": "🍚", "icon_type": "emoji", "item_count": 0, "is_active": True, "sort_order": 4 },
            { "id": 5, "name": "Oil", "icon": "🛢️", "icon_type": "emoji", "item_count": 0, "is_active": True, "sort_order": 5 },
            { "id": 6, "name": "Atta", "icon": "🌾", "icon_type": "emoji", "item_count": 0, "is_active": True, "sort_order": 6 },
            { "id": 7, "name": "Snacks", "icon": "🍪", "icon_type": "emoji", "item_count": 0, "is_active": True, "sort_order": 7 },
            { "id": 8, "name": "Dairy", "icon": "🥛", "icon_type": "emoji", "item_count": 0, "is_active": True, "sort_order": 8 },
            { "id": 9, "name": "Pickles", "icon": "🥒", "icon_type": "emoji", "item_count": 0, "is_active": True, "sort_order": 9 },
            { "id": 10, "name": "Beverages", "icon": "🥤", "icon_type": "emoji", "item_count": 0, "is_active": True, "sort_order": 10 },
            { "id": 11, "name": "Biscuits", "icon": "🍪", "icon_type": "emoji", "item_count": 0, "is_active": True, "sort_order": 11 },
            { "id": 12, "name": "Noodles", "icon": "🍜", "icon_type": "emoji", "item_count": 0, "is_active": True, "sort_order": 12 },
            { "id": 13, "name": "Dryfruits", "icon": "🥜", "icon_type": "emoji", "item_count": 0, "is_active": True, "sort_order": 13 }
            ],

            "banner_images": [
            {
                "id": "banner1",
                "name": "Daily Grocery Deals",
                "icon": "https://eatoorprod.s3.eu-north-1.amazonaws.com/uploads/solapur_peenut_chutney.jpeg",
                "document_type": 1,
                "thumbnail": "https://eatoorprod.s3.eu-north-1.amazonaws.com/uploads/solapur_peenut_chutney.jpeg"
            },
            {
                "id": "banner2",
                "name": "Spices & Masala Offers",
                "icon": "https://eatoorprod.s3.eu-north-1.amazonaws.com/uploads/red_chilli_powder.webp",
                "document_type": 1,
                "thumbnail": "https://eatoorprod.s3.eu-north-1.amazonaws.com/uploads/red_chilli_powder.webp"
            },
            {
                "id": "banner3",
                "name": "Healthy Pulses & Grains",
                "icon": "https://eatoorprod.s3.eu-north-1.amazonaws.com/uploads/toor_dal.webp",
                "document_type": 1,
                "thumbnail": "https://eatoorprod.s3.eu-north-1.amazonaws.com/uploads/toor_dal.webp"
            }
            ],

            "FeaturedItemsList": [
            {
                "item_id": "item1",
                "item_name": "Fresh Eggs",
                "item_image": "https://eatoorprod.s3.eu-north-1.amazonaws.com/uploads/egg_12_pc.jpg",
                "category_id": 1,
                "category_name": "Dairy & Eggs",
                "price": "100",
                "discount_price": "90",
                "unit": "12 pcs",
                "in_stock": True,
                "rating": 4.4,
                "reviews": 210,
                "mrp": "110",
                "discount_percentage": 18
            },
            {
                "item_id": "item2",
                "item_name": "Peanut Chutney",
                "item_image": "https://eatoorprod.s3.eu-north-1.amazonaws.com/uploads/solapur_peenut_chutney.jpeg",
                "category_id": 2,
                "category_name": "Spices",
                "price": "30",
                "discount_price": "25",
                "unit": "100g",
                "in_stock": True,
                "rating": 4.2,
                "reviews": 95,
                "mrp": "35",
                "discount_percentage": 15
            },
            {
                "item_id": "item3",
                "item_name": "Red Chilli Powder",
                "item_image": "https://eatoorprod.s3.eu-north-1.amazonaws.com/uploads/red_chilli_powder.webp",
                "category_id": 2,
                "category_name": "Spices",
                "price": "40",
                "discount_price": "30",
                "unit": "100g",
                "in_stock": True,
                "rating": 4.5,
                "reviews": 140,
                "mrp": "45",
                "discount_percentage": 25
            },
            {
                "item_id": "item4",
                "item_name": "Black Chilli Powder",
                "item_image": "https://eatoorprod.s3.eu-north-1.amazonaws.com/uploads/black_chili_powder.webp",
                "category_id": 2,
                "category_name": "Spices",
                "price": "45",
                "discount_price": "35",
                "unit": "100g",
                "in_stock": True,
                "rating": 4.3,
                "reviews": 120,
                "mrp": "50",
                "discount_percentage": 22
            },
            {
                "item_id": "item5",
                "item_name": "Premium Toor Dal",
                "item_image": "https://eatoorprod.s3.eu-north-1.amazonaws.com/uploads/toor_dal.webp",
                "category_id": 3,
                "category_name": "Pulses & Grains",
                "price": "95",
                "discount_price": "80",
                "unit": "1 kg",
                "in_stock": True,
                "rating": 4.6,
                "reviews": 310,
                "mrp": "110",
                "discount_percentage": 27
            },
            {
                "item_id": "item6",
                "item_name": "Organic Jowar",
                "item_image": "https://eatoorprod.s3.eu-north-1.amazonaws.com/uploads/jower.png",
                "category_id": 3,
                "category_name": "Pulses & Grains",
                "price": "40",
                "discount_price": "30",
                "unit": "1 kg",
                "in_stock": True,
                "rating": 4.1,
                "reviews": 85,
                "mrp": "50",
                "discount_percentage": 20
            }
            ]
        },
        "message": "Data fetched successfully"
        }

    
    return Response(dummy_data, status=status.HTTP_200_OK)