from typing import TYPE_CHECKING, Any

from django.contrib.auth.base_user import BaseUserManager

from apps.accounts.identifiers import generate_user_id

if TYPE_CHECKING:
    from apps.accounts.models import User


class UserManager(BaseUserManager):
    """Create AutoPharm users with a mandatory hashed credential."""

    use_in_migrations = True

    def create_user(
        self,
        phone_number: str,
        credential: str,
        **extra_fields: Any,
    ) -> User:
        if not phone_number:
            raise ValueError("A phone number is required.")
        if not credential:
            raise ValueError("A credential is required.")

        email = extra_fields.get("email")
        extra_fields["email"] = self.normalize_email(email).lower() if email else None

        user = self.model(
            id=generate_user_id(),
            phone_number=phone_number,
            **extra_fields,
        )
        user.set_password(credential)
        user.full_clean()
        user.save(using=self._db)
        return user

    def create_superuser(self, *args: Any, **kwargs: Any) -> User:
        raise NotImplementedError(
            "Administrative roles are outside the authentication v1.1 increment."
        )
