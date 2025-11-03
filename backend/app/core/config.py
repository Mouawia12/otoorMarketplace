from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET: str
    JWT_EXPIRES: int = 86400
    JWT_ALGORITHM: str = "HS256"
    ENV: str = "dev"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:5000"
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 5242880
    ALLOWED_EXTENSIONS: str = "jpg,jpeg,png,webp"
    AUTHENTICITY_FEE: float = 50.00
    COMMISSION_NEW: float = 10.0
    COMMISSION_USED: float = 5.0
    COMMISSION_AUCTION: float = 5.0
    
    class Config:
        env_file = ".env"
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    @property
    def allowed_extensions_list(self) -> List[str]:
        return [ext.strip() for ext in self.ALLOWED_EXTENSIONS.split(",")]


settings = Settings()
