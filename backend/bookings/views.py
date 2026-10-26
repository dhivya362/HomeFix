
from datetime import date

import razorpay
from django.conf import settings

from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404

from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status

from .models import Booking, TechnicianGPSLocation

from .models import Booking, ServiceReview, Notification, Payment
from .serializers import BookingSerializer
from services.models import Service, AdditionalWork
from technicians.models import Technician


INACTIVE_STATUSES = ["Rejected", "Cancelled", "Completed"]


def create_notification(
    user,
    booking,
    title,
    message,
    notification_type="booking_status",
):
    if user:
        Notification.objects.create(
            user=user,
            booking=booking,
            title=title,
            message=message,
            notification_type=notification_type,
        )


# Customer sees their own bookings. Admin sees all bookings.
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def booking_list_create(request):

    if request.method == "GET":
        if request.user.is_staff:
            bookings = Booking.objects.all().order_by("-created_at")
        else:
            bookings = Booking.objects.filter(
                customer=request.user
            ).order_by("-created_at")

        return Response(
            BookingSerializer(
                bookings,
                many=True,
                context={"request": request},
            ).data,
            status=status.HTTP_200_OK,
        )

    if request.user.is_staff:
        return Response(
            {"error": "Admins cannot create customer bookings here."},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        request.user.technician_profile
        return Response(
            {"error": "Technicians cannot create customer bookings."},
            status=status.HTTP_403_FORBIDDEN,
        )
    except Technician.DoesNotExist:
        pass

    serializer = BookingSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    booking_date = serializer.validated_data["booking_date"]
    time_slot = serializer.validated_data["time_slot"]
    service = serializer.validated_data["service"]

    if booking_date < date.today():
        return Response(
            {"error": "You cannot select a past date."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not service.is_available:
        return Response(
            {"error": "This service is currently unavailable."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        with transaction.atomic():
            existing_booking = Booking.objects.filter(
                booking_date=booking_date,
                time_slot=time_slot,
                service=service,
            ).exclude(
                status__in=INACTIVE_STATUSES
            ).exists()

            if existing_booking:
                return Response(
                    {
                        "error": (
                            "This time slot is already booked. "
                            "Please select another time slot."
                        )
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            booking = serializer.save(customer=request.user)

            create_notification(
                user=request.user,
                booking=booking,
                title="Booking Created",
                message=(
                    f"Your booking for {booking.service.name} "
                    f"on {booking.booking_date} was created successfully. "
                    f"Estimated total: ₹{booking.estimated_total}."
                ),
                notification_type="booking_status",
            )

    except IntegrityError:
        return Response(
            {
                "error": (
                    "This time slot is already booked. "
                    "Please select another time slot."
                )
            },
            status=status.HTTP_409_CONFLICT,
        )

    return Response(
        BookingSerializer(
            booking,
            context={"request": request},
        ).data,
        status=status.HTTP_201_CREATED,
    )


# Customer reschedules their own booking.
@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def reschedule_customer_booking(request, booking_id):

    if request.user.is_staff:
        return Response(
            {"error": "Admins cannot reschedule customer bookings here."},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        request.user.technician_profile
        return Response(
            {"error": "Technicians cannot reschedule customer bookings."},
            status=status.HTTP_403_FORBIDDEN,
        )
    except Technician.DoesNotExist:
        pass

    booking = get_object_or_404(
        Booking,
        id=booking_id,
        customer=request.user,
    )

    if booking.status in INACTIVE_STATUSES:
        return Response(
            {"error": "This booking cannot be rescheduled."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    new_date = request.data.get("booking_date")
    new_slot = request.data.get("time_slot")

    if not new_date or not new_slot:
        return Response(
            {"error": "Booking date and time slot are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        parsed_date = date.fromisoformat(str(new_date))
    except (ValueError, TypeError):
        return Response(
            {"error": "Invalid date format. Use YYYY-MM-DD."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if parsed_date < date.today():
        return Response(
            {"error": "You cannot select a past date."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    valid_slots = [slot[0] for slot in Booking.TIME_SLOTS]

    if new_slot not in valid_slots:
        return Response(
            {"error": "Please select a valid time slot."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not booking.service.is_available:
        return Response(
            {"error": "This service is currently unavailable."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        with transaction.atomic():
            booking = Booking.objects.select_for_update().get(
                id=booking_id,
                customer=request.user,
            )

            if booking.status in INACTIVE_STATUSES:
                return Response(
                    {"error": "This booking can no longer be rescheduled."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            conflict = Booking.objects.filter(
                service=booking.service,
                booking_date=parsed_date,
                time_slot=new_slot,
            ).exclude(
                id=booking.id
            ).exclude(
                status__in=INACTIVE_STATUSES
            ).exists()

            if conflict:
                return Response(
                    {
                        "error": (
                            "This time slot is already booked. "
                            "Please choose another slot."
                        )
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            old_date = booking.booking_date
            old_slot = booking.time_slot

            booking.booking_date = parsed_date
            booking.time_slot = new_slot
            booking.save(update_fields=["booking_date", "time_slot"])

            create_notification(
                user=request.user,
                booking=booking,
                title="Booking Rescheduled",
                message=(
                    f"Your {booking.service.name} booking has been "
                    f"rescheduled from {old_date} ({old_slot}) to "
                    f"{parsed_date} ({new_slot})."
                ),
                notification_type="booking_status",
            )

            if booking.assigned_technician:
                create_notification(
                    user=booking.assigned_technician.user,
                    booking=booking,
                    title="Booking Rescheduled",
                    message=(
                        f"Booking #{booking.id} for {booking.service.name} "
                        f"has been rescheduled to {parsed_date} ({new_slot})."
                    ),
                    notification_type="technician_assigned",
                )

    except Booking.DoesNotExist:
        return Response(
            {"error": "Booking not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    except IntegrityError:
        return Response(
            {
                "error": (
                    "This time slot is already booked. "
                    "Please choose another slot."
                )
            },
            status=status.HTTP_409_CONFLICT,
        )

    return Response(
        {
            "message": "Booking rescheduled successfully.",
            "booking": BookingSerializer(
                booking,
                context={"request": request},
            ).data,
        },
        status=status.HTTP_200_OK,
    )


# Customer cancels their own booking.
@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def cancel_customer_booking(request, booking_id):

    if request.user.is_staff:
        return Response(
            {"error": "This endpoint is for customers only."},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        request.user.technician_profile
        return Response(
            {"error": "Technicians cannot cancel customer bookings."},
            status=status.HTTP_403_FORBIDDEN,
        )
    except Technician.DoesNotExist:
        pass

    booking = get_object_or_404(
        Booking,
        id=booking_id,
        customer=request.user,
    )

    if booking.status in INACTIVE_STATUSES:
        return Response(
            {
                "error": (
                    f"A {booking.status.lower()} booking "
                    "cannot be cancelled again."
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    booking.status = "Cancelled"
    booking.save(update_fields=["status"])

    create_notification(
        user=request.user,
        booking=booking,
        title="Booking Cancelled",
        message=f"Your booking for {booking.service.name} was cancelled.",
        notification_type="booking_status",
    )

    if booking.assigned_technician:
        create_notification(
            user=booking.assigned_technician.user,
            booking=booking,
            title="Booking Cancelled",
            message=f"Booking #{booking.id} has been cancelled by the customer.",
            notification_type="technician_assigned",
        )

    return Response(
        {
            "message": "Booking cancelled successfully.",
            "booking": BookingSerializer(
                booking,
                context={"request": request},
            ).data,
        },
        status=status.HTTP_200_OK,
    )


# Admin updates booking status.
@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_booking_status(request, booking_id):

    if not request.user.is_staff:
        return Response(
            {"error": "Only admin users can update booking status."},
            status=status.HTTP_403_FORBIDDEN,
        )

    booking = get_object_or_404(Booking, id=booking_id)
    new_status = request.data.get("status")

    allowed_statuses = [
        "Accepted",
        "Rejected",
        "Completed",
        "Cancelled",
    ]

    if new_status not in allowed_statuses:
        return Response(
            {
                "error": "Invalid status.",
                "allowed_statuses": allowed_statuses,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if booking.status in INACTIVE_STATUSES:
        return Response(
            {"error": "This booking can no longer be updated."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    booking.status = new_status
    booking.save(update_fields=["status"])

    if booking.customer:
        create_notification(
            user=booking.customer,
            booking=booking,
            title=f"Booking {new_status}",
            message=(
                f"Your booking for {booking.service.name} "
                f"has been {new_status.lower()}."
            ),
            notification_type="booking_status",
        )

    if new_status == "Completed" and booking.assigned_technician:
        create_notification(
            user=booking.assigned_technician.user,
            booking=booking,
            title="Service Completed",
            message=f"The service for booking #{booking.id} is completed.",
            notification_type="service_completed",
        )

    return Response(
        {
            "message": "Booking status updated successfully.",
            "booking": BookingSerializer(
                booking,
                context={"request": request},
            ).data,
        },
        status=status.HTTP_200_OK,
    )


# Admin assigns a technician and prevents conflicting assignments.
@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def assign_technician(request, booking_id):

    if not request.user.is_staff:
        return Response(
            {"error": "Only admin users can assign technicians."},
            status=status.HTTP_403_FORBIDDEN,
        )

    technician_id = request.data.get("assigned_technician")

    if not technician_id:
        return Response(
            {"error": "Please provide a technician ID."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        with transaction.atomic():
            try:
                booking = Booking.objects.select_for_update().get(
                    id=booking_id
                )
            except Booking.DoesNotExist:
                return Response(
                    {"error": "Booking not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            try:
                technician = Technician.objects.select_for_update().get(
                    id=technician_id
                )
            except (Technician.DoesNotExist, ValueError, TypeError):
                return Response(
                    {"error": "Technician not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if not technician.is_available:
                return Response(
                    {"error": "This technician is unavailable."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if booking.status in INACTIVE_STATUSES:
                return Response(
                    {
                        "error": (
                            "Rejected, cancelled or completed bookings "
                            "cannot be assigned."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            conflicting_booking = Booking.objects.filter(
                assigned_technician=technician,
                booking_date=booking.booking_date,
                time_slot=booking.time_slot,
            ).exclude(
                id=booking.id
            ).exclude(
                status__in=INACTIVE_STATUSES
            ).exists()

            if conflicting_booking:
                return Response(
                    {
                        "error": (
                            "Double booking prevented! This technician "
                            "already has a booking for the same date "
                            "and time slot. Select another technician "
                            "or time slot."
                        )
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            previous_technician = booking.assigned_technician
            booking.assigned_technician = technician
            booking.save(update_fields=["assigned_technician"])

            if booking.customer:
                create_notification(
                    user=booking.customer,
                    booking=booking,
                    title="Technician Assigned",
                    message=(
                        f"{technician.user.get_full_name() or technician.user.username} "
                        f"has been assigned to your {booking.service.name} booking."
                    ),
                    notification_type="technician_assigned",
                )

            if (
                previous_technician is None
                or previous_technician.id != technician.id
            ):
                create_notification(
                    user=technician.user,
                    booking=booking,
                    title="New Booking Assigned",
                    message=(
                        f"You have been assigned booking #{booking.id} "
                        f"for {booking.service.name} on {booking.booking_date}."
                    ),
                    notification_type="technician_assigned",
                )

        return Response(
            {
                "message": "Technician assigned successfully.",
                "booking": BookingSerializer(
                    booking,
                    context={"request": request},
                ).data,
            },
            status=status.HTTP_200_OK,
        )

    except Exception:
        return Response(
            {
                "error": (
                    "An unexpected error occurred while assigning "
                    "the technician."
                )
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# Technician sees only their assigned bookings.
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def technician_assigned_bookings(request):

    try:
        technician = request.user.technician_profile
    except Technician.DoesNotExist:
        return Response(
            {"error": "Technician profile not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    bookings = Booking.objects.filter(
        assigned_technician=technician
    ).order_by("-created_at")

    return Response(
        BookingSerializer(
            bookings,
            many=True,
            context={"request": request},
        ).data,
        status=status.HTTP_200_OK,
    )


# Technician accepts pending bookings or completes accepted bookings.
@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def technician_update_booking_status(request, booking_id):

    if request.user.is_staff:
        return Response(
            {"error": "Please use the admin booking controls."},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        technician = request.user.technician_profile
    except Technician.DoesNotExist:
        return Response(
            {"error": "Technician profile not found."},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        booking = Booking.objects.get(
            id=booking_id,
            assigned_technician=technician,
        )
    except Booking.DoesNotExist:
        return Response(
            {"error": "This booking is not assigned to you."},
            status=status.HTTP_404_NOT_FOUND,
        )

    new_status = request.data.get("status")

    if booking.status == "Pending" and new_status == "Accepted":
        booking.status = "Accepted"
    elif booking.status == "Accepted" and new_status == "Completed":
        booking.status = "Completed"
    else:
        return Response(
            {
                "error": (
                    "Invalid status change. You can accept a pending "
                    "booking or complete an accepted booking."
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    booking.save(update_fields=["status"])

    if booking.customer:
        create_notification(
            user=booking.customer,
            booking=booking,
            title=f"Booking {booking.status}",
            message=(
                f"Your technician updated your {booking.service.name} "
                f"booking to {booking.status.lower()}."
            ),
            notification_type=(
                "service_completed"
                if booking.status == "Completed"
                else "booking_status"
            ),
        )

    return Response(
        {
            "message": "Booking status updated successfully.",
            "booking": BookingSerializer(
                booking,
                context={"request": request},
            ).data,
        },
        status=status.HTTP_200_OK,
    )


# Technician uploads before/after work photos.
@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_booking_photos(request, booking_id):

    if request.user.is_staff:
        return Response(
            {"error": "Only the assigned technician can upload photos."},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        technician = request.user.technician_profile
    except Technician.DoesNotExist:
        return Response(
            {"error": "Technician profile not found."},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        booking = Booking.objects.get(
            id=booking_id,
            assigned_technician=technician,
        )
    except Booking.DoesNotExist:
        return Response(
            {"error": "This booking is not assigned to you."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if booking.status not in ["Accepted", "Completed"]:
        return Response(
            {
                "error": (
                    "You can upload photos only after accepting "
                    "the booking."
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    before_photo = request.FILES.get("before_photo")
    after_photo = request.FILES.get("after_photo")

    if not before_photo and not after_photo:
        return Response(
            {
                "error": (
                    "Please select a before photo or an after photo."
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if before_photo:
        booking.before_photo = before_photo

    if after_photo:
        if booking.status != "Completed":
            return Response(
                {
                    "error": (
                        "After photo can be uploaded after "
                        "the booking is completed."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.after_photo = after_photo

    booking.save()

    return Response(
        {
            "message": "Photo uploaded successfully.",
            "booking": BookingSerializer(
                booking,
                context={"request": request},
            ).data,
        },
        status=status.HTTP_200_OK,
    )


# Returns available time slots for a service and date.
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def available_time_slots(request):

    booking_date = request.query_params.get("date")
    service_id = request.query_params.get("service")

    if not booking_date or not service_id:
        return Response(
            {"error": "Date and service are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        parsed_date = date.fromisoformat(booking_date)
    except (ValueError, TypeError):
        return Response(
            {"error": "Invalid date format. Use YYYY-MM-DD."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if parsed_date < date.today():
        return Response(
            {"error": "You cannot select a past date."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        service = Service.objects.get(
            id=service_id,
            is_available=True,
        )
    except (Service.DoesNotExist, ValueError, TypeError):
        return Response(
            {"error": "Service not found or unavailable."},
            status=status.HTTP_404_NOT_FOUND,
        )

    booked_slots = set(
        Booking.objects.filter(
            booking_date=parsed_date,
            service=service,
        ).exclude(
            status__in=INACTIVE_STATUSES
        ).values_list("time_slot", flat=True)
    )

    available_slots = [
        {"value": slot[0], "label": slot[1]}
        for slot in Booking.TIME_SLOTS
        if slot[0] not in booked_slots
    ]

    return Response(
        available_slots,
        status=status.HTTP_200_OK,
    )


# Customer submits a review for their own completed booking.
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_service_review(request):

    booking_id = request.data.get("booking_id")
    rating = request.data.get("rating")
    comment = request.data.get("comment", "")

    if not booking_id or rating is None:
        return Response(
            {"error": "Booking ID and rating are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        rating = int(rating)
    except (TypeError, ValueError):
        return Response(
            {"error": "Rating must be a number from 1 to 5."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not 1 <= rating <= 5:
        return Response(
            {"error": "Rating must be between 1 and 5."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        booking = Booking.objects.get(
            id=booking_id,
            customer=request.user,
        )
    except (Booking.DoesNotExist, ValueError, TypeError):
        return Response(
            {"error": "Booking not found for this customer."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if booking.status != "Completed":
        return Response(
            {"error": "You can review only completed bookings."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if ServiceReview.objects.filter(booking=booking).exists():
        return Response(
            {"error": "You have already reviewed this booking."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        review = ServiceReview.objects.create(
            customer=request.user,
            booking=booking,
            rating=rating,
            comment=str(comment).strip(),
        )
    except IntegrityError:
        return Response(
            {"error": "You have already reviewed this booking."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {
            "message": "Review submitted successfully!",
            "review": {
                "id": review.id,
                "booking_id": booking.id,
                "service": booking.service.name,
                "rating": review.rating,
                "comment": review.comment,
                "created_at": review.created_at,
            },
        },
        status=status.HTTP_201_CREATED,
    )


# Public API: displays submitted customer reviews.
@api_view(["GET"])
@permission_classes([AllowAny])
def service_review_list(request):

    reviews = ServiceReview.objects.select_related(
        "customer",
        "booking",
        "booking__service",
    ).order_by("-created_at")

    review_data = []

    for review in reviews:
        review_data.append({
            "id": review.id,
            "customer_name": (
                review.customer.first_name
                or review.customer.username
            ),
            "service_name": review.booking.service.name,
            "rating": review.rating,
            "comment": review.comment,
            "created_at": review.created_at,
        })

    return Response(
        review_data,
        status=status.HTTP_200_OK,
    )


# Logged-in user sees only their own notifications.
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def notification_list(request):

    notifications = Notification.objects.filter(
        user=request.user
    ).order_by("-created_at")

    data = [
        {
            "id": notification.id,
            "booking_id": notification.booking_id,
            "title": notification.title,
            "message": notification.message,
            "notification_type": notification.notification_type,
            "is_read": notification.is_read,
            "created_at": notification.created_at,
        }
        for notification in notifications
    ]

    return Response(data, status=status.HTTP_200_OK)


# Logged-in user marks one of their notifications as read.
@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):

    notification = get_object_or_404(
        Notification,
        id=notification_id,
        user=request.user,
    )

    notification.is_read = True
    notification.save(update_fields=["is_read"])

    return Response(
        {
            "message": "Notification marked as read.",
            "id": notification.id,
            "is_read": notification.is_read,
        },
        status=status.HTTP_200_OK,
    )


# Smart Price Estimation API
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def estimate_booking_price(request):

    service_id = request.data.get("service_id")
    additional_work_ids = request.data.get(
        "additional_work_ids", []
    )

    if not service_id:
        return Response(
            {"error": "Please select a service."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        service = Service.objects.get(
            id=service_id,
            is_available=True,
        )
    except (Service.DoesNotExist, ValueError, TypeError):
        return Response(
            {"error": "Service not found or unavailable."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not isinstance(additional_work_ids, list):
        return Response(
            {"error": "additional_work_ids must be a list."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        additional_work_ids = list(
            dict.fromkeys(
                int(work_id)
                for work_id in additional_work_ids
            )
        )
    except (ValueError, TypeError):
        return Response(
            {"error": "Invalid additional work ID."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    additional_works = AdditionalWork.objects.filter(
        id__in=additional_work_ids,
        service=service,
        is_available=True,
    )

    if additional_works.count() != len(additional_work_ids):
        return Response(
            {
                "error": (
                    "One or more additional works are invalid, "
                    "unavailable, or belong to another service."
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    base_price = service.price
    additional_total = sum(
        (work.estimated_price for work in additional_works),
        start=base_price * 0,
    )
    estimated_total = base_price + additional_total

    return Response(
        {
            "service_id": service.id,
            "service_name": service.name,
            "base_price": str(base_price),
            "additional_works": [
                {
                    "id": work.id,
                    "name": work.name,
                    "price": str(work.estimated_price),
                }
                for work in additional_works
            ],
            "additional_total": str(additional_total),
            "estimated_total": str(estimated_total),
            "currency": "INR",
        },
        status=status.HTTP_200_OK,
    )


# Create a Razorpay order for a customer's booking
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_razorpay_order(request):
    booking_id = request.data.get("booking_id")

    if not booking_id:
        return Response(
            {"error": "Booking ID is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        booking = Booking.objects.get(
            id=booking_id,
            customer=request.user,
        )
    except (Booking.DoesNotExist, ValueError, TypeError):
        return Response(
            {"error": "Booking not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if booking.status in INACTIVE_STATUSES:
        return Response(
            {"error": "This booking cannot be paid for."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        return Response(
            {"error": "Razorpay test keys are not configured yet."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    amount = booking.final_total or booking.estimated_total

    if amount is None or amount <= 0:
        return Response(
            {"error": "Booking amount must be greater than zero."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        client = razorpay.Client(
            auth=(
                settings.RAZORPAY_KEY_ID,
                settings.RAZORPAY_KEY_SECRET,
            )
        )

        order = client.order.create(
            data={
                "amount": int(amount * 100),
                "currency": "INR",
                "receipt": f"booking_{booking.id}",
            }
        )

        payment = Payment.objects.create(
            booking=booking,
            amount=amount,
            currency="INR",
            payment_method="razorpay",
            payment_status="Pending",
            razorpay_order_id=order["id"],
        )

        return Response(
            {
                "message": "Razorpay order created successfully.",
                "payment_id": payment.id,
                "booking_id": booking.id,
                "razorpay_order_id": order["id"],
                "amount": order["amount"],
                "currency": order["currency"],
                "key_id": settings.RAZORPAY_KEY_ID,
            },
            status=status.HTTP_201_CREATED,
        )

    except Exception:
        return Response(
            {"error": "Unable to create Razorpay order. Please try again."},
            status=status.HTTP_502_BAD_GATEWAY,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_cash_payment(request):
    booking_id = request.data.get("booking_id")

    if not booking_id:
        return Response(
            {"error": "Booking ID is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        booking = Booking.objects.get(
            id=booking_id,
            customer=request.user,
        )
    except (Booking.DoesNotExist, ValueError, TypeError):
        return Response(
            {"error": "Booking not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if booking.status in INACTIVE_STATUSES:
        return Response(
            {"error": "This booking cannot be paid for."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    amount = booking.final_total or booking.estimated_total

    if amount is None or amount <= 0:
        return Response(
            {"error": "Booking amount must be greater than zero."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    payment = Payment.objects.create(
        booking=booking,
        amount=amount,
        currency="INR",
        payment_method="cash",
        payment_status="Pending",
    )

    return Response(
        {
            "message": "Cash payment recorded as pending.",
            "payment_id": payment.id,
            "booking_id": booking.id,
            "amount": str(payment.amount),
            "payment_method": payment.payment_method,
            "payment_status": payment.payment_status,
        },
        status=status.HTTP_201_CREATED,
    )



@api_view(["POST"])
@permission_classes([IsAuthenticated])
def update_technician_location(request):
    booking_id = request.data.get("booking_id")
    latitude = request.data.get("latitude")
    longitude = request.data.get("longitude")

    if booking_id is None or latitude is None or longitude is None:
        return Response(
            {"error": "booking_id, latitude and longitude are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        latitude = float(latitude)
        longitude = float(longitude)
    except (TypeError, ValueError):
        return Response(
            {"error": "Latitude and longitude must be numbers."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
        return Response(
            {"error": "Invalid GPS coordinates."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        booking = Booking.objects.get(
            id=booking_id,
            assigned_technician__user=request.user,
        )
    except (Booking.DoesNotExist, ValueError, TypeError):
        return Response(
            {"error": "Assigned booking not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if booking.status in ["Completed", "Cancelled", "Rejected"]:
        return Response(
            {"error": "Location tracking is not active for this booking."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    location, created = TechnicianGPSLocation.objects.update_or_create(
        booking=booking,
        defaults={
            "latitude": latitude,
            "longitude": longitude,
        },
    )

    return Response({
        "message": "Technician location updated successfully.",
        "booking_id": booking.id,
        "latitude": location.latitude,
        "longitude": location.longitude,
        "updated_at": location.updated_at,
    })

    
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_technician_location(request, booking_id):
    try:
        booking = Booking.objects.get(
            id=booking_id,
            customer=request.user
        )
    except Booking.DoesNotExist:
        return Response(
            {"error": "Booking not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        location = booking.gps_location
    except TechnicianGPSLocation.DoesNotExist:
        return Response(
            {"message": "Technician location not shared yet."},
            status=status.HTTP_404_NOT_FOUND
        )

    return Response({
        "booking_id": booking.id,
        "latitude": location.latitude,
        "longitude": location.longitude,
        "updated_at": location.updated_at
    })

