
from django.db import models
from django.contrib.auth.models import User


class Technician(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="technician_profile"
    )
    phone = models.CharField(max_length=10)
    specialization = models.CharField(max_length=100)
    is_available = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.username} - {self.specialization}"
