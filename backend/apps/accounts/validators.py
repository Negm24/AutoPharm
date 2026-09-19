from datetime import date

import phonenumbers
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


def validate_e164_phone_number(value: str) -> None:
    """Require a valid international phone number in canonical E.164 form."""
    try:
        parsed_number = phonenumbers.parse(value, None)
    except phonenumbers.NumberParseException as error:
        raise ValidationError(
            _("Enter a valid phone number in E.164 format."),
            code="invalid_phone_number",
        ) from error

    canonical_number = phonenumbers.format_number(
        parsed_number,
        phonenumbers.PhoneNumberFormat.E164,
    )
    if not phonenumbers.is_valid_number(parsed_number) or canonical_number != value:
        raise ValidationError(
            _("Enter a valid phone number in E.164 format."),
            code="invalid_phone_number",
        )


def validate_date_not_in_future(value: date) -> None:
    if value > timezone.localdate():
        raise ValidationError(
            _("Date of birth cannot be in the future."),
            code="future_date_of_birth",
        )
