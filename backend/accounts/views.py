from django_bolt import ViewSet, Request, IsAuthenticated, JWTAuthentication
from django_bolt import create_jwt_for_user
from django_bolt.exceptions import Unauthorized
from django.contrib.auth import authenticate
from asgiref.sync import sync_to_async

from .api import api
from .serializers import LoginSchema, UserSchema, UpdateProfileSchema


@api.viewset("/")
class AuthViewSet(ViewSet):
    async def create(self, request: Request, data: LoginSchema):
        """POST /api/auth/ — authenticate and return JWT token"""
        user = await sync_to_async(authenticate)(username=data.username, password=data.password)
        if user is None:
            raise Unauthorized("Invalid credentials")
        token = create_jwt_for_user(user)
        return {"token": token}


def _get_or_create_profile(user):
    from .models import UserProfile
    profile, _ = UserProfile.objects.get_or_create(
        user=user,
        defaults={"display_name": user.get_full_name() or user.username},
    )
    return profile


@api.viewset("/me")
class MeViewSet(ViewSet):
    auth = [JWTAuthentication()]
    guards = [IsAuthenticated]

    async def list(self, request: Request):
        """GET /api/auth/me/ — return current user info with profile"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        ctx = request.context
        user = await User.objects.aget(pk=int(ctx["user_id"]))
        profile = await sync_to_async(_get_or_create_profile)(user)
        return UserSchema(
            id=user.pk,
            username=user.username,
            email=user.email,
            is_staff=user.is_staff,
            display_name=profile.display_name,
            date_of_birth=str(profile.date_of_birth) if profile.date_of_birth else None,
            avatar_url=profile.avatar_url,
            currency=profile.currency,
        )

    async def partial_update(self, request: Request, data: UpdateProfileSchema):
        """PATCH /api/auth/me/ — update user profile"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        ctx = request.context
        user = await User.objects.aget(pk=int(ctx["user_id"]))
        profile = await sync_to_async(_get_or_create_profile)(user)

        if data.display_name is not None:
            profile.display_name = data.display_name
        if data.date_of_birth is not None:
            from datetime import date as date_type
            profile.date_of_birth = date_type.fromisoformat(data.date_of_birth) if data.date_of_birth else None
        if data.currency is not None:
            profile.currency = data.currency

        await sync_to_async(profile.save)()

        return UserSchema(
            id=user.pk,
            username=user.username,
            email=user.email,
            is_staff=user.is_staff,
            display_name=profile.display_name,
            date_of_birth=str(profile.date_of_birth) if profile.date_of_birth else None,
            avatar_url=profile.avatar_url,
            currency=profile.currency,
        )
