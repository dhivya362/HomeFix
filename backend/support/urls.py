
from django.urls import path
from .views import (
    SupportTicketListCreateView,
    SupportTicketDetailView,
)

urlpatterns = [
    path(
        "",
        SupportTicketListCreateView.as_view(),
        name="support-ticket-list-create",
    ),
    path(
        "<int:pk>/",
        SupportTicketDetailView.as_view(),
        name="support-ticket-detail",
    ),
]
