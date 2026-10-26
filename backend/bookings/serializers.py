
from rest_framework import serializers
from django.utils import timezone

from .models import Booking
from services.models import AdditionalWork


class BookingSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(
        source="service.name",
        read_only=True,
    )

    service_price = serializers.DecimalField(
        source="service.price",
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )

    additional_works = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=AdditionalWork.objects.filter(is_available=True),
        required=False,
    )

    additional_work_details = serializers.SerializerMethodField()

    estimated_total = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )

    final_total = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True,
        allow_null=True,
    )

    before_photo = serializers.ImageField(
        required=False,
        allow_null=True,
    )

    after_photo = serializers.ImageField(
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Booking
        fields = [
            "id",
            "customer",
            "service",
            "service_name",
            "service_price",
            "additional_works",
            "additional_work_details",
            "estimated_total",
            "final_total",
            "customer_name",
            "phone",
            "address",
            "issue_description",
            "booking_date",
            "time_slot",
            "status",
            "assigned_technician",
            "before_photo",
            "after_photo",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "customer",
            "status",
            "assigned_technician",
            "created_at",
            "estimated_total",
            "final_total",
        ]

    def get_additional_work_details(self, obj):
        return [
            {
                "id": work.id,
                "name": work.name,
                "description": work.description,
                "estimated_price": str(work.estimated_price),
            }
            for work in obj.additional_works.all()
        ]

    def validate_customer_name(self, value):
        if not value.strip():
            raise serializers.ValidationError(
                "Customer name cannot be empty."
            )
        return value.strip()

    def validate_phone(self, value):
        phone = value.strip()

        if not phone.isdigit() or len(phone) != 10:
            raise serializers.ValidationError(
                "Enter a valid 10-digit phone number."
            )

        return phone

    def validate_booking_date(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError(
                "Booking date cannot be in the past."
            )
        return value

    def validate(self, data):
        service = data.get(
            "service",
            self.instance.service if self.instance else None,
        )

        booking_date = data.get(
            "booking_date",
            self.instance.booking_date if self.instance else None,
        )

        time_slot = data.get(
            "time_slot",
            self.instance.time_slot if self.instance else None,
        )

        additional_works = data.get("additional_works")

        if additional_works is None and self.instance:
            additional_works = list(
                self.instance.additional_works.all()
            )

        if additional_works is not None and service:
            for work in additional_works:
                if work.service_id != service.id:
                    raise serializers.ValidationError({
                        "additional_works": (
                            f"{work.name} does not belong to "
                            f"the selected service {service.name}."
                        )
                    })

        if not service or not booking_date or not time_slot:
            return data

        existing_booking = Booking.objects.filter(
            service=service,
            booking_date=booking_date,
            time_slot=time_slot,
        ).exclude(
            status__in=[
                "Rejected",
                "Cancelled",
                "Completed",
            ]
        )

        if self.instance:
            existing_booking = existing_booking.exclude(
                pk=self.instance.pk
            )

        if existing_booking.exists():
            raise serializers.ValidationError({
                "time_slot": (
                    "This service is already booked for "
                    "the selected date and time slot. "
                    "Please choose another slot."
                )
            })

        return data

    def create(self, validated_data):
        additional_works = validated_data.pop(
            "additional_works", []
        )

        booking = Booking.objects.create(**validated_data)
        booking.additional_works.set(additional_works)
        booking.calculate_estimated_total()

        return booking

    def update(self, instance, validated_data):
        additional_works = validated_data.pop(
            "additional_works", None
        )

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if additional_works is not None:
            instance.additional_works.set(additional_works)

        instance.calculate_estimated_total()
        return instance
