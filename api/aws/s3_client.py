import boto3
from django.conf import settings


def get_s3_client():
    """
    Create and return a boto3 S3 client with project settings.
    Reusable across all files.
    """
    return boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME,
    )