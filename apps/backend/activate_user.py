import sqlite3
import os

db_path = r"c:\Users\eduar\Desktop\innovation.ia\backend\innovation_rh.db"
email = "eduardo998468@gmail.com"

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE users SET is_active = 1 WHERE email = ?;", (email,))
        conn.commit()
    finally:
        conn.close()
