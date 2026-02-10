from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "SGP - Sistema de Gestión de Pedidos"
    API_V1_STR: str = "/api/v1"
    
    # SECURITY
    SECRET_KEY: str = "change-me-to-a-real-secret-key-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # DATABASE
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "password"
    POSTGRES_DB: str = "sgp_db"
    POSTGRES_PORT: str = "5432"
    
    # Constructed Database URL
    SQLALCHEMY_DATABASE_URI: Optional[str] = None

    def assemble_db_connection(self) -> str:
        if self.SQLALCHEMY_DATABASE_URI:
            return self.SQLALCHEMY_DATABASE_URI
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
