from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ✅ CORRETO
from app.db.session import Base
from app.models.user import User
from app.models.company import Company

target_metadata = Base.metadata
