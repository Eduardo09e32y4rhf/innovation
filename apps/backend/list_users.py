import sqlite3
import os

db_path = r"c:\Users\eduar\Desktop\innovation.ia\backend\innovation_rh.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT email, role FROM users LIMIT 10;")
        rows = cursor.fetchall()
        for row in rows:
            print(f"Email: {row[0]}, Role: {row[1]}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()
else:
    print(f"File not found: {db_path}")
