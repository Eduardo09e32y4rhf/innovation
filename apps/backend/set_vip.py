import sqlite3
import os

db_path = r"c:\Users\eduar\Desktop\innovation.ia\backend\innovation_rh.db"
email = "eduardo998468@gmail.com"

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        # Define status ativo e plano enterprise gratuito/dono para evitar cobranças
        cursor.execute("""
            UPDATE users 
            SET subscription_status = 'active', 
                subscription_plan = 'enterprise',
                role = 'company'
            WHERE email = ?;
        """, (email,))
        
        if cursor.rowcount > 0:
            conn.commit()
            print(f"Acesso VIP liberado para {email} (Dono/Dono).")
        else:
            print(f"Usuário {email} não encontrado.")
    except Exception as e:
        print(f"Erro ao atualizar privilégios: {e}")
    finally:
        conn.close()
else:
    print(f"Banco não encontrado: {db_path}")
