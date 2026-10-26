
from rest_framework import serializers
from .models import SupportTicket


class SupportTicketSerializer(serializers.ModelSerializer):
    customer_email = serializers.EmailField(
        source="customer.email",
        read_only=True
    )

    class Meta:
        model = SupportTicket
        fields = "__all__"
        read_only_fields = (
            "id",
            "customer",
            "customer_email",
            "created_at",
            "updated_at",
        )

    def create(self, validated_data):
        request = self.context.get("request")

        # New customer tickets always start as open
        if request and not request.user.is_staff:
            validated_data["status"] = "open"
            validated_data["admin_reply"] = ""

        return super().create(validated_data)
