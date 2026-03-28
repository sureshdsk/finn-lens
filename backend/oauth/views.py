from django.conf import settings
from django_bolt import ViewSet, Request, IsAuthenticated, JWTAuthentication
from django_bolt.exceptions import BadRequest

from .api import api
from .serializers import AuthUrlResponse, CallbackRequest, CallbackResponse

_auth = [JWTAuthentication()]
_guards = [IsAuthenticated]

GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "profile",
    "email",
]


@api.viewset("/google/auth-url")
class GoogleAuthUrlViewSet(ViewSet):
    auth = _auth
    guards = _guards

    async def list(self, request: Request):
        """GET /api/oauth/google/auth-url/ — returns Google OAuth consent URL + PKCE code_verifier"""
        import hashlib
        import base64
        import secrets

        # Generate PKCE code verifier and challenge
        code_verifier = secrets.token_urlsafe(64)
        code_challenge = base64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode()).digest()
        ).rstrip(b"=").decode()

        from google_auth_oauthlib.flow import Flow

        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            },
            scopes=GOOGLE_SCOPES,
        )
        flow.redirect_uri = settings.GOOGLE_REDIRECT_URI

        url, _ = flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true",
            prompt="consent",
            code_challenge=code_challenge,
            code_challenge_method="S256",
        )
        return AuthUrlResponse(url=url, code_verifier=code_verifier)


@api.viewset("/google/callback")
class GoogleCallbackViewSet(ViewSet):
    auth = _auth
    guards = _guards

    async def create(self, request: Request, data: CallbackRequest):
        """POST /api/oauth/google/callback/ — exchange auth code for tokens"""
        import httpx
        from datetime import datetime, timezone, timedelta
        from asgiref.sync import sync_to_async

        # Exchange code for tokens directly (bypass google_auth_oauthlib to avoid double-fetch)
        async with httpx.AsyncClient() as client:
            token_resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "grant_type": "authorization_code",
                    "code": data.code,
                    "code_verifier": data.code_verifier,
                    "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                },
            )

        if token_resp.status_code != 200:
            detail = token_resp.json().get("error_description", "Token exchange failed")
            raise BadRequest(detail=detail)

        token_data = token_resp.json()
        access_token = token_data["access_token"]
        refresh_token = token_data.get("refresh_token")
        expires_in = token_data.get("expires_in", 3600)

        if not refresh_token:
            raise BadRequest(detail="No refresh token received. Please revoke access and try again.")

        # Fetch user info (email, name, picture) via OpenID userinfo endpoint
        async with httpx.AsyncClient() as client:
            userinfo_resp = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )

        if userinfo_resp.status_code != 200:
            raise BadRequest(detail="Failed to fetch user info from Google")

        userinfo = userinfo_resp.json()
        email = userinfo.get("email", "")
        google_name = userinfo.get("name", "")
        google_picture = userinfo.get("picture", "")

        if not email:
            raise BadRequest(detail="Failed to fetch email address from Google")

        # Store tokens
        from gmail.models import GmailAccount
        from gmail.encryption import encrypt_token

        user_id = int(request.context["user_id"])
        encrypted_refresh = encrypt_token(refresh_token)
        token_expiry = datetime.now(tz=timezone.utc) + timedelta(seconds=expires_in)

        account, _ = await sync_to_async(GmailAccount.objects.update_or_create)(
            user_id=user_id,
            email=email,
            defaults={
                "refresh_token": encrypted_refresh,
                "access_token": access_token,
                "token_expiry": token_expiry,
                "is_active": True,
                "needs_reauth": False,
                "reauth_reason": "",
            },
        )

        # Pre-seed default sender rules
        await sync_to_async(_seed_sender_rules)(account)

        # Auto-populate user profile with Google info
        if google_name or google_picture:
            await sync_to_async(_update_user_profile)(user_id, google_name, google_picture)

        return CallbackResponse(email=email, connected=True)


def _seed_sender_rules(account):
    from gmail.management.commands.bootstrap_sender_rules import load_rules, sync_rules_for_account
    sync_rules_for_account(account, load_rules(), reset=False)


def _update_user_profile(user_id, google_name, google_picture):
    from django.contrib.auth import get_user_model
    from accounts.models import UserProfile
    User = get_user_model()
    user = User.objects.get(pk=user_id)
    profile, created = UserProfile.objects.get_or_create(
        user=user,
        defaults={"display_name": google_name, "avatar_url": google_picture},
    )
    if not created:
        changed = False
        if google_name and not profile.display_name:
            profile.display_name = google_name
            changed = True
        if google_picture:
            profile.avatar_url = google_picture
            changed = True
        if changed:
            profile.save()
