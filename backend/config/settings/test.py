"""Settings for automated AutoPharm tests."""

from copy import deepcopy

from .base import *  # noqa: F403
from .base import DATABASES as BASE_DATABASES

DEBUG = False

ALLOWED_HOSTS = ["testserver", "localhost"]

DATABASES = deepcopy(BASE_DATABASES)
DATABASES["default"]["CONN_MAX_AGE"] = 0