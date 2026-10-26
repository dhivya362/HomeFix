
from django.contrib import admin
from .models import Service, AdditionalWork


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "price", "is_available")
    list_filter = ("is_available",)
    search_fields = ("name",)


@admin.register(AdditionalWork)
class AdditionalWorkAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "service",
        "estimated_price",
        "is_available",
    )
    list_filter = ("service", "is_available")
    search_fields = ("name", "service__name")
