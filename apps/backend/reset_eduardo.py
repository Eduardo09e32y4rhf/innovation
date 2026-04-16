import sqlite3
import os
import bcrypt

# Configurações
db_path = r"c:\Users\eduar\Desktop\innovation.ia\backend\innovation_rh.db"
email = "eduardo998468@gmail.com"
new_password = "senha123"


def get_password_hash(password: str) -> str:
    hashed_bytes = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    return hashed_bytes.decode("utf-8")


if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        new_hash = get_password_hash(new_password)
        cursor.execute(
            "UPDATE users SET hashed_password = ? WHERE email = ?;", (new_hash, email)
        )
        if cursor.rowcount > 0:
            conn.commit()
            print(f"Senha atualizada com sucesso para {email}!")
            print(f"Senha nova: {new_password}")
        else:
            print(f"Usuário {email} não encontrado no banco de dados.")
    except Exception as e:
        print(f"Erro ao atualizar senha: {e}")
    finally:
        conn.close()
else:
    print(f"Arquivo de banco de dados não encontrado: {db_path}")
