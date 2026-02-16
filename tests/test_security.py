from datetime import timedelta
from jose import jwt
from app.core.security import create_access_token, verify_password, get_password_hash, ALGORITHM
from app.core.config import settings


class TestPasswordHashing:
    def test_hash_and_verify(self):
        hashed = get_password_hash("mysecret")
        assert hashed != "mysecret"
        assert verify_password("mysecret", hashed)

    def test_wrong_password_fails(self):
        hashed = get_password_hash("correct")
        assert not verify_password("wrong", hashed)

    def test_different_hashes_for_same_password(self):
        h1 = get_password_hash("same")
        h2 = get_password_hash("same")
        assert h1 != h2  # bcrypt uses random salt


class TestJWT:
    def test_create_token_with_expiry(self):
        token = create_access_token("user-123", expires_delta=timedelta(minutes=5))
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        assert payload["sub"] == "user-123"
        assert "exp" in payload

    def test_create_token_default_expiry(self):
        token = create_access_token("user-456")
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        assert payload["sub"] == "user-456"
        assert "exp" in payload
