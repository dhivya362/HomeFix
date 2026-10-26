
from django.contrib.auth import authenticate
from django.contrib.auth.models import User

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token

from .models import CustomerProfile
from .serializers import RegisterSerializer


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)

    if serializer.is_valid():
        user = serializer.save()

        return Response(
            {
                "message": "Registration successful!",
                "user": {
                    "id": user.id,
                    "name": user.first_name or user.username,
                    "email": user.email,
                },
            },
            status=status.HTTP_201_CREATED,
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    email = request.data.get("email", "").strip().lower()
    password = request.data.get("password", "")

    if not email or not password:
        return Response(
            {"error": "Email and password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    users = User.objects.filter(
        email__iexact=email,
        is_active=True,
    )

    if not users.exists():
        return Response(
            {"error": "Invalid email or password."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    matched_user = None

    for user_obj in users:
        authenticated_user = authenticate(
            request,
            username=user_obj.username,
            password=password,
        )

        if authenticated_user is not None:
            matched_user = authenticated_user
            break

    if matched_user is None:
        return Response(
            {"error": "Invalid email or password."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    token, created = Token.objects.get_or_create(
        user=matched_user
    )

    return Response(
        {
            "message": "Login successful!",
            "token": token.key,
            "user": {
                "id": matched_user.id,
                "name": (
                    matched_user.first_name
                    or matched_user.username
                ),
                "email": matched_user.email,
            },
        },
        status=status.HTTP_200_OK,
    )


# Get and update the logged-in customer's profile.
@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def customer_profile(request):
    profile, created = CustomerProfile.objects.get_or_create(
        user=request.user
    )

    if request.method == "GET":
        return Response(
            {
                "username": request.user.username,
                "email": request.user.email,
                "first_name": request.user.first_name,
                "last_name": request.user.last_name,
                "phone": profile.phone,
                "address": profile.address,
            },
            status=status.HTTP_200_OK,
        )

    phone = request.data.get("phone", profile.phone)
    address = request.data.get("address", profile.address)
    first_name = request.data.get(
        "first_name", request.user.first_name
    )
    last_name = request.data.get(
        "last_name", request.user.last_name
    )

    if not isinstance(phone, str) or len(phone) > 15:
        return Response(
            {
                "error": (
                    "Phone number must be 15 characters or fewer."
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not isinstance(address, str):
        return Response(
            {"error": "Address must be text."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not isinstance(first_name, str) or not isinstance(
        last_name, str
    ):
        return Response(
            {"error": "Name must be text."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    profile.phone = phone.strip()
    profile.address = address.strip()
    profile.save()

    request.user.first_name = first_name.strip()
    request.user.last_name = last_name.strip()
    request.user.save(
        update_fields=["first_name", "last_name"]
    )

    return Response(
        {
            "message": "Profile updated successfully.",
            "username": request.user.username,
            "email": request.user.email,
            "first_name": request.user.first_name,
            "last_name": request.user.last_name,
            "phone": profile.phone,
            "address": profile.address,
        },
        status=status.HTTP_200_OK,
    )
