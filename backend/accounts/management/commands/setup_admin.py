from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from banking.models import Family

User = get_user_model()


class Command(BaseCommand):
    help = "Create an admin superuser and a Family record"

    def add_arguments(self, parser):
        parser.add_argument("--username", default="admin")
        parser.add_argument("--password", default="admin")
        parser.add_argument("--email", default="admin@example.com")
        parser.add_argument("--family", default="My Family")

    def handle(self, *args, **options):
        username = options["username"]
        password = options["password"]
        email = options["email"]
        family_name = options["family"]

        user, created = User.objects.get_or_create(
            username=username,
            defaults={"email": email, "is_staff": True, "is_superuser": True},
        )
        if created:
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f"Created superuser: {username}"))
        else:
            self.stdout.write(f"User already exists: {username}")

        family, fam_created = Family.objects.get_or_create(
            owner=user,
            defaults={"name": family_name},
        )
        if fam_created:
            self.stdout.write(
                self.style.SUCCESS(f"Created family: {family_name} (id={family.pk})")
            )
        else:
            self.stdout.write(f"Family already exists: {family.name} (id={family.pk})")

        self.stdout.write(self.style.SUCCESS("Setup complete."))
