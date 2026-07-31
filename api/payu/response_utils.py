# utils/response_utils.py
from rest_framework.response import Response
from typing import Any, Dict, Optional, Union
import logging

logger = logging.getLogger(__name__)


class APIResponse:
    """
    Standardized API Response Handler
    """
    
    @staticmethod
    def success(
        data: Optional[Dict[str, Any]] = None,
        message: str = "Success",
        status_code: int = 200,
        extra: Optional[Dict[str, Any]] = None
    ) -> Response:
        """
        Success response with standard format
        """
        response_data = {
            "success": True,
            "status": "success",
            "message": message,
            "data": data or {},
            "timestamp": "2026-07-23T00:00:00Z"  # You can add actual timestamp here
        }
        
        if extra:
            response_data.update(extra)
            
        return Response(response_data, status=status_code)
    
    @staticmethod
    def error(
        message: str = "Error occurred",
        error_code: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None,
        status_code: int = 400,
        extra: Optional[Dict[str, Any]] = None
    ) -> Response:
        """
        Error response with standard format
        """
        response_data = {
            "success": False,
            "status": "error",
            "message": message,
            "data": data or {},
            "timestamp": "2026-07-23T00:00:00Z"  # You can add actual timestamp here
        }
        
        if error_code:
            response_data["error_code"] = error_code
            
        if extra:
            response_data.update(extra)
            
        return Response(response_data, status=status_code)
    
    @staticmethod
    def pending(
        message: str = "Request is being processed",
        data: Optional[Dict[str, Any]] = None,
        status_code: int = 202,
        extra: Optional[Dict[str, Any]] = None
    ) -> Response:
        """
        Pending response with standard format
        """
        response_data = {
            "success": True,
            "status": "pending",
            "message": message,
            "data": data or {},
            "timestamp": "2026-07-23T00:00:00Z"
        }
        
        if extra:
            response_data.update(extra)
            
        return Response(response_data, status=status_code)
    
    @staticmethod
    def validation_error(
        message: str = "Validation failed",
        errors: Optional[Dict[str, Any]] = None,
        status_code: int = 400
    ) -> Response:
        """
        Validation error response with standard format
        """
        return Response({
            "success": False,
            "status": "validation_error",
            "message": message,
            "errors": errors or {},
            "timestamp": "2026-07-23T00:00:00Z"
        }, status=status_code)

