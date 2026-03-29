import pytest
from asgiref.sync import async_to_sync
from django.contrib.auth import get_user_model
from googleapiclient.errors import HttpError
from httplib2 import Response

from gmail.models import GmailAccount
from gmail.tasks import _is_reauth_error, _reauth_reason
from gmail.views import _get_gmail_account


User = get_user_model()


def _make_scope_error() -> HttpError:
    resp = Response({"status": "403"})
    content = b'{"error":{"message":"Request had insufficient authentication scopes.","errors":[{"reason":"insufficientPermissions"}]}}'
    return HttpError(resp, content, uri="https://gmail.googleapis.com/gmail/v1/users/me/messages")


def test_scope_error_is_detected_as_reauth():
    err = _make_scope_error()
    assert _is_reauth_error(err) is True
    assert _reauth_reason(err) == "Gmail access is missing required read permissions. Please reconnect your Gmail account."


@pytest.mark.django_db
def test_get_gmail_account_can_include_inactive_accounts():
    user = User.objects.create_user(username="reauth-user", email="reauth@example.com", password="testpass123")
    account = GmailAccount.objects.create(
        user=user,
        email="reauth@example.com",
        refresh_token="encrypted",
        is_active=False,
        needs_reauth=True,
        reauth_reason="Gmail access is missing required read permissions. Please reconnect your Gmail account.",
    )

    found = async_to_sync(_get_gmail_account)(user.pk, include_inactive=True)
    assert found.pk == account.pk


@pytest.mark.django_db
def test_get_gmail_account_excludes_inactive_by_default():
    user = User.objects.create_user(username="inactive-user", email="inactive@example.com", password="testpass123")
    GmailAccount.objects.create(
        user=user,
        email="inactive@example.com",
        refresh_token="encrypted",
        is_active=False,
    )

    with pytest.raises(Exception) as exc_info:
        async_to_sync(_get_gmail_account)(user.pk)
    assert "No Gmail account connected" in str(exc_info.value)
