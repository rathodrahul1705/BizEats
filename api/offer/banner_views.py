from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime, timedelta

# ------------------ DUMMY DATA ------------------ #

DUMMY_BANNERS = [
    # {
    #     "id": 1,
    #     "title": "Biryani",
    #     "subtitle": "Hot & spicy biryanis up to 30% OFF",
    #     "image_url": "https://eatoorprod.s3.amazonaws.com/menu_images/5df3397c503b4ad09da617107984f682.jpg",

    #     "theme": {
    #         "bg_color": "#FF6B4A",
    #         "text_color": "#FFFFFF",
    #         "icon_color": "#FFFFFF"
    #     },

    #     "offer": {
    #         "type": "food_offer",
    #         "banner_type": "cuisine",
    #         "category": "Biryani",
    #         "discount": "30% OFF",
    #         "code": "BIRYANI30",

    #         "api_params": {
    #             "category": "Rice & Biryani",
    #             "food_type": "Non-Veg",
    #             "has_discount": "true",
    #             "min_price": "200",
    #             "sort_by": "discount"
    #         }
    #     },

    #     "validity": {
    #         "from": (datetime.now() - timedelta(days=2)).isoformat(),
    #         "till": (datetime.now() + timedelta(days=15)).isoformat()
    #     },

    #     "terms": [
    #         "Minimum order ₹299",
    #         "Maximum discount ₹150",
    #         "Valid on biryani items only"
    #     ],

    #     "order": 1,
    #     "is_active": True
    # },

    # {
    #     "id": 2,
    #     "title": "Waffle",
    #     "subtitle": "Sweet cravings? Get waffles up to 40% OFF",
    #     "image_url": "https://eatoorprod.s3.amazonaws.com/menu_images/c84196f9a7cd4fd7bbc49d375dbdb227.jpg",

    #     "theme": {
    #         "bg_color": "#FFB800",
    #         "text_color": "#1E293B",
    #         "icon_color": "#1E293B"
    #     },

    #     "offer": {
    #         "type": "food_offer",
    #         "banner_type": "dessert",
    #         "category": "Waffle",
    #         "discount": "40% OFF",
    #         "code": "WAFFLE40",

    #         "api_params": {
    #             "category": "Dessert",
    #             "food_type": "Veg",
    #             "has_discount": "true",
    #             "max_price": "300",
    #             "sort_by": "discount"
    #         }
    #     },

    #     "validity": {
    #         "from": (datetime.now() - timedelta(days=1)).isoformat(),
    #         "till": (datetime.now() + timedelta(days=20)).isoformat()
    #     },

    #     "terms": [
    #         "Minimum order ₹199",
    #         "Maximum discount ₹120",
    #         "Valid on waffles & desserts"
    #     ],

    #     "order": 2,
    #     "is_active": True
    # },

    # 🔥 BOGO BANNER ADDED
    {
        "id": 1,
        "title": "Buy 1 Get 1 Free",
        "subtitle": "Double the food, same price 😍",
        "image_url": "https://images.unsplash.com/photo-1604908176997-4311d99d73c0?w=800",

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

            # ✅ BOGO API PARAMS
            "api_params": {
                "bogo": "true",
                "is_available": "true",
                "sort_by": "price_low_high"
            }
        },

        "validity": {
            "from": (datetime.now() - timedelta(days=1)).isoformat(),
            "till": (datetime.now() + timedelta(days=10)).isoformat()
        },

        "terms": [
            "Applicable on selected items only",
            "Free item will be of equal or lesser value",
            "Offer auto-applied at checkout"
        ],

        "order": 3,
        "is_active": True
    }
]

# In-memory click storage
banner_clicks = []


# ------------------ HELPERS ------------------ #

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


# ------------------ APIs ------------------ #

@api_view(['GET'])
def get_active_banners(request):
    """Get all active and valid banners"""
    try:
        active_banners = [b for b in DUMMY_BANNERS if is_banner_valid(b)]

        # Sort by order
        active_banners.sort(key=lambda x: x.get("order", 0))

        return Response({
            "success": True,
            "message": "Banners fetched successfully",
            "data": active_banners,
            "total": len(active_banners)
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({
            "success": False,
            "message": str(e),
            "data": []
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_banner_by_id(request, banner_id):
    """Get single banner"""
    try:
        banner = next((b for b in DUMMY_BANNERS if b["id"] == banner_id), None)

        if not banner:
            return Response({
                "success": False,
                "message": "Banner not found"
            }, status=status.HTTP_404_NOT_FOUND)

        if not is_banner_valid(banner):
            return Response({
                "success": False,
                "message": "Banner is not active or expired"
            }, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "success": True,
            "message": "Banner fetched successfully",
            "data": banner
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({
            "success": False,
            "message": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def track_banner_click(request):
    """Track banner click"""
    try:
        banner_id = request.data.get("banner_id")
        user_id = request.data.get("user_id")
        session_id = request.data.get("session_id")

        if not banner_id or not session_id:
            return Response({
                "success": False,
                "message": "banner_id and session_id are required"
            }, status=status.HTTP_400_BAD_REQUEST)

        banner = next((b for b in DUMMY_BANNERS if b["id"] == banner_id), None)
        if not banner:
            return Response({
                "success": False,
                "message": "Banner not found"
            }, status=status.HTTP_404_NOT_FOUND)

        # Get IP
        ip_address = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0] \
            or request.META.get('REMOTE_ADDR')

        click_data = {
            "id": len(banner_clicks) + 1,
            "banner_id": banner_id,
            "user_id": user_id,
            "session_id": session_id,
            "clicked_at": datetime.now().isoformat(),
            "ip_address": ip_address
        }

        banner_clicks.append(click_data)

        return Response({
            "success": True,
            "message": "Click tracked successfully",
            "data": click_data
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({
            "success": False,
            "message": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_banner_stats(request):
    """Get banner stats"""
    try:
        stats = {}

        for click in banner_clicks:
            banner_id = click["banner_id"]
            stats[banner_id] = stats.get(banner_id, 0) + 1

        result = []
        for banner_id, count in stats.items():
            banner = next((b for b in DUMMY_BANNERS if b["id"] == banner_id), None)
            if banner:
                result.append({
                    "banner_id": banner_id,
                    "banner_title": banner["title"],
                    "click_count": count
                })

        return Response({
            "success": True,
            "message": "Statistics fetched successfully",
            "data": result,
            "total_clicks": len(banner_clicks)
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({
            "success": False,
            "message": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)