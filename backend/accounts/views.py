from django_bolt import ViewSet, Request, IsAuthenticated, JWTAuthentication
from django_bolt import create_jwt_for_user
from django_bolt.exceptions import Unauthorized
from django.contrib.auth import authenticate
from asgiref.sync import sync_to_async

from .api import api
from .serializers import LoginSchema, UserSchema


@api.viewset("/")
class AuthViewSet(ViewSet):
    async def create(self, request: Request, data: LoginSchema):
        """POST /api/auth/ — authenticate and return JWT token"""
        user = await sync_to_async(authenticate)(username=data.username, password=data.password)
        if user is None:
            raise Unauthorized("Invalid credentials")
        token = create_jwt_for_user(user)
        return {"token": token}


@api.viewset("/me")
class MeViewSet(ViewSet):
    auth = [JWTAuthentication()]
    guards = [IsAuthenticated]

    async def list(self, request: Request):
        """GET /api/auth/me/ — return current user info"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        ctx = request.context
        user = await User.objects.aget(pk=int(ctx["user_id"]))
        return UserSchema(
            id=user.pk,
            username=user.username,
            email=user.email,
            is_staff=user.is_staff,
        )
