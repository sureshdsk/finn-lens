from django.conf import settings
from django.db import models


class GmailAccount(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="gmail_accounts"
    )
    email = models.EmailField()
    refresh_token = models.TextField()  # Fernet-encrypted
    access_token = models.TextField(blank=True, default="")  # Transient
    token_expiry = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    last_sync_at = models.DateTimeField(null=True, blank=True)
    last_history_id = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "email")

    def __str__(self):
        return f"{self.email} ({self.user})"


class SyncJob(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("fetching", "Fetching"),
        ("classifying", "Classifying"),
        ("parsing", "Parsing"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]

    gmail_account = models.ForeignKey(GmailAccount, on_delete=models.CASCADE, related_name="sync_jobs")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    total_messages = models.IntegerField(default=0)
    processed_messages = models.IntegerField(default=0)
    new_messages = models.IntegerField(default=0)
    extracted_count = models.IntegerField(default=0)
    error_message = models.TextField(blank=True, default="")
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"SyncJob {self.pk} ({self.status})"


class EmailMessage(models.Model):
    SOURCE_TYPE_CHOICES = [
        ("credit_card", "Credit Card"),
        ("subscription", "Subscription"),
        ("investment", "Investment"),
        ("bill", "Bill"),
        ("ecommerce", "E-commerce"),
        ("bank", "Bank"),
        ("unknown", "Unknown"),
    ]

    gmail_account = models.ForeignKey(GmailAccount, on_delete=models.CASCADE, related_name="emails")
    message_id = models.CharField(max_length=255, unique=True, db_index=True)
    thread_id = models.CharField(max_length=255, db_index=True)
    sender = models.CharField(max_length=500, db_index=True)
    subject = models.CharField(max_length=1000)
    received_at = models.DateTimeField()
    snippet = models.TextField(blank=True, default="")
    raw_html = models.TextField(blank=True, default="")
    is_processed = models.BooleanField(default=False)
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPE_CHOICES, default="unknown")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sender}: {self.subject[:60]}"


class EmailSenderRule(models.Model):
    gmail_account = models.ForeignKey(GmailAccount, on_delete=models.CASCADE, related_name="sender_rules")
    sender_pattern = models.CharField(max_length=500)  # e.g. *@hdfcbank.net
    source_type = models.CharField(max_length=20, choices=EmailMessage.SOURCE_TYPE_CHOICES)
    is_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sender_pattern} → {self.source_type}"


class ExtractedFinancialData(models.Model):
    DATA_TYPE_CHOICES = [
        ("cc_transaction", "CC Transaction"),
        ("subscription_renewal", "Subscription Renewal"),
        ("investment_update", "Investment Update"),
        ("bill_notice", "Bill Notice"),
        ("order_confirmation", "Order Confirmation"),
        ("delivery_update", "Delivery Update"),
    ]

    email = models.ForeignKey(EmailMessage, on_delete=models.CASCADE, related_name="extracted_data")
    data_type = models.CharField(max_length=30, choices=DATA_TYPE_CHOICES)
    data_json = models.JSONField()
    confidence = models.FloatField(default=0.0)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.data_type}: {self.email.subject[:40]}"
