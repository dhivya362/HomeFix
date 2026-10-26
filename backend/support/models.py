
from django.conf import settings
from django.db import models


class SupportTicket(models.Model):

    CATEGORY_CHOICES = [
        ("booking", "Booking Issue"),
        ("technician", "Technician Issue"),
        ("payment", "Payment Issue"),
        ("service", "Service Quality"),
        ("refund", "Refund Request"),
        ("other", "Other"),
    ]

    STATUS_CHOICES = [
        ("open", "Open"),
        ("in_progress", "In Progress"),
        ("resolved", "Resolved"),
        ("closed", "Closed"),
    ]

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="support_tickets",
    )

    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
    )

    subject = models.CharField(max_length=150)

    description = models.TextField()

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="open",
    )

    admin_reply = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Ticket #{self.pk} - {self.subject}"
