import os
import json
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from pywebpush import webpush, WebPushException

from database import get_db, SessionLocal
from models import PushSubscription, User
from utils import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

# Load VAPID keys from environment
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY")
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY")
VAPID_CLAIMS = {"sub": "mailto:admin@agridirect.com"}

class PushKeys(BaseModel):
    p256dh: str
    auth: str

class PushSubscriptionSchema(BaseModel):
    endpoint: str
    keys: PushKeys

@router.get("/vapid-public-key")
def get_vapid_public_key():
    if not VAPID_PUBLIC_KEY:
        raise HTTPException(500, "VAPID public key not configured in .env")
    return {"publicKey": VAPID_PUBLIC_KEY}

@router.post("/subscribe")
def subscribe(subscription: PushSubscriptionSchema, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    # Check if this specific endpoint already exists for this user
    existing = db.query(PushSubscription).filter(
        PushSubscription.user_id == user.id,
        PushSubscription.endpoint == subscription.endpoint
    ).first()
    
    if existing:
        existing.p256dh = subscription.keys.p256dh
        existing.auth = subscription.keys.auth
    else:
        new_sub = PushSubscription(
            user_id=user.id,
            endpoint=subscription.endpoint,
            p256dh=subscription.keys.p256dh,
            auth=subscription.keys.auth
        )
        db.add(new_sub)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving subscription: {e}")
        raise HTTPException(500, "Failed to save subscription")
        
    return {"success": True, "message": "Subscribed successfully"}

@router.post("/unsubscribe")
def unsubscribe(subscription: PushSubscriptionSchema, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.query(PushSubscription).filter(
        PushSubscription.user_id == user.id,
        PushSubscription.endpoint == subscription.endpoint
    ).delete()
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting subscription: {e}")
        raise HTTPException(500, "Failed to unsubscribe")
        
    return {"success": True, "message": "Unsubscribed successfully"}

def send_push_notification(user_id: int, message: str, title: str = "AgriDirect", link: Optional[str] = None):
    """
    Utility function to send push notifications to all registered devices of a user.
    Can be called from anywhere in the background.
    """
    db = SessionLocal()
    try:
        subs = db.query(PushSubscription).filter(PushSubscription.user_id == user_id).all()
        if not subs:
            return

        payload = {
            "title": title,
            "body": message,
            "icon": "/logo192.png", # Relative to host
            "badge": "/badge.png",
            "data": {
                "url": link or "/"
            }
        }
        
        for sub in subs:
            try:
                webpush(
                    subscription_info={
                        "endpoint": sub.endpoint,
                        "keys": {
                            "p256dh": sub.p256dh,
                            "auth": sub.auth
                        }
                    },
                    data=json.dumps(payload),
                    vapid_private_key=VAPID_PRIVATE_KEY,
                    vapid_claims=VAPID_CLAIMS
                )
            except WebPushException as ex:
                logger.warning(f"Web Push Error for user {user_id}: {ex}")
                # If subscription is expired or invalid, remove it
                if ex.response and ex.response.status_code in (404, 410):
                    db.delete(sub)
                    db.commit()
            except Exception as ex:
                logger.error(f"Unexpected push error: {ex}")
                
    finally:
        db.close()
