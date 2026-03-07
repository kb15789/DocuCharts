from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "DocuCharts API"
    app_version: str = "1.0.0"
    secret_key: str

    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str

    openai_api_key: str
    openai_model: str = "gpt-4o-mini"
    allowed_origins: str

    access_token_expire_minutes: int = 60 * 24

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
