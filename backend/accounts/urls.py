
from django.urls import path

from .views import register, login, customer_profile

urlpatterns = [
    path("register/", register, name="register"),
    path("login/", login, name="login"),
    path("profile/", customer_profile, name="customer-profile"),
]
