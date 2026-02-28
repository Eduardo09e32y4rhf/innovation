import sqlite3
from datetime import datetime, timedelta, timezone

db_path = "innovation_rh.db"

conn = sqlite3.connect(db_path)
cur = conn.cursor()

try:
    cur.execute("ALTER TABLE users ADD COLUMN trial_expires_at DATETIME;")
    print("Coluna trial_expires_at adicionada com sucesso no SQLite.")
except sqlite3.OperationalError as e:
    print("Nota: Coluna pode já existir no SQLite.", e)

now = datetime.now(timezone.utc)
expires = now + timedelta(days=30)
# Formato que SQLAlchemy costuma usar: YYYY-MM-DD HH:MM:SS.ffffff
expires_str = expires.strftime("%Y-%m-%d %H:%M:%S.%f")

cur.execute("UPDATE users SET trial_expires_at = ? WHERE trial_expires_at IS NULL", (expires_str,))
updated = cur.rowcount
conn.commit()
conn.close()

print(f"Total de {updated} usuários antigos atualizados com 30 dias de trial a partir de hoje.")
