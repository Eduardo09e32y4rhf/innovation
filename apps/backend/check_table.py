import sqlite3
import os

db_path = r"c:\Users\eduar\Desktop\innovation.ia\backend\innovation_rh.db"

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("PRAGMA table_info(users);")
        columns = cursor.fetchall()
        for col in columns:
            print(col)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()
else:
    print(f"File not found: {db_path}")
