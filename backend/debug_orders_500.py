from sqlalchemy import select
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Order, User
from routers.orders import _o

def test():
    db = SessionLocal()
    try:
        # Try to query orders for a farmer
        # We need a farmer id.
        farmer = db.execute(select(User).where(User.role == 'farmer')).scalar_one_or_none()
        if not farmer:
            print("No farmer found in DB")
            return
            
        print(f"Testing for farmer: {farmer.name} (ID: {farmer.id})")
        res = db.execute(select(Order).where(Order.farmer_id == farmer.id))
        orders = res.scalars().all()
        print(f"Found {len(orders)} orders")
        for o in orders:
            try:
                data = _o(o)
                # print(data)
            except Exception as e:
                print(f"Error in _o(o) for order {o.id}: {e}")
                import traceback
                traceback.print_exc()
                
    except Exception as e:
        print(f"Query failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test()
