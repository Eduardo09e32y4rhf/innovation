import sys
import time

try:
    import psycopg2
except ImportError:
    print("❌ ERROR: 'psycopg2' module not found.")
    print("Please run: pip install psycopg2-binary")
    sys.exit(1)

# Configuration from Metabase environment
# Use localhost because we are testing from the VPS host machine
DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "innovation_db"
DB_USER = "innovation"
DB_PASS = "secure_pass"

def test_connection():
    print(f"--- Testing Connectivity for Metabase (Enterprise Module) ---")
    print(f"Target: {DB_HOST}:{DB_PORT}")
    print(f"Database: {DB_NAME}")
    print(f"User: {DB_USER}")

    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASS,
            connect_timeout=5
        )
        print("\n✅ CONNECTION SUCCESSFUL!")

        cur = conn.cursor()
        print("\n--- Verifying Access to 'users' Table ---")
        try:
            cur.execute("SELECT count(*) FROM users;")
            result = cur.fetchone()
            if result:
                count = result[0]
                print(f"✅ Table 'users' is readable. Row count: {count}")
                print("🚀 Metabase should be able to connect and read data.")
            else:
                print("⚠️ Table 'users' exists but returned no count.")
        except Exception as e:
            print(f"❌ CONNECTION OK, BUT QUERY FAILED: {e}")
            print("Check if 'users' table exists and user has SELECT permissions.")
        finally:
            cur.close()
            conn.close()

    except psycopg2.OperationalError as e:
        print(f"\n❌ CONNECTION FAILED: {e}")
        print("\nTroubleshooting Tips:")
        print("1. Is the 'innovation_db' container running? (docker ps)")
        print("2. Is port 5432 exposed to localhost? Check your main docker-compose file.")
        print("   (Ensure 'ports: - \"5432:5432\"' is present for the db service)")
        print("3. Are the credentials correct? (User: innovation)")
        print("   (You may need to create the user: CREATE USER innovation WITH PASSWORD 'secure_pass';)")
        print("4. If testing from inside a container, use hostname 'innovation_db_v2'.")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_connection()
