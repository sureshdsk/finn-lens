from django.db import models
from banking.models import Transaction


class UserCategoryOverride(models.Model):
    transaction = models.ForeignKey(
        Transaction, on_delete=models.CASCADE, related_name="category_overrides"
    )
    original_category = models.CharField(max_length=30)
    new_category = models.CharField(max_length=30)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.transaction_id}: {self.original_category} -> {self.new_category}"
