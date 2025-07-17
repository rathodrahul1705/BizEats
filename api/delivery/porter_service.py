# utils/porter_service.py
import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

HEADERS = {
    "x-api-key": f"{settings.PORTER_API_KEY}",
    "Content-Type": "application/json"
}

def get_serviceable_locations():
    url = f"{settings.PORTER_BASE_URL}/v1/locations"
    try:
        response = requests.get(url, headers=HEADERS, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching serviceable locations: {e}")
        return {"error": "Unable to fetch locations."}

def get_fare_estimate(payload):
    url = f"{settings.PORTER_BASE_URL}/v1/get_quote"
    try:
        response = requests.post(url, json=payload, headers=HEADERS, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching fare estimate: {e}")
        return {"error": "Unable to fetch fare estimate."}

def create_booking(payload):
    url = f"{settings.PORTER_BASE_URL}/v1/orders/create"

    try:
        response = requests.post(url, json=payload, headers=HEADERS, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Error creating booking: {e}")
        return {"error": "Unable to create booking."}

def track_booking(booking_id):
    url = f"{settings.PORTER_BASE_URL}/v1.1/orders/{booking_id}"
    try:
        response = requests.get(url, headers=HEADERS, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Error tracking booking {booking_id}: {e}")
        return {"error": "Unable to track booking."}

def cancel_booking(booking_id):
    url = f"{settings.PORTER_BASE_URL}/v1/orders/{booking_id}/cancel"
    try:
        response = requests.post(url, headers=HEADERS, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Error cancelling booking {booking_id}: {e}")
        return {"error": "Unable to cancel booking."}
