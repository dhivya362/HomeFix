
from django.contrib.auth.models import User
from django.db import transaction, IntegrityError

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status

from .models import Technician
from .serializers import TechnicianSerializer


@api_view(["GET", "POST"])
@permission_classes([IsAdminUser])
def technician_list(request):

    if request.method == "GET":
        technicians = Technician.objects.select_related("user").all()
        serializer = TechnicianSerializer(technicians, many=True)
        return Response(serializer.data)

    full_name = request.data.get("full_name", "").strip()
    email = request.data.get("email", "").strip().lower()
    phone = request.data.get("phone", "").strip()
    specialization = request.data.get("specialization", "").strip()
    password = request.data.get("password", "")

    if not all([full_name, email, phone, specialization, password]):
        return Response(
            {"error": "All fields are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if len(password) < 8:
        return Response(
            {"error": "Password must contain at least 8 characters."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if len(phone) != 10 or not phone.isdigit():
        return Response(
            {"error": "Enter a valid 10-digit phone number."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if User.objects.filter(username__iexact=email).exists():
        return Response(
            {"error": "An account with this email already exists."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if User.objects.filter(email__iexact=email).exists():
        return Response(
            {"error": "This email is already registered."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        with transaction.atomic():
            user = User.objects.create_user(
                username=email,
                email=email,
                password=password,
                first_name=full_name,
            )

            technician = Technician.objects.create(
                user=user,
                phone=phone,
                specialization=specialization,
                is_available=True,
            )

    except IntegrityError:
        return Response(
            {"error": "Unable to create technician. Check the submitted details."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = TechnicianSerializer(technician)

    return Response(
        {
            "message": "Technician created successfully.",
            "technician": serializer.data,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["PATCH"])
@permission_classes([IsAdminUser])
def update_technician_availability(request, technician_id):

    try:
        technician = Technician.objects.get(id=technician_id)
    except Technician.DoesNotExist:
        return Response(
            {"error": "Technician not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    is_available = request.data.get("is_available")

    if not isinstance(is_available, bool):
        return Response(
            {"error": "is_available must be true or false."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    technician.is_available = is_available
    technician.save(update_fields=["is_available"])

    serializer = TechnicianSerializer(technician)

    return Response(
        {
            "message": "Technician availability updated successfully.",
            "technician": serializer.data,
        },
        status=status.HTTP_200_OK,
    )
