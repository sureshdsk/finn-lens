"""arq worker scaffold — no Redis needed for basic auth to work."""
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "finnlens.settings")
django.setup()


class WorkerSettings:
    redis_settings = None
    functions = []
    cron_jobs = []
