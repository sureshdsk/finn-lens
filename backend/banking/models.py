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

    def get_bank_statement_password(self, bank_code: str) -> str | None:
        """Generate PDF password for bank account e-statements.

        ICICI: lowercase first 4 chars of name + DDMM of DOB (same as CC).
        Override per-bank as needed.
        """
        if not self.cardholder_name or not self.cardholder_dob:
            return None
        name_part = self.cardholder_name.strip().split()[0][:4]
        ddmm = self.cardholder_dob.strftime("%d%m")
        if bank_code in ("ICICI",):
            return name_part.lower() + ddmm
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
    unified_transaction = models.ForeignKey(
        "UnifiedTransaction", on_delete=models.SET_NULL, null=True, blank=True, related_name="bank_transactions"
    )
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


class UnifiedTransaction(models.Model):
    """One row per real-world financial event, regardless of source count."""

    INSTRUMENT_CHOICES = [
        ("bank_debit", "Bank Debit"),
        ("bank_credit", "Bank Credit"),
        ("credit_card", "Credit Card"),
        ("upi", "UPI"),
        ("unknown", "Unknown"),
    ]
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

    family = models.ForeignKey(Family, on_delete=models.CASCADE, related_name="unified_transactions")
    transaction_date = models.DateField(db_index=True)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=3, default="INR")
    merchant_name = models.CharField(max_length=255, blank=True, default="")
    description = models.TextField(blank=True, default="")
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default="uncategorized", db_index=True)
    category_confidence = models.FloatField(default=0.0)
    is_user_categorized = models.BooleanField(default=False)
    instrument_type = models.CharField(max_length=20, choices=INSTRUMENT_CHOICES, default="unknown")
    bank_account = models.ForeignKey(
        BankAccount, on_delete=models.SET_NULL, null=True, blank=True, related_name="unified_transactions"
    )
    credit_card = models.ForeignKey(
        "CreditCard", on_delete=models.SET_NULL, null=True, blank=True, related_name="unified_transactions"
    )
    dedup_key = models.CharField(max_length=128, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-transaction_date", "-created_at"]
        indexes = [
            models.Index(fields=["family", "transaction_date"]),
            models.Index(fields=["family", "category"]),
        ]

    def __str__(self):
        return f"{self.transaction_date} {self.merchant_name or self.description[:40]} {self.amount}"


class TransactionSource(models.Model):
    """Evidence/provenance — each row is one source confirming a UnifiedTransaction."""

    SOURCE_TYPE_CHOICES = [
        ("bank_statement", "Bank Statement"),
        ("cc_alert_email", "CC Alert Email"),
        ("cc_statement_pdf", "CC Statement PDF"),
        ("subscription_email", "Subscription Email"),
        ("ecommerce_email", "E-commerce Email"),
        ("bill_email", "Bill Email"),
        ("manual", "Manual Entry"),
    ]

    unified_transaction = models.ForeignKey(
        UnifiedTransaction, on_delete=models.CASCADE, related_name="sources"
    )
    source_type = models.CharField(max_length=30, choices=SOURCE_TYPE_CHOICES)
    bank_transaction = models.ForeignKey(
        "Transaction", on_delete=models.SET_NULL, null=True, blank=True, related_name="unified_sources"
    )
    cc_transaction = models.ForeignKey(
        "CreditCardTransaction", on_delete=models.SET_NULL, null=True, blank=True, related_name="unified_sources"
    )
    extracted_data = models.ForeignKey(
        "gmail.ExtractedFinancialData", on_delete=models.SET_NULL, null=True, blank=True
    )
    email = models.ForeignKey(
        "gmail.EmailMessage", on_delete=models.SET_NULL, null=True, blank=True
    )
    raw_description = models.TextField(blank=True, default="")
    raw_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    raw_currency = models.CharField(max_length=3, blank=True, default="")
    priority = models.PositiveSmallIntegerField(default=50)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-priority", "-created_at"]

    def __str__(self):
        return f"{self.source_type} → {self.unified_transaction_id}"


class Subscription(models.Model):
    CATEGORY_CHOICES = [
        ("streaming", "Streaming"),
        ("music", "Music"),
        ("cloud", "Cloud Storage"),
        ("productivity", "Productivity"),
        ("utilities", "Utilities"),
        ("insurance", "Insurance"),
        ("gaming", "Gaming"),
        ("news", "News"),
        ("fitness", "Fitness"),
        ("education", "Education"),
        ("finance", "Finance"),
        ("shopping", "Shopping"),
        ("entertainment", "Entertainment"),
        ("other", "Other"),
    ]
    CYCLE_CHOICES = [("monthly", "Monthly"), ("yearly", "Yearly")]
    STATUS_CHOICES = [
        ("active", "Active"),
        ("cancelled", "Cancelled"),
        ("paused", "Paused"),
    ]
    SOURCE_CHOICES = [
        ("bank_txn", "Bank Transaction"),
        ("cc_txn", "Credit Card Transaction"),
        ("email", "Email"),
        ("manual", "Manual"),
    ]

    family = models.ForeignKey(Family, on_delete=models.CASCADE, related_name="subscriptions")
    name = models.CharField(max_length=255)
    merchant_pattern = models.CharField(max_length=255, db_index=True)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default="other")
    cost = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=3, default="INR")
    cycle = models.CharField(max_length=10, choices=CYCLE_CHOICES, default="monthly")
    next_renewal_date = models.DateField(null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    last_billed_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    auto_renew = models.BooleanField(default=True)
    icon = models.CharField(max_length=10, blank=True, default="")
    color = models.CharField(max_length=50, blank=True, default="")
    description = models.CharField(max_length=500, blank=True, default="")
    plan = models.CharField(max_length=100, blank=True, default="")
    payment_method = models.CharField(max_length=100, blank=True, default="")
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default="manual")
    confidence = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("family", "merchant_pattern", "cycle")]
        ordering = ["-last_billed_date"]

    def __str__(self):
        return f"{self.name} ({self.cycle})"


class SubscriptionPayment(models.Model):
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    payment_date = models.DateField()
    unified_transaction = models.ForeignKey(
        UnifiedTransaction, on_delete=models.SET_NULL, null=True, blank=True, related_name="subscription_payments"
    )
    # Legacy FKs — kept for backward compat during migration
    bank_transaction = models.ForeignKey(
        Transaction, on_delete=models.SET_NULL, null=True, blank=True
    )
    cc_transaction = models.ForeignKey(
        "CreditCardTransaction", on_delete=models.SET_NULL, null=True, blank=True
    )
    source_email = models.ForeignKey(
        "gmail.EmailMessage", on_delete=models.SET_NULL, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-payment_date"]

    def __str__(self):
        return f"{self.subscription.name} — {self.payment_date} — {self.amount}"


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
    payment_bank_transaction = models.ForeignKey(
        Transaction, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="cc_bill_payments",
        help_text="The bank statement debit that paid this CC bill",
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
    unified_transaction = models.ForeignKey(
        UnifiedTransaction, on_delete=models.SET_NULL, null=True, blank=True, related_name="cc_transactions"
    )
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
