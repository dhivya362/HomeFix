
from rest_framework import serializers
from .models import Technician


class TechnicianSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        source="user.username",
        read_only=True
    )
    email = serializers.EmailField(
        source="user.email",
        read_only=True
    )

    class Meta:
        model = Technician
        fields = [
            "id",
            "user",
            "username",
            "email",
            "phone",
            "specialization",
            "is_available",
        ]
        read_only_fields = ["id", "user"]