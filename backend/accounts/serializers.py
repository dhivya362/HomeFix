from django.contrib.auth.models import User
from rest_framework import serializers
from .models import CustomerProfile


class RegisterSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=15)
    password = serializers.CharField(
        write_only=True,
        min_length=6
    )

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "This email is already registered."
            )
        return value

    def create(self, validated_data):
        name = validated_data["name"].strip()
        email = validated_data["email"].strip().lower()
        phone = validated_data["phone"].strip()
        password = validated_data["password"]

        user = User.objects.create_user(
            username=email,
            first_name=name,
            email=email,
            password=password
        )

        CustomerProfile.objects.create(
            user=user,
            phone=phone
        )

        return user
