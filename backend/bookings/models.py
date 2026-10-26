
from decimal import Decimal

from django.db import models
from django.contrib.auth.models import User
from services.models import Service


class Booking(models.Model):
    customer = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bookings",
    )

    TIME_SLOTS = [
        ("09:00-11:00", "09:00 AM - 11:00 AM"),
        ("11:00-13:00", "11:00 AM - 01:00 PM"),
        ("13:00-15:00", "01:00 PM - 03:00 PM"),
        ("15:00-17:00", "03:00 PM - 05:00 PM"),
        ("17:00-19:00", "05:00 PM - 07:00 PM"),
    ]

    STATUS_CHOICES = [
        ("Pending", "Pending"),
        ("Accepted", "Accepted"),
        ("Rejected", "Rejected"),
        ("Completed", "Completed"),
        ("Cancelled", "Cancelled"),
    ]

    service = models.ForeignKey(
        Service,
        on_delete=models.PROTECT,
        related_name="bookings",
    )

    additional_works = models.ManyToManyField(
        "services.AdditionalWork",
        blank=True,
        related_name="bookings",
    )

    estimated_total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    final_total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )

    customer_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15)
    address = models.TextField()
    issue_description = models.TextField()
    booking_date = models.DateField()

    time_slot = models.CharField(
        max_length=20,
        choices=TIME_SLOTS,
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="Pending",
    )

    assigned_technician = models.ForeignKey(
        "technicians.Technician",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_bookings",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    before_photo = models.ImageField(
        upload_to="booking_photos/before/",
        null=True,
        blank=True,
    )

    after_photo = models.ImageField(
        upload_to="booking_photos/after/",
        null=True,
        blank=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["service", "booking_date", "time_slot"],
                condition=~models.Q(
                    status__in=[
                        "Rejected",
                        "Cancelled",
                        "Completed",
                    ]
                ),
                name="unique_active_service_booking_slot",
            )
        ]

    def calculate_estimated_total(self):
        total = self.service.price

        for work in self.additional_works.filter(is_available=True):
            total += work.estimated_price

        self.estimated_total = total
        self.save(update_fields=["estimated_total"])
        return total

    def __str__(self):
        return f"{self.customer_name} - {self.service.name}"


class ServiceReview(models.Model):
    customer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="service_reviews",
    )

    booking = models.OneToOneField(
        Booking,
        on_delete=models.CASCADE,
        related_name="review",
    )

    rating = models.PositiveSmallIntegerField()
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.customer.username} - {self.rating}/5"


class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ("booking_status", "Booking Status"),
        ("technician_assigned", "Technician Assigned"),
        ("service_completed", "Service Completed"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications",
    )

    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
    )

    title = models.CharField(max_length=150)
    message = models.TextField()

    notification_type = models.CharField(
        max_length=30,
        choices=NOTIFICATION_TYPES,
        default="booking_status",
    )

    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.title}"


class Payment(models.Model):
    PAYMENT_METHODS = [
        ("razorpay", "UPI / Card via Razorpay"),
        ("cash", "Cash"),
    ]

    PAYMENT_STATUSES = [
        ("Pending", "Pending"),
        ("Paid", "Paid"),
        ("Failed", "Failed"),
        ("Refunded", "Refunded"),
    ]

    booking = models.ForeignKey(
        Booking,
        on_delete=models.PROTECT,
        related_name="payments",
    )

    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )

    currency = models.CharField(
        max_length=3,
        default="INR",
    )

    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHODS,
    )

    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUSES,
        default="Pending",
    )

    razorpay_order_id = models.CharField(
        max_length=100,
        blank=True,
    )

    razorpay_payment_id = models.CharField(
        max_length=100,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return (
            f"Payment #{self.id} - "
            f"Booking #{self.booking_id}"
        )



class TechnicianGPSLocation(models.Model):
    booking = models.OneToOneField(
        "bookings.Booking",
        on_delete=models.CASCADE,
        related_name="gps_location",
    )
    latitude = models.FloatField()
    longitude = models.FloatField()
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"GPS location for booking {self.booking_id}"
