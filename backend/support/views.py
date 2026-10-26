
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied

from .models import SupportTicket
from .serializers import SupportTicketSerializer


class SupportTicketListCreateView(generics.ListCreateAPIView):
    serializer_class = SupportTicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.is_staff:
            return SupportTicket.objects.all().order_by("-created_at")

        return SupportTicket.objects.filter(
            customer=user
        ).order_by("-created_at")

    def perform_create(self, serializer):
        if self.request.user.is_staff:
            raise PermissionDenied(
                "Admin cannot create a customer support ticket."
            )

        serializer.save(customer=self.request.user)


class SupportTicketDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = SupportTicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.is_staff:
            return SupportTicket.objects.all()

        return SupportTicket.objects.filter(customer=user)

    def perform_update(self, serializer):
        if not self.request.user.is_staff:
            raise PermissionDenied(
                "Only admin can update ticket status and reply."
            )

        serializer.save()
