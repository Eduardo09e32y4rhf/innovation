import os
import pytest


def test_config_raises_if_secret_key_missing(monkeypatch):
    monkeypatch.delenv("SECRET_KEY", raising=False)

    with pytest.raises(Exception):
        from core.config import Settings

        Settings()


def test_config_loads_with_secret_key(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "my_secret_key")
    try:
        from core.config import Settings

        Settings()
    except Exception as e:
        pytest.fail(f"Config failed to load with valid SECRET_KEY: {e}")
