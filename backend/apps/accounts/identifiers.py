from django.db import connection

USER_ID_SEQUENCE_NAME = "accounts_user_id_seq"
USER_ID_DIGITS = 10
USER_ID_PREFIX = "USR"
USER_ID_MAXIMUM = (10**USER_ID_DIGITS) - 1


def generate_user_id() -> str:
    """Return the next non-PII public user identifier from PostgreSQL."""
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT nextval(%s::regclass)",
            [USER_ID_SEQUENCE_NAME],
        )
        row = cursor.fetchone()

    if row is None:
        raise RuntimeError("PostgreSQL did not return a user ID sequence value.")

    sequence_value = int(row[0])
    if sequence_value > USER_ID_MAXIMUM:
        raise OverflowError("The AutoPharm user ID sequence is exhausted.")

    return f"{USER_ID_PREFIX}-{sequence_value:0{USER_ID_DIGITS}d}"
