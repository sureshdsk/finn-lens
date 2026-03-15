from django.contrib import admin
from .models import GmailAccount, SyncJob, EmailMessage, EmailSenderRule, ExtractedFinancialData


@admin.register(GmailAccount)
class GmailAccountAdmin(admin.ModelAdmin):
    list_display = ("email", "user", "is_active", "last_sync_at", "created_at")
    list_filter = ("is_active",)
    search_fields = ("email", "user__username")
    readonly_fields = ("refresh_token", "access_token", "created_at")


@admin.register(SyncJob)
class SyncJobAdmin(admin.ModelAdmin):
    list_display = ("id", "gmail_account", "status", "total_messages", "new_messages", "extracted_count", "started_at", "completed_at")
    list_filter = ("status",)
    readonly_fields = ("started_at",)


@admin.register(EmailMessage)
class EmailMessageAdmin(admin.ModelAdmin):
    list_display = ("sender", "subject_short", "source_type", "is_processed", "received_at")
    list_filter = ("source_type", "is_processed")
    search_fields = ("sender", "subject", "message_id")
    readonly_fields = ("created_at",)

    @admin.display(description="Subject")
    def subject_short(self, obj):
        return obj.subject[:80] if obj.subject else ""


@admin.register(EmailSenderRule)
class EmailSenderRuleAdmin(admin.ModelAdmin):
    list_display = ("sender_pattern", "source_type", "is_enabled", "gmail_account")
    list_filter = ("source_type", "is_enabled")
    search_fields = ("sender_pattern",)


@admin.register(ExtractedFinancialData)
class ExtractedFinancialDataAdmin(admin.ModelAdmin):
    list_display = ("id", "data_type", "confidence", "is_verified", "email_subject", "created_at")
    list_filter = ("data_type", "is_verified")
    readonly_fields = ("created_at",)

    @admin.display(description="Email Subject")
    def email_subject(self, obj):
        return obj.email.subject[:60] if obj.email else ""
