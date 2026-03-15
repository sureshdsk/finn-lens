from django_bolt import BoltAPI

api = BoltAPI(prefix="/api/gmail")

# Import views to register viewsets on this api instance
import gmail.views  # noqa: E402, F401
