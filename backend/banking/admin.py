from django.contrib import admin
from .models import Family, BankAccount, Transaction

admin.site.register(Family)
admin.site.register(BankAccount)
admin.site.register(Transaction)
