
from django.shortcuts import get_object_or_404
from django.db.models import ProtectedError

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework import status

from .models import Service, AdditionalWork
from .serializers import ServiceSerializer


# CUSTOMER API:
# Public users can view available services.
# Admin users can view all services.
@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def service_list(request):

    # GET: List services
    if request.method == "GET":

        if (
            request.user.is_authenticated
            and request.user.is_staff
        ):
            services = Service.objects.all().order_by("id")
        else:
            services = Service.objects.filter(
                is_available=True
            ).order_by("id")

        serializer = ServiceSerializer(
            services,
            many=True
        )

        return Response(serializer.data)

    # POST: Only admin can create a service
    if (
        not request.user.is_authenticated
        or not request.user.is_staff
    ):
        return Response(
            {
                "detail": "Admin permission required to create services."
            },
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = ServiceSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save()

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )


# ADMIN API:
# View, edit, or delete one service.
@api_view(["GET", "PATCH", "PUT", "DELETE"])
@permission_classes([IsAdminUser])
def service_detail(request, pk):

    service = get_object_or_404(
        Service,
        pk=pk
    )

    # GET: View one service
    if request.method == "GET":

        serializer = ServiceSerializer(service)

        return Response(serializer.data)

    # PATCH / PUT: Update service
    if request.method in ["PATCH", "PUT"]:

        serializer = ServiceSerializer(
            service,
            data=request.data,
            partial=(request.method == "PATCH")
        )

        if serializer.is_valid():
            serializer.save()

            return Response(serializer.data)

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    # DELETE: Delete service if no bookings depend on it
    try:
        service.delete()

    except ProtectedError:
        return Response(
            {
                "detail": (
                    "This service has existing bookings. "
                    "Make it unavailable instead of deleting it."
                )
            },
            status=status.HTTP_409_CONFLICT
        )

    return Response(
        status=status.HTTP_204_NO_CONTENT
    )


# ADMIN API:
# Change service availability.
@api_view(["PATCH"])
@permission_classes([IsAdminUser])
def service_availability(request, pk):

    service = get_object_or_404(
        Service,
        pk=pk
    )

    if "is_available" not in request.data:
        return Response(
            {
                "is_available": [
                    "This field is required."
                ]
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    value = request.data["is_available"]

    if not isinstance(value, bool):
        return Response(
            {
                "is_available": [
                    "Enter true or false."
                ]
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    service.is_available = value

    service.save(
        update_fields=["is_available"]
    )

    serializer = ServiceSerializer(service)

    return Response(
        {
            "message": "Service availability updated.",
            "service": serializer.data
        },
        status=status.HTTP_200_OK
    )

# CUSTOMER API: List additional works for a selected service
@api_view(["GET"])
@permission_classes([AllowAny])
def additional_work_list(request):
    service_id = request.query_params.get("service")

    if not service_id:
        return Response(
            {"error": "Service ID is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    works = AdditionalWork.objects.filter(
        service_id=service_id,
        service__is_available=True,
        is_available=True,
    ).order_by("id")

    data = [
        {
            "id": work.id,
            "service": work.service_id,
            "name": work.name,
            "description": work.description,
            "estimated_price": str(work.estimated_price),
            "is_available": work.is_available,
        }
        for work in works
    ]

    return Response(data, status=status.HTTP_200_OK)
