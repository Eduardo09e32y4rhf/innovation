import os
import pytest

def test_config_raises_if_secret_key_missing():
    if "SECRET_KEY" in os.environ:
        del os.environ["SECRET_KEY"]

    with pytest.raises(Exception):
        from src.core.config import Settings
        Settings()

def test_config_loads_with_secret_key():
    os.environ["SECRET_KEY"] = "my_secret_key"
    try:
        from src.core.config import Settings
        Settings()
    except Exception as e:
        pytest.fail(f"Config failed to load with valid SECRET_KEY: {e}")
