import sqlite3
import os

db_path = 'agridirect.db'
if not os.path.exists(db_path):
    print("Error: agridirect.db not found.")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    for table in ['orders', 'reviews', 'products']:
        print(f"--- Schema for {table} ---")
        cursor.execute(f"SELECT sql FROM sqlite_master WHERE type='table' AND name='{table}'")
        res = cursor.fetchone()
        if res:
            print(res[0])
        else:
            print(f"Table {table} not found.")
    conn.close()
