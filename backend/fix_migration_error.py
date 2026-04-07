import sqlite3
import shutil
import os

db_path = 'backend/agridirect.db'
if not os.path.exists(db_path):
    db_path = 'agridirect.db'

def fix_data():
    print(f"Backing up {db_path} to agridirect.db.bak...")
    shutil.copy2(db_path, f"{db_path}.bak")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Disable foreign keys during table manipulation
        cursor.execute("PRAGMA foreign_keys=OFF")
        
        # 1. Rename existing misaligned orders table
        print("Renaming 'orders' to 'orders_misaligned'...")
        cursor.execute("DROP TABLE IF EXISTS orders_misaligned")
        cursor.execute("ALTER TABLE orders RENAME TO orders_misaligned")
        
        # 2. Create the fixed orders table with the correct column order (from models.py)
        print("Creating fixed 'orders' table...")
        cursor.execute("""
            CREATE TABLE orders (
                id INTEGER PRIMARY KEY,
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
                FOREIGN KEY(customer_id) REFERENCES users (id) ON DELETE SET NULL,
                FOREIGN KEY(farmer_id) REFERENCES users (id) ON DELETE SET NULL
            )
        """)
        
        # 3. Explicitly map columns from misaligned table to fixed table
        # Identification based on previous misalignment:
        # Source Column (Misaligned) -> Data Item -> Destination Column (Fixed)
        # ----------------------------------------------------------------------
        # delivery_date    (contains) status_history
        # status_history    (contains) razorpay_order_id
        # razorpay_order_id (contains) razorpay_payment_id
        # razorpay_payment_id (contains) reviewed
        # reviewed          (contains) created_at
        # created_at        (contains) updated_at
        # updated_at        (contains) delivery_date
        
        print("Restoring data with fixed column mapping...")
        cursor.execute("""
            INSERT INTO orders (
                id, customer_id, farmer_id, status, delivery_method, payment_method, 
                payment_status, subtotal, delivery_charge, total, delivery_address, 
                delivery_date, status_history, razorpay_order_id, razorpay_payment_id, 
                reviewed, created_at, updated_at, slot_id
            )
            SELECT 
                id, customer_id, farmer_id, status, delivery_method, payment_method, 
                payment_status, subtotal, delivery_charge, total, delivery_address, 
                updated_at, delivery_date, status_history, razorpay_order_id, 
                razorpay_payment_id, reviewed, created_at, slot_id
            FROM orders_misaligned
        """)
        
        # 4. Success - drop the misaligned table
        cursor.execute("DROP TABLE orders_misaligned")
        
        conn.commit()
        print("Migration corrected successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"Fix failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        cursor.execute("PRAGMA foreign_keys=ON")
        conn.close()

if __name__ == "__main__":
    fix_data()
