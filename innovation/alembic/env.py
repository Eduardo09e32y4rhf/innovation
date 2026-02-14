from __future__ import annotations

import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import create_engine, pool

# Alembic Config object
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Garante que a pasta do projeto (innovation/) esteja no sys.path
# este arquivo fica em: innovation/alembic/env.py
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.core.config import DATABASE_URL  # noqa: E402
from app.db.base import Base  # noqa: E402

# Importa models para registrar metadata
from app.models import user as _user  # noqa: F401,E402
from app.models import company as _company  # noqa: F401,E402
from app.models import plan as _plan  # noqa: F401,E402
from app.models import subscription as _subscription  # noqa: F401,E402
from app.models import job as _job  # noqa: F401,E402
from app.models import application as _application  # noqa: F401,E402
from app.models import application_status_history as _application_status_history  # noqa: F401,E402
from app.models import candidate as _candidate  # noqa: F401,E402
from app.models import document as _document  # noqa: F401,E402
from app.models import audit_log as _audit_log  # noqa: F401,E402
from app.models import two_factor_code as _two_factor_code  # noqa: F401,E402
from app.models import refresh_token as _refresh_token  # noqa: F401,E402
# Missing models added below
from app.models import finance as _finance  # noqa: F401,E402
from app.models import project as _project  # noqa: F401,E402
from app.models import task as _task  # noqa: F401,E402
from app.models import time_entry as _time_entry  # noqa: F401,E402
from app.models import leave_request as _leave_request  # noqa: F401,E402
from app.models import performance_review as _performance_review  # noqa: F401,E402
from app.models import ticket as _ticket  # noqa: F401,E402
from app.models import onboarding as _onboarding  # noqa: F401,E402
from app.models import compliance as _compliance  # noqa: F401,E402

target_metadata = Base.metadata



def run_migrations_offline() -> None:
    url = str(DATABASE_URL)
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        render_as_batch=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    url = str(DATABASE_URL)
    connect_args = {}
    if url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}

    connectable = create_engine(
        url,
        poolclass=pool.NullPool,
        connect_args=connect_args,
        future=True,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            render_as_batch=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
