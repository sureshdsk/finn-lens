from django_bolt import BoltAPI

api = BoltAPI(prefix="/api/banking")

# Import views to register viewsets on this api instance
import banking.views  # noqa: E402, F401
