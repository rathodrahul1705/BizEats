# views.py
from django.conf import settings
from django.http import JsonResponse
from .models import CustomImage
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import uuid
import sys
from io import BytesIO
from PIL import Image
from django.core.files.uploadedfile import InMemoryUploadedFile
from api.aws.s3_client import get_s3_client

def optimize_image(image_file, max_size=(1080, 1080), max_kb=30):
    """
    Optimize image to be under max_kb while maintaining aspect ratio.
    """
    img = Image.open(image_file)

    # Convert to RGB if needed
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    # Resize while maintaining aspect ratio
    img.thumbnail(max_size, Image.Resampling.LANCZOS)

    # Iteratively reduce quality until size < max_kb
    quality = 85
    img_io = BytesIO()
    img.save(img_io, format="JPEG", quality=quality, optimize=True)
    
    while img_io.tell() > max_kb * 1024 and quality > 10:
        quality -= 5
        img_io.seek(0)
        img_io.truncate()
        img.save(img_io, format="JPEG", quality=quality, optimize=True)

    img_io.seek(0)
    unique_filename = f"{uuid.uuid4().hex}.jpg"

    return InMemoryUploadedFile(
        img_io,
        "ImageField",
        unique_filename,
        "image/jpeg",
        sys.getsizeof(img_io),
        None
    )
class UploadImageToS3(APIView):

    def post(self, request, *args, **kwargs):
        try:
            if "image" not in request.FILES:
                return JsonResponse({"error": "No image uploaded"}, status=400)

            image = request.FILES["image"]
            title = request.POST.get("title", "Dummy Image")
            type_of_images = request.POST.get("type_of_images")

            # 1️⃣ Optimize
            optimized_file = optimize_image(image)

            # 2️⃣ File path
            file_key = f"uploads/{optimized_file.name}"

            # 3️⃣ Get shared S3 client
            s3 = get_s3_client()

            # 4️⃣ Upload
            s3.upload_fileobj(
                Fileobj=optimized_file.file,
                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                Key=file_key,
                ExtraArgs={
                    "ContentType": "image/jpeg"
                }
            )

            # 6️⃣ Save record
            obj = CustomImage.objects.create(
                title=title,
                type_of_images=type_of_images,
                image=file_key
            )

            return JsonResponse({
                "message": "Upload successful",
                "id": obj.id,
                "title": obj.title,
                "type_of_images": obj.type_of_images,
                "image_url": obj.image.url
            }, status=201)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
        
class ListImagesFromS3(APIView):
    """
    Fetch all uploaded images with their S3 URLs.
    """

    def get(self, request, *args, **kwargs):
        images = CustomImage.objects.all()
        data = [
            {
                "id": img.id,
                "title": img.title,
                "image_url": img.image.url  # S3 URL
            }
            for img in images
        ]
        return Response(data, status=status.HTTP_200_OK)


class GetSingleImageFromS3(APIView):
    """
    Fetch a single image by ID with its S3 URL.
    """

    def get(self, request, pk, *args, **kwargs):
        try:
            img = CustomImage.objects.get(pk=pk)
            return Response({
                "id": img.id,
                "title": img.title,
                "image_url": img.image.url
            }, status=status.HTTP_200_OK)
        except CustomImage.DoesNotExist:
            return Response({"error": "Image not found"}, status=status.HTTP_404_NOT_FOUND)
