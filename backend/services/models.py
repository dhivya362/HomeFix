
from django.db import models


class Service(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_available = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class AdditionalWork(models.Model):
    service = models.ForeignKey(
        Service,
        on_delete=models.CASCADE,
        related_name="additional_works",
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    estimated_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )
    is_available = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.service.name} - {self.name}"
