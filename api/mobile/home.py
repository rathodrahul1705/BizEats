from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

class HomeKitchenList(APIView):
    """
    Return home screen data: Featured Kitchens, Kitchen List, Category List, and Offer List.
    """

    def get(self, request, *args, **kwargs):
        response_data = {
            "success": True,
            "data": {
                "CategoryList": [
                    {
                        "id": 2,
                        "name": "Biryani",
                        "icon": "https://www.eatoor.com/static/media/home_page_chicken_biryani.0503389071788d69602d.avif"
                    },
                    {
                        "id": 3,
                        "name": "Snacks",
                        "icon": "https://www.eatoor.com/static/media/home_page_poha.7469656b09ad11462b68.png"
                    },
                    {
                        "id": 4,
                        "name": "Desserts",
                        "icon": "https://www.eatoor.com/static/media/home_page_gulab_jamun.c6ff9289e79d7fae82ba.jpg"
                    },
                    {
                        "id": 5,
                        "name": "Beverages",
                        "icon": "https://www.eatoor.com/static/media/homa_page_kokam_sarbat.f184224b0255bb0439ed.jpg"
                    },
                    {
                        "id": 6,
                        "name": "Rolls",
                        "icon": "https://www.eatoor.com/static/media/home_page_egg_roll.72953cc48da1b0705a3e.avif"
                    },
                    {
                        "id": 7,
                        "name": "Fast Food",
                        "icon": "https://www.eatoor.com/static/media/home_page_maggie.af48fa7b0186c85461f6.webp"
                    }
                ],
                "FeatureKitchenList": [
                    {
                        "restaurant_id": "AJA10010550",
                        "restaurant_name": "Kokan Foods",
                        "restaurant_slug": "kokan-foods-kalwa-parsik-thane",
                        "restaurant_image": "http://localhost:8000/media/restaurant_profile_images/chicken_handi.png",
                        "restaurant_location": "Kalwa Parsik, Thane",
                        "item_cuisines": "Italian, Chinese",
                        "avg_price_range": 384,
                        "restaurant_city": "thane",
                        "restaurant_status": 2
                    },
                    {
                        "restaurant_id": "HTF33671102",
                        "restaurant_name": "Ajay Foods",
                        "restaurant_slug": "ajay-foods-manorama-nagar-thane",
                        "restaurant_image": "http://localhost:8000/media/restaurant_profile_images/08j_fm2017_947enginefinal_live.jpg",
                        "restaurant_location": "Manorama Nagar, Thane",
                        "item_cuisines": "Italian",
                        "avg_price_range": 100,
                        "restaurant_city": "thane",
                        "restaurant_status": 2
                    },
                    {
                        "restaurant_id": "TES61645880",
                        "restaurant_name": "Priya Kitchen",
                        "restaurant_slug": "priya-kitchen-kawa-thane",
                        "restaurant_image": None,
                        "restaurant_location": "Kawa, Thane",
                        "item_cuisines": "",
                        "avg_price_range": 20,
                        "restaurant_city": "thane",
                        "restaurant_status": 2
                    },
                    {
                        "restaurant_id": "DEB24994922",
                        "restaurant_name": "deb",
                        "restaurant_slug": "deb-kalwa-thane",
                        "restaurant_image": None,
                        "restaurant_location": "kalwa, thane",
                        "item_cuisines": "Italian, Chinese",
                        "avg_price_range": 0,
                        "restaurant_city": "thane",
                        "restaurant_status": 2
                    },
                    {
                        "restaurant_id": "MUM20545193",
                        "restaurant_name": "Mummy kitchen",
                        "restaurant_slug": "mummy-kitchen-kalwa-thane",
                        "restaurant_image": None,
                        "restaurant_location": "kalwa, Thane",
                        "item_cuisines": "",
                        "avg_price_range": 0,
                        "restaurant_city": "thane",
                        "restaurant_status": 2
                    },
                    {
                        "restaurant_id": "NEW17720132",
                        "restaurant_name": "new",
                        "restaurant_slug": "new-kalwa-thane",
                        "restaurant_image": None,
                        "restaurant_location": "kalwa, thane",
                        "item_cuisines": "Italian, Chinese",
                        "avg_price_range": 0,
                        "restaurant_city": "thane",
                        "restaurant_status": 2
                    },
                    {
                        "restaurant_id": "PAP25633416",
                        "restaurant_name": "Pappa kitchen",
                        "restaurant_slug": "pappa-kitchen-kalwa-thane",
                        "restaurant_image": None,
                        "restaurant_location": "kalwa, Thane",
                        "item_cuisines": "",
                        "avg_price_range": 0,
                        "restaurant_city": "thane",
                        "restaurant_status": 2
                    },
                    {
                        "restaurant_id": "TES15333787",
                        "restaurant_name": "test",
                        "restaurant_slug": "test-kalwa-thane",
                        "restaurant_image": "http://localhost:8000/media/restaurant_profile_images/eatoor_mobile.png",
                        "restaurant_location": "kalwa, thane",
                        "item_cuisines": "Italian, Chinese",
                        "avg_price_range": 0,
                        "restaurant_city": "thane",
                        "restaurant_status": 2
                    }
                ],
                "KitchenList": [
                    {
                        "restaurant_id": "AJA10010550",
                        "restaurant_name": "Kokan Foods",
                        "restaurant_slug": "kokan-foods-kalwa-parsik-thane",
                        "restaurant_image": "http://localhost:8000/media/restaurant_profile_images/chicken_handi.png",
                        "restaurant_location": "Kalwa Parsik, Thane",
                        "item_cuisines": "Italian, Chinese",
                        "avg_price_range": 384,
                        "restaurant_city": "thane",
                        "restaurant_status": 2
                    },
                    {
                        "restaurant_id": "DEB24994922",
                        "restaurant_name": "deb",
                        "restaurant_slug": "deb-kalwa-thane",
                        "restaurant_image": None,
                        "restaurant_location": "kalwa, thane",
                        "item_cuisines": "Italian, Chinese",
                        "avg_price_range": 0,
                        "restaurant_city": "thane",
                        "restaurant_status": 2
                    },
                    {
                        "restaurant_id": "HTF33671102",
                        "restaurant_name": "Ajay Foods",
                        "restaurant_slug": "ajay-foods-manorama-nagar-thane",
                        "restaurant_image": "http://localhost:8000/media/restaurant_profile_images/08j_fm2017_947enginefinal_live.jpg",
                        "restaurant_location": "Manorama Nagar, Thane",
                        "item_cuisines": "Italian",
                        "avg_price_range": 100,
                        "restaurant_city": "thane",
                        "restaurant_status": 2
                    },
                    {
                        "restaurant_id": "MUM20545193",
                        "restaurant_name": "Mummy kitchen",
                        "restaurant_slug": "mummy-kitchen-kalwa-thane",
                        "restaurant_image": None,
                        "restaurant_location": "kalwa, Thane",
                        "item_cuisines": "",
                        "avg_price_range": 0,
                        "restaurant_city": "thane",
                        "restaurant_status": 2
                    },
                    {
                        "restaurant_id": "NEW17720132",
                        "restaurant_name": "new",
                        "restaurant_slug": "new-kalwa-thane",
                        "restaurant_image": None,
                        "restaurant_location": "kalwa, thane",
                        "item_cuisines": "Italian, Chinese",
                        "avg_price_range": 0,
                        "restaurant_city": "thane",
                        "restaurant_status": 2
                    },
                    {
                        "restaurant_id": "PAP25633416",
                        "restaurant_name": "Pappa kitchen",
                        "restaurant_slug": "pappa-kitchen-kalwa-thane",
                        "restaurant_image": None,
                        "restaurant_location": "kalwa, Thane",
                        "item_cuisines": "",
                        "avg_price_range": 0,
                        "restaurant_city": "thane",
                        "restaurant_status": 2
                    },
                    {
                        "restaurant_id": "TES15333787",
                        "restaurant_name": "test",
                        "restaurant_slug": "test-kalwa-thane",
                        "restaurant_image": "http://localhost:8000/media/restaurant_profile_images/eatoor_mobile.png",
                        "restaurant_location": "kalwa, thane",
                        "item_cuisines": "Italian, Chinese",
                        "avg_price_range": 0,
                        "restaurant_city": "thane",
                        "restaurant_status": 2
                    },
                    {
                        "restaurant_id": "TES61645880",
                        "restaurant_name": "Priya Kitchen",
                        "restaurant_slug": "priya-kitchen-kawa-thane",
                        "restaurant_image": None,
                        "restaurant_location": "Kawa, Thane",
                        "item_cuisines": "",
                        "avg_price_range": 20,
                        "restaurant_city": "thane",
                        "restaurant_status": 2
                    }
                ]
            }
        }

        return Response(response_data, status=status.HTTP_200_OK)