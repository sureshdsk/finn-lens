from django_bolt import BoltAPI

api = BoltAPI(prefix="/api/auth")

# Import views to register viewsets on this api instance
import accounts.views  # noqa: E402, F401
