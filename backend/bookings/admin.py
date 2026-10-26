
from django.contrib import admin
from .models import Booking, ServiceReview, Payment


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "customer_name",
        "service",
        "booking_date",
        "time_slot",
        "status",
    )
    list_filter = ("status", "booking_date")
    search_fields = ("customer_name", "phone")


@admin.register(ServiceReview)
class ServiceReviewAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "customer",
        "booking",
        "rating",
        "comment",
        "created_at",
    )
    list_filter = ("rating", "created_at")
    search_fields = ("customer__username", "comment")
    readonly_fields = ("created_at",)


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "booking",
        "amount",
        "currency",
        "payment_method",
        "payment_status",
        "created_at",
    )
    list_filter = ("payment_method", "payment_status", "created_at")
    search_fields = (
        "razorpay_order_id",
        "razorpay_payment_id",
        "booking__customer_name",
    )
    readonly_fields = ("created_at",)
