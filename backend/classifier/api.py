from django_bolt import BoltAPI

api = BoltAPI(prefix="/api/classifier")

import classifier.views  # noqa: E402, F401
