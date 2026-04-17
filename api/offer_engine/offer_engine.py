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
            "id": 1,
            "title": "Biryani",
            "subtitle": "Hot & spicy biryanis up to 30% OFF",
            "image_url": "https://eatoorprod.s3.amazonaws.com/menu_images/5df3397c503b4ad09da617107984f682.jpg",
            "theme": {
                "bg_color": "#FF6B4A",
                "text_color": "#FFFFFF",
                "icon_color": "#FFFFFF"
            },
            "offer": {
                "type": "food_offer",
                "banner_type": "cuisine",
                "category": "Biryani",
                "discount": "30% OFF",
                "code": "BIRYANI30",
                "api_params": {
                    "category": "Rice & Biryani",
                    "food_type": "Non-Veg",
                    "offer_type": "DISCOUNT",
                    "min_price": "200",
                    "sort_by": "-discount_percent"
                }
            },
            "validity": {
                "from": (datetime.now() - timedelta(days=2)).isoformat(),
                "till": (datetime.now() + timedelta(days=15)).isoformat()
            },
            "terms": [
                "Minimum order ₹299",
                "Maximum discount ₹150"
            ],
            "order": 1,
            "is_active": True
        },

        {
            "id": 2,
            "title": "Waffle",
            "subtitle": "Sweet cravings? Get waffles up to 40% OFF",
            "image_url": "https://eatoorprod.s3.amazonaws.com/menu_images/c84196f9a7cd4fd7bbc49d375dbdb227.jpg",
            "theme": {
                "bg_color": "#FFB800",
                "text_color": "#1E293B",
                "icon_color": "#1E293B"
            },
            "offer": {
                "type": "food_offer",
                "banner_type": "dessert",
                "category": "Waffle",
                "discount": "40% OFF",
                "code": "WAFFLE40",
                "api_params": {
                    "category": "Dessert",
                    "food_type": "Veg",
                    "offer_type": "DISCOUNT",
                    "max_price": "300",
                    "sort_by": "-discount_percent"
                }
            },
            "validity": {
                "from": (datetime.now() - timedelta(days=1)).isoformat(),
                "till": (datetime.now() + timedelta(days=20)).isoformat()
            },
            "terms": [
                "Minimum order ₹199",
                "Maximum discount ₹120"
            ],
            "order": 2,
            "is_active": True
        },

        {
            "id": 3,
            "title": "Buy 1 Get 1 Free",
            "subtitle": "Double the food, same price 😍",
            "image_url": "https://eatoorprod.s3.eu-north-1.amazonaws.com/uploads/buy_one_get_one_free.avif",
            "theme": {
                "bg_color": "#00C853",
                "text_color": "#FFFFFF",
                "icon_color": "#FFFFFF"
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
                "from": (datetime.now() - timedelta(days=1)).isoformat(),
                "till": (datetime.now() + timedelta(days=10)).isoformat()
            },
            "terms": [
                "Applicable on selected items only"
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