from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Family(models.Model):
    name = models.CharField(max_length=255)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="families")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "families"

    def __str__(self):
        return self.name


class BankAccount(models.Model):
    BANK_CHOICES = [
        ("ICICI", "ICICI Bank"),
        ("IDFC", "IDFC First Bank"),
        ("OTHER", "Other"),
    ]

    family = models.ForeignKey(Family, on_delete=models.CASCADE, related_name="accounts")
    bank_name = models.CharField(max_length=50, choices=BANK_CHOICES)
    account_number = models.CharField(max_length=50, blank=True)
    account_holder_name = models.CharField(max_length=255, blank=True)
    currency = models.CharField(max_length=3, default="INR")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.bank_name} — {self.account_number or 'unknown'}"


class Transaction(models.Model):
    CATEGORY_CHOICES = [
        ("food", "Food"),
        ("groceries", "Groceries"),
        ("clothing", "Clothing"),
        ("entertainment", "Entertainment"),
        ("ecommerce", "E-commerce"),
        ("travel_transport", "Travel & Transport"),
        ("bills_utilities", "Bills & Utilities"),
        ("healthcare", "Healthcare"),
        ("education", "Education"),
        ("investment_finance", "Investment & Finance"),
        ("services_misc", "Services & Misc"),
        ("transfers_payments", "Transfers & Payments"),
        ("uncategorized", "Uncategorized"),
    ]

    account = models.ForeignKey(BankAccount, on_delete=models.CASCADE, related_name="transactions")
    transaction_date = models.DateField()
    value_date = models.DateField()
    description = models.TextField()
    cheque_number = models.CharField(max_length=50, blank=True, null=True)
    debit = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    credit = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    balance = models.DecimalField(max_digits=14, decimal_places=2)
    raw_reference = models.CharField(max_length=64, db_index=True)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default="uncategorized", db_index=True)
    category_confidence = models.FloatField(default=0.0)
    merchant_name = models.CharField(max_length=255, blank=True, default="")
    payment_channel = models.CharField(max_length=20, blank=True, default="")
    recipient_name = models.CharField(max_length=255, blank=True, default="")
    upi_handle = models.CharField(max_length=255, blank=True, default="")
    is_user_categorized = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-transaction_date", "-created_at"]
        unique_together = [("account", "raw_reference")]

    def __str__(self):
        return f"{self.transaction_date} {self.description[:40]}"
