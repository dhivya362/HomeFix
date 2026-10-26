
from django.urls import path
from . import views

from .views import (
    booking_list_create,
    reschedule_customer_booking,
    cancel_customer_booking,
    update_booking_status,
    assign_technician,
    technician_assigned_bookings,
    technician_update_booking_status,
    available_time_slots,
    create_service_review,
    service_review_list,
    notification_list,
    mark_notification_read,
)

urlpatterns = [
    # Customer bookings
    path("", booking_list_create, name="booking-list-create"),

    # Reschedule a customer booking
    path(
        "reschedule/<int:booking_id>/",
        reschedule_customer_booking,
        name="reschedule-customer-booking",
    ),

    # Cancel a customer booking
    path(
        "<int:booking_id>/cancel/",
        cancel_customer_booking,
        name="cancel-customer-booking",
    ),

    # Admin booking controls
    path(
        "<int:booking_id>/status/",
        update_booking_status,
        name="update-booking-status",
    ),
    path(
        "<int:booking_id>/assign-technician/",
        assign_technician,
        name="assign-technician",
    ),

    # Technician bookings
    path(
        "technician/",
        technician_assigned_bookings,
        name="technician-assigned-bookings",
    ),
    path(
        "technician/<int:booking_id>/status/",
        technician_update_booking_status,
        name="technician-update-booking-status",
    ),

    # Available time slots
    path(
        "available-slots/",
        available_time_slots,
        name="available-time-slots",
    ),

    # Service reviews
    path(
        "reviews/",
        create_service_review,
        name="create-service-review",
    ),
    path(
        "reviews/list/",
        service_review_list,
        name="service-review-list",
    ),

    # Notifications
    path(
        "notifications/",
        notification_list,
        name="notification-list",
    ),
    path(
        "notifications/<int:notification_id>/read/",
        mark_notification_read,
        name="mark-notification-read",
    ),
    path(
        "price-estimate/",
        views.estimate_booking_price,
        name="price-estimate",
    ),
    path(
        "technician/<int:booking_id>/photos/",
        views.upload_booking_photos,
        name="upload_booking_photos",
    ),
    path(
        "create-razorpay-order/",
        views.create_razorpay_order,
        name="create-razorpay-order",
    ),
    path(
        "create-cash-payment/",
        views.create_cash_payment,
        name="create-cash-payment",
    ),
    path(
        "technician-location/update/",
        views.update_technician_location,
        name="update-technician-location",
    ),
    path(
        "customer/technician-location/<int:booking_id>/",
        views.get_technician_location,
        name="get-technician-location",
    ),

]
