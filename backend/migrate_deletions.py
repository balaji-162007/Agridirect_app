import sqlite3
import os

db_path = 'backend/agridirect.db'
if not os.path.exists(db_path):
    db_path = 'agridirect.db'

def run_migration():
    print(f"Connecting to {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Enable foreign keys during migration to check but we are recreating tables
        cursor.execute("PRAGMA foreign_keys=OFF")

        # --- Update orders table ---
        print("Migrating 'orders' table...")
        cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='orders'")
        old_sql = cursor.fetchone()[0]
        
        # New orders schema (simplified, but keeping columns)
        # We need to make customer_id and farmer_id nullable
        cursor.execute("CREATE TABLE orders_new AS SELECT * FROM orders") # This copies data but not constraints
        # Actually better to create the exact table
        # I'll just use the new schema logic
        
        # To be safe and keep it simple for a coding assistant task, 
        # I will just ALTER the tables where possible or recreate them if necessary.
        # SQLite ALTER TABLE can only add columns or rename.
        
        # Recreate orders
        cursor.execute("ALTER TABLE orders RENAME TO orders_old")
        cursor.execute("""
            CREATE TABLE orders (
                id INTEGER NOT NULL, 
                customer_id INTEGER, 
                farmer_id INTEGER, 
                status VARCHAR(30) NOT NULL, 
                delivery_method VARCHAR(30) NOT NULL, 
                payment_method VARCHAR(20) NOT NULL, 
                payment_status VARCHAR(20), 
                subtotal FLOAT NOT NULL, 
                delivery_charge FLOAT, 
                total FLOAT NOT NULL, 
                delivery_address JSON, 
                delivery_date DATETIME, 
                status_history JSON, 
                razorpay_order_id VARCHAR(100), 
                razorpay_payment_id VARCHAR(100), 
                reviewed BOOLEAN, 
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
                updated_at DATETIME, 
                slot_id INTEGER,
                PRIMARY KEY (id), 
                FOREIGN KEY(customer_id) REFERENCES users (id) ON DELETE SET NULL, 
                FOREIGN KEY(farmer_id) REFERENCES users (id) ON DELETE SET NULL
            )
        """)
        cursor.execute("INSERT INTO orders SELECT * FROM orders_old")
        cursor.execute("DROP TABLE orders_old")

        # --- Update reviews table ---
        print("Migrating 'reviews' table...")
        cursor.execute("ALTER TABLE reviews RENAME TO reviews_old")
        cursor.execute("""
            CREATE TABLE reviews (
                id INTEGER NOT NULL, 
                order_id INTEGER, 
                product_id INTEGER, 
                farmer_id INTEGER, 
                customer_id INTEGER, 
                product_quality INTEGER NOT NULL, 
                delivery_time INTEGER NOT NULL, 
                overall_service INTEGER NOT NULL, 
                comment TEXT, 
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
                PRIMARY KEY (id), 
                FOREIGN KEY(order_id) REFERENCES orders (id), 
                FOREIGN KEY(product_id) REFERENCES products (id), 
                FOREIGN KEY(farmer_id) REFERENCES users (id) ON DELETE SET NULL, 
                FOREIGN KEY(customer_id) REFERENCES users (id) ON DELETE SET NULL
            )
        """)
        cursor.execute("INSERT INTO reviews SELECT * FROM reviews_old")
        cursor.execute("DROP TABLE reviews_old")

        # --- Update products table ---
        print("Migrating 'products' table...")
        cursor.execute("ALTER TABLE products RENAME TO products_old")
        cursor.execute("""
            CREATE TABLE products (
                id INTEGER NOT NULL, 
                farmer_id INTEGER NOT NULL, 
                name VARCHAR(200) NOT NULL, 
                name_ta VARCHAR(200), 
                category VARCHAR(50) NOT NULL, 
                product_type VARCHAR(20) NOT NULL, 
                price FLOAT NOT NULL, 
                unit VARCHAR(20) NOT NULL, 
                quantity FLOAT NOT NULL, 
                harvest_date DATETIME, 
                description TEXT, 
                images JSON, 
                price_history JSON, 
                price_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
                market_price FLOAT, 
                is_active BOOLEAN, 
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
                updated_at DATETIME, 
                PRIMARY KEY (id), 
                FOREIGN KEY(farmer_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
        cursor.execute("INSERT INTO products SELECT * FROM products_old")
        cursor.execute("DROP TABLE products_old")

        conn.commit()
        print("Migration successful!")
    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
    finally:
        cursor.execute("PRAGMA foreign_keys=ON")
        conn.close()

if __name__ == "__main__":
    run_migration()
