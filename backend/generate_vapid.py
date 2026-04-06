import os
from pywebpush import vapid_keys

env_path = "d:/farmer app with sql/backend/.env"
if os.path.exists(env_path):
    with open(env_path, "r") as f:
        content = f.read()
    
    if "VAPID_PUBLIC_KEY" not in content:
        print("Generating VAPID keys...")
        keys = vapid_keys()
        public_key = keys["public_key"]
        private_key = keys["private_key"]
        
        with open(env_path, "a") as f:
            f.write(f"\n# Web Push VAPID keys\nVAPID_PUBLIC_KEY={public_key}\nVAPID_PRIVATE_KEY={private_key}\n")
        print("VAPID keys added to .env")
    else:
        print("VAPID keys already exist in .env")
else:
    print(".env file not found")
