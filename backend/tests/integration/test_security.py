import sys
from unittest.mock import patch, MagicMock
import pytest

# Mock necessary modules if they are not installed in the environment.
# This allows importing the security module for testing purposes in environments
# where dependencies are not fully installed.
if "jose" not in sys.modules:
    sys.modules["jose"] = MagicMock()
if "bcrypt" not in sys.modules:
    sys.modules["bcrypt"] = MagicMock()
if "pydantic_settings" not in sys.modules:
    sys.modules["pydantic_settings"] = MagicMock()

# Mock app.core.config to avoid its internal dependencies and environment requirements.
mock_config = MagicMock()
mock_config.SECRET_KEY = "test_secret"
mock_config.ALGORITHM = "HS256"
sys.modules["app.core.config"] = mock_config

# Now we can import the function under test
from app.core.security import verify_temporary_token


@pytest.fixture
def mock_jwt():
    """Fixture to mock the jwt object within the app.core.security module."""
    with patch("app.core.security.jwt") as mock_jwt_obj, patch(
        "app.core.security.SECRET_KEY", "test_secret"
    ), patch("app.core.security.ALGORITHM", "HS256"):
        yield mock_jwt_obj


def test_verify_temporary_token_success(mock_jwt):
    """Test successful verification of a valid temporary token."""
    mock_jwt.decode.return_value = {"sub": "123", "type": "temporary_2fa"}
    token = "valid_token"

    result = verify_temporary_token(token)

    assert result == 123
    mock_jwt.decode.assert_called_once_with(token, "test_secret", algorithms=["HS256"])


def test_verify_temporary_token_wrong_type(mock_jwt):
    """Test that a token with the wrong type returns None."""
    mock_jwt.decode.return_value = {"sub": "123", "type": "access"}

    result = verify_temporary_token("wrong_type_token")

    assert result is None


def test_verify_temporary_token_decode_error(mock_jwt):
    """Test that any decoding error returns None."""
    mock_jwt.decode.side_effect = Exception("JWT Decode Error")

    result = verify_temporary_token("invalid_token")

    assert result is None


def test_verify_temporary_token_missing_sub(mock_jwt):
    """Test that a token missing the 'sub' claim returns None."""
    mock_jwt.decode.return_value = {"type": "temporary_2fa"}

    result = verify_temporary_token("missing_sub_token")

    assert result is None


def test_verify_temporary_token_invalid_sub_format(mock_jwt):
    """Test that a token with a non-integer 'sub' claim returns None."""
    mock_jwt.decode.return_value = {"sub": "not-an-integer", "type": "temporary_2fa"}

    result = verify_temporary_token("invalid_sub_token")

    assert result is None
