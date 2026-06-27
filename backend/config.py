from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str
    neo4j_uri: str
    neo4j_username: str
    neo4j_password: str
    neo4j_database: str = "neo4j"

    model_config = {"env_file": ".env"}


settings = Settings()
