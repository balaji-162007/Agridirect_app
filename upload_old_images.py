import cloudinary
import cloudinary.uploader
import os

# CONFIG (use your values or set environment variables)
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", "YOUR_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY", "YOUR_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET", "YOUR_API_SECRET")
)

folders = {
    "uploads/product_images": "agridirect/migrated_products",
    "uploads/profile_photos": "agridirect/migrated_profiles"
}

uploaded_urls = {}

for local_folder, cloud_folder in folders.items():
    if not os.path.exists(local_folder):
        print(f"Skipping {local_folder} (not found)")
        continue

    print(f"\nStarting upload from {local_folder} to {cloud_folder}...")

    for filename in os.listdir(local_folder):
        file_path = os.path.join(local_folder, filename)
        
        # Skip directories like 'thumbs'
        if os.path.isdir(file_path):
            continue

        print(f"Uploading {filename}...")
        try:
            result = cloudinary.uploader.upload(
                file_path,
                folder=cloud_folder,
                use_filename=True,
                unique_filename=True
            )
            uploaded_urls[f"{local_folder}/{filename}"] = result["secure_url"]
            print(f"Done: {result['secure_url']}")
        except Exception as e:
            print(f"Failed to upload {filename}: {e}")

print("\nAll uploaded:")
for k, v in uploaded_urls.items():
    print(f"{k} -> {v}")

print("\nIMPORTANT: Use these URLs to update your database entries.")
