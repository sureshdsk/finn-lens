from django_bolt import BoltAPI

api = BoltAPI(prefix="/api/oauth")

# Import views to register viewsets on this api instance
import oauth.views  # noqa: E402, F401
