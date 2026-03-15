from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Family(models.Model):
    name = models.CharField(max_length=255)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="families")
    cardholder_name = models.CharField(max_length=255, blank=True, default="")
    cardholder_dob = models.DateField(null=True, blank=True)
    cardholder_pan = models.CharField(max_length=10, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "families"

    def __str__(self):
        return self.name

    def get_cc_statement_password(self, issuer: str) -> str | None:
        """Generate the PDF password for CC statements based on issuer format."""
        if not self.cardholder_name or not self.cardholder_dob:
            return None
        name_part = self.cardholder_name.strip().split()[0][:4]
        ddmm = self.cardholder_dob.strftime("%d%m")
        if issuer in ("AXIS", "HDFC"):
            return name_part.upper() + ddmm
        # ICICI, SBI, and most others use lowercase
        return name_part.lower() + ddmm


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


class CreditCard(models.Model):
    ISSUER_CHOICES = [
        ("HDFC", "HDFC Bank"),
        ("ICICI", "ICICI Bank"),
        ("AXIS", "Axis Bank"),
        ("SBI", "SBI Card"),
        ("KOTAK", "Kotak Mahindra"),
        ("INDUSIND", "IndusInd Bank"),
        ("RBL", "RBL Bank"),
        ("YES", "Yes Bank"),
        ("AMEX", "American Express"),
        ("CITI", "Citibank"),
        ("SC", "Standard Chartered"),
        ("HSBC", "HSBC"),
        ("OTHER", "Other"),
    ]

    family = models.ForeignKey(Family, on_delete=models.CASCADE, related_name="credit_cards")
    issuer = models.CharField(max_length=20, choices=ISSUER_CHOICES)
    card_last4 = models.CharField(max_length=4, db_index=True)
    card_name = models.CharField(max_length=255, blank=True, default="")
    billing_day = models.PositiveSmallIntegerField(null=True, blank=True)
    credit_limit = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, default="INR")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("family", "issuer", "card_last4")]

    def __str__(self):
        return f"{self.issuer} **{self.card_last4}"


class CreditCardBill(models.Model):
    card = models.ForeignKey(CreditCard, on_delete=models.CASCADE, related_name="bills")
    statement_date = models.DateField()
    due_date = models.DateField(null=True, blank=True)
    total_due = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    min_due = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    billing_period_start = models.DateField(null=True, blank=True)
    billing_period_end = models.DateField(null=True, blank=True)
    is_paid = models.BooleanField(default=False)
    source_email = models.ForeignKey(
        "gmail.EmailMessage", on_delete=models.SET_NULL, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("card", "statement_date")]
        ordering = ["-statement_date"]

    def __str__(self):
        return f"{self.card} — {self.statement_date}"


class CreditCardTransaction(models.Model):
    CATEGORY_CHOICES = Transaction.CATEGORY_CHOICES
    SOURCE_TYPE_CHOICES = [
        ("alert", "Email Alert"),
        ("statement", "Statement"),
        ("manual", "Manual"),
    ]

    card = models.ForeignKey(CreditCard, on_delete=models.CASCADE, related_name="transactions")
    bill = models.ForeignKey(CreditCardBill, on_delete=models.SET_NULL, null=True, blank=True, related_name="transactions")
    transaction_date = models.DateField()
    transaction_time = models.TimeField(null=True, blank=True)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=3, default="INR")
    description = models.TextField()
    merchant_name = models.CharField(max_length=255, blank=True, default="")
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default="uncategorized", db_index=True)
    category_confidence = models.FloatField(default=0.0)
    is_user_categorized = models.BooleanField(default=False)
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPE_CHOICES, default="alert")
    dedup_hash = models.CharField(max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-transaction_date", "-created_at"]

    def __str__(self):
        return f"{self.transaction_date} {self.description[:40]}"
