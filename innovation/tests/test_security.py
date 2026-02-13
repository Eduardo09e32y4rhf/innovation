import sys
from unittest.mock import patch, MagicMock
import pytest

# We import the function under test.
# Note: app.core.security must be importable.
from app.core.security import verify_temporary_token

@pytest.fixture
def mock_jwt():
    """Fixture to mock the jwt object within the app.core.security module."""
    with patch('app.core.security.jwt') as mock_jwt_obj:
        yield mock_jwt_obj

@pytest.fixture(autouse=True)
def mock_settings():
    """Fixture to mock settings used in security module."""
    # Patch the global variables in app.core.security module
    with patch('app.core.security.SECRET_KEY', 'test_secret'), \
         patch('app.core.security.ALGORITHM', 'HS256'):
        yield

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
