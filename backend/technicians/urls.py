
from django.urls import path

from .views import (
    technician_list,
    update_technician_availability,
)

urlpatterns = [
    path("", technician_list, name="technician-list"),
    path(
        "<int:technician_id>/availability/",
        update_technician_availability,
        name="update-technician-availability",
    ),
]