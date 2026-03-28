"""arq worker configuration for the email sync pipeline."""
import logging
import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "finnlens.settings")
django.setup()

# Configure logging for worker process
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    datefmt="%H:%M:%S",
)

from arq.connections import RedisSettings

from gmail.tasks import (
    task_fetch,
    task_classify,
    task_parse,
    task_materialize,
    task_classify_transactions,
    task_detect_subscriptions,
)


class WorkerSettings:
    functions = [
        task_fetch,
        task_classify,
        task_parse,
        task_materialize,
        task_classify_transactions,
        task_detect_subscriptions,
    ]
    redis_settings = RedisSettings.from_dsn(
        os.environ.get("REDIS_URL", "redis://localhost:6379")
    )
    max_jobs = 4
    job_timeout = 1800  # 30 minutes — initial fetch can be slow
