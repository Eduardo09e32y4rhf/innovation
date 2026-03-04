import os
import pytest
from pydantic import ValidationError


def test_config_raises_if_secret_key_missing(monkeypatch):
    monkeypatch.delenv("SECRET_KEY", raising=False)

    # Reload settings module to test validation
    import sys

    if "core.config" in sys.modules:
        del sys.modules["core.config"]

    with pytest.raises(ValidationError):
        from core.config import Settings

        Settings()


def test_config_loads_with_secret_key(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "my_secret_key")
    import sys

    if "core.config" in sys.modules:
        del sys.modules["core.config"]
    try:
        from core.config import Settings

        Settings()
    except Exception as e:
        pytest.fail(f"Config failed to load with valid SECRET_KEY: {e}")
