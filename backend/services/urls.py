
from django.urls import path
from .views import (
    service_list,
    service_detail,
    service_availability,
    additional_work_list,
)

urlpatterns = [
    path("", service_list, name="service-list"),
    path("<int:pk>/", service_detail, name="service-detail"),
    path(
        "<int:pk>/availability/",
        service_availability,
        name="service-availability",
    ),
    path(
        "additional-works/",
        additional_work_list,
        name="additional-work-list",
    ),
]
