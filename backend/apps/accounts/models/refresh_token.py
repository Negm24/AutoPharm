import uuid

from django.conf import settings
from django.db import models
from django.db.models import F, Q
from django.utils import timezone


class RefreshToken(models.Model):
    """A hashed, rotating AutoDoc refresh token."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="refresh_tokens",
    )
    token_hash = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    revoked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    user_agent = models.CharField(max_length=512, blank=True, default="")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    replaced_by = models.OneToOneField(
        "self",
        on_delete=models.SET_NULL,
        related_name="replaces",
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "refresh_tokens"
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["user", "expires_at"],
                name="refresh_user_exp_idx",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(expires_at__gt=F("created_at")),
                name="refresh_expiry_after_creation",
            ),
            models.CheckConstraint(
                condition=Q(revoked_at__isnull=True) | Q(revoked_at__gte=F("created_at")),
                name="refresh_revoked_after_creation",
            ),
            models.CheckConstraint(
                condition=Q(replaced_by__isnull=True) | Q(revoked_at__isnull=False),
                name="refresh_replacement_is_revoked",
            ),
            models.CheckConstraint(
                condition=~Q(id=F("replaced_by_id")),
                name="refresh_cannot_replace_itself",
            ),
        ]

    @property
    def is_expired(self) -> bool:
        return self.expires_at <= timezone.now()

    @property
    def is_revoked(self) -> bool:
        return self.revoked_at is not None

    @property
    def is_active(self) -> bool:
        return not self.is_expired and not self.is_revoked

    def __str__(self) -> str:
        return str(self.id)
