import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "src"))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from src.domain.models.user import User
from datetime import datetime, timedelta, timezone
from src.core.config import settings


def main():
    print(f"Conectando ao banco de dados: {settings.SQLALCHEMY_DATABASE_URI}")
    engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)

    with engine.begin() as conn:  # transaction context
        if "sqlite" in settings.SQLALCHEMY_DATABASE_URI:
            try:
                conn.execute(
                    text("ALTER TABLE users ADD COLUMN trial_expires_at DATETIME;")
                )
                print("Coluna trial_expires_at adicionada com sucesso no SQLite.")
            except Exception as e:
                print("Nota: Coluna pode já existir no SQLite.", e)
        else:
            try:
                conn.execute(
                    text(
                        "ALTER TABLE users ADD COLUMN trial_expires_at TIMESTAMP WITH TIME ZONE;"
                    )
                )
                print("Coluna trial_expires_at adicionada com sucesso no Postgres.")
            except Exception as e:
                # Postgres throws DuplicateColumn errors. We can ignore it if it exists.
                print("Nota: Coluna pode já existir no Postgres.", e)

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        users = db.query(User).all()
        now = datetime.now(timezone.utc)
        updated = 0
        for user in users:
            if user.trial_expires_at is None:
                user.trial_expires_at = now + timedelta(days=30)
                updated += 1

        db.commit()
        print(
            f"Total de {updated} usuários antigos atualizados com 30 dias de trial a partir de hoje."
        )
    except Exception as e:
        print(f"Erro ao atualizar usuários: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
