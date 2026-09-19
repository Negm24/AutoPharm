from typing import Any

import phonenumbers
from django.contrib.auth.base_user import AbstractBaseUser
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import models
from django.db.models.functions import Lower
from django.utils.translation import gettext_lazy as _

from apps.accounts.managers import UserManager
from apps.accounts.validators import validate_date_not_in_future, validate_e164_phone_number


class CredentialKind(models.TextChoices):
    PIN = "PIN", _("PIN")
    PASSWORD = "PASSWORD", _("Password")


class User(AbstractBaseUser):
    """The base human identity shared by the kiosk and AutoDoc."""

    last_login = None

    id = models.CharField(
        primary_key=True,
        max_length=14,
        editable=False,
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone_number = models.CharField(
        max_length=16,
        unique=True,
        validators=[validate_e164_phone_number],
    )
    phone_country_code = models.CharField(
        max_length=2,
        validators=[
            RegexValidator(
                regex=r"^[A-Z]{2}$",
                message=_("Use a two-letter uppercase ISO country code."),
                code="invalid_country_code",
            )
        ],
    )
    date_of_birth = models.DateField(validators=[validate_date_not_in_future])
    password = models.CharField(
        _("credential hash"),
        max_length=255,
        db_column="credential_hash",
    )
    credential_kind = models.CharField(max_length=10, choices=CredentialKind)
    email = models.EmailField(max_length=254, null=True, blank=True)
    is_disabled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = "phone_number"
    REQUIRED_FIELDS = [
        "first_name",
        "last_name",
        "phone_country_code",
        "date_of_birth",
        "credential_kind",
    ]

    class Meta:
        db_table = "users"
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(id=""),
                name="users_id_not_empty",
            ),
            models.CheckConstraint(
                condition=~models.Q(password=""),
                name="users_credential_hash_not_empty",
            ),
            models.CheckConstraint(
                condition=models.Q(credential_kind__in=CredentialKind.values),
                name="users_credential_kind_valid",
            ),
            models.UniqueConstraint(
                Lower("email"),
                condition=models.Q(email__isnull=False),
                name="users_email_ci_unique",
            ),
        ]

    def clean(self) -> None:
        super().clean()

        if self.email:
            self.email = self.email.strip().lower()

        self.phone_country_code = self.phone_country_code.upper()
        try:
            parsed_number = phonenumbers.parse(self.phone_number, None)
        except phonenumbers.NumberParseException:
            return

        detected_region = phonenumbers.region_code_for_number(parsed_number)
        if detected_region and detected_region != self.phone_country_code:
            raise ValidationError(
                {
                    "phone_country_code": _(
                        "The country code does not match the phone number."
                    )
                }
            )

    @property
    def credential_hash(self) -> str:
        return self.password

    @property
    def is_active(self) -> bool:
        return not self.is_disabled

    @property
    def is_staff(self) -> bool:
        return False

    def set_unusable_password(self) -> None:
        raise ValueError("Every AutoPharm user must have a usable credential.")

    def get_full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    def get_short_name(self) -> str:
        return self.first_name

    def has_perm(self, perm: str, obj: Any | None = None) -> bool:
        return False

    def has_module_perms(self, app_label: str) -> bool:
        return False

    def __str__(self) -> str:
        return f"{self.id} - {self.get_full_name()}"
