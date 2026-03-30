// ============================================================ 
// FILE: imageUtils.js  (add to your frontend /js or /utils folder) 
// FIX 3: All image display, upload, and fallback issues 
// ============================================================ 

// ───────────────────────────────────────── 
// CONSTANTS 
// ───────────────────────────────────────── 

// ✅ FIX: Replace via.placeholder.com (blocked) with inline SVG data URIs 
// These work 100% offline and never cause ERR_NAME_NOT_RESOLVED 

function makeSVGPlaceholder(emoji, bgColor, textColor) { 
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"> 
    <rect width="400" height="300" fill="${bgColor}"/> 
    <text x="200" y="155" font-size="80" text-anchor="middle" dominant-baseline="middle">${emoji}</text> 
    <text x="200" y="230" font-size="18" fill="${textColor}" text-anchor="middle" font-family="sans-serif" font-weight="600" opacity="0.6">No Image</text> 
  </svg>`; 
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); 
} 

const CATEGORY_PLACEHOLDERS = { 
  vegetables: makeSVGPlaceholder("🥦", "#d8f3dc", "#2d6a4f"), 
  fruits:     makeSVGPlaceholder("🍎", "#fce4ec", "#c62828"), 
  grains:     makeSVGPlaceholder("🌾", "#fff8e1", "#f57f17"), 
  dairy:      makeSVGPlaceholder("🥛", "#e3f2fd", "#1565c0"), 
  spices:     makeSVGPlaceholder("🌶️", "#fce4ec", "#b71c1c"), 
  pulses:     makeSVGPlaceholder("🫘", "#f3e5f5", "#6a1b9a"), 
  default:    makeSVGPlaceholder("🌿", "#f1f8e9", "#33691e"), 
}; 

/** 
 * Get the best display URL for a product image. 
 * Priority: uploaded Cloudinary URL > category SVG placeholder 
 */ 
function getProductImageUrl(product) { 
  if (!product) return CATEGORY_PLACEHOLDERS.default;
  
  const cat = (product.category || 'default').toLowerCase();
  
  // 1. Cloudinary URL (already uploaded) 
  if (product.imageUrl && product.imageUrl.startsWith("https://res.cloudinary.com")) { 
    return product.imageUrl; 
  } 
  
  // 2. Array of images (check first)
  if (Array.isArray(product.images) && product.images.length > 0) { 
    const first = product.images[0]; 
    if (typeof first === "string") {
      return getFullImageUrl(first);
    }
    if (first && first.url) return getFullImageUrl(first.url); 
  } 
  
  // 3. Single image field (fallback)
  if (product.image) return getFullImageUrl(product.image);

  // 4. Base64 preview (local upload not yet saved) 
  if (product.imagePreview && product.imagePreview.startsWith("data:image")) { 
    return product.imagePreview; 
  } 
  
  // 5. Category fallback (SVG, never blocked) 
  return CATEGORY_PLACEHOLDERS[cat] || CATEGORY_PLACEHOLDERS.default; 
} 

/** 
 * ✅ FIX: Safe onerror handler — checks element exists before setting textContent 
 * Replaces the crashing: img.onerror = () => { el.textContent = '...' } 
 */ 
function safeImageError(imgEl, fallbackUrl, emojiEl) { 
  if (!imgEl) return; 
  imgEl.onerror = function () { 
    this.onerror = null; // prevent infinite loop 
    this.src = fallbackUrl || CATEGORY_PLACEHOLDERS.default; 
    // ✅ FIX: Guard null check before setting textContent 
    if (emojiEl && emojiEl !== null) { 
      emojiEl.style.display = "flex"; 
    } 
  }; 
} 

/** 
 * Build a product card image element safely 
 */ 
function buildProductImage(product, className = "prod-img-el") { 
  const wrapper = document.createElement("div"); 
  wrapper.className = "prod-img"; 

  const url = getProductImageUrl(product); 
  const cat = (product.category || 'default').toLowerCase();

  if (url.startsWith("data:image/svg")) { 
    // SVG placeholder — show as img directly 
    const img = document.createElement("img"); 
    img.src = url; 
    img.alt = product.name || "Product"; 
    img.className = className; 
    img.style.cssText = "width:100%;height:100%;object-fit:cover;"; 
    wrapper.appendChild(img); 
  } else { 
    // Real image — with safe fallback 
    const img = document.createElement("img"); 
    img.alt = product.name || "Product"; 
    img.className = className; 
    img.style.cssText = "width:100%;height:100%;object-fit:cover;"; 
    img.src = url; 

    const fallback = CATEGORY_PLACEHOLDERS[cat] || CATEGORY_PLACEHOLDERS.default; 
    img.onerror = function () { 
      this.onerror = null; 
      this.src = fallback; 
    }; 
    wrapper.appendChild(img); 
  } 

  return wrapper; 
} 

// ───────────────────────────────────────── 
// UPLOAD HELPER (Frontend → Backend → Cloudinary) 
// ───────────────────────────────────────── 

/** 
 * Upload one or more image files to Cloudinary via your backend. 
 * @param {FileList|File[]} files 
 * @param {Function} onProgress - optional (progress %) 
 * @returns {Promise<string[]>} Array of Cloudinary HTTPS URLs 
 */ 
async function uploadProductImages(files, onProgress) { 
  const fileArray = Array.from(files).slice(0, 5); // max 5 

  if (fileArray.length === 0) return []; 

  const formData = new FormData(); 
  fileArray.forEach((file) => formData.append("images", file)); 

  try { 
    const response = await fetch(`${window.API_BASE}/upload/multiple`, { 
      method: "POST", 
      headers: { 
        // ✅ Do NOT set Content-Type manually for FormData — browser sets boundary 
        Authorization: `Bearer ${getAuthToken()}`, 
      }, 
      body: formData, 
    }); 

    if (!response.ok) { 
      const err = await response.json().catch(() => ({})); 
      throw new Error(err.error || `Upload failed: ${response.status}`); 
    } 

    const data = await response.json(); 
    return data.urls || []; 
  } catch (error) { 
    console.error("Image upload error:", error); 
    showToast("Image upload failed: " + error.message, "error"); 
    return []; 
  } 
} 

/** 
 * Create local preview URLs for immediate display before upload 
 * @param {FileList|File[]} files 
 * @returns {Promise<string[]>} Array of base64 data URLs 
 */ 
function createLocalPreviews(files) { 
  return Promise.all( 
    Array.from(files).slice(0, 5).map( 
      (file) => 
        new Promise((resolve) => { 
          const reader = new FileReader(); 
          reader.onload = (e) => resolve(e.target.result); 
          reader.onerror = () => 
            resolve(CATEGORY_PLACEHOLDERS.default); 
          reader.readAsDataURL(file); 
        }) 
    ) 
  ); 
} 

// ───────────────────────────────────────── 
// IMAGE INPUT HANDLER  (for Add Product form) 
// ───────────────────────────────────────── 

let pendingImageFiles = []; 

/** 
 * ✅ Drop-in replacement for handleImgUpload(input) 
 * Shows instant local previews, stores files for upload on save 
 */ 
async function handleImgUpload(input) { 
  const files = input.files; 
  if (!files || files.length === 0) return; 

  pendingImageFiles = Array.from(files).slice(0, 5); 

  const previewContainer = document.getElementById("imgPreviews"); 
  const uploadPrompt = document.getElementById("uploadPrompt"); 

  if (!previewContainer) return; 

  previewContainer.innerHTML = ""; 

  if (uploadPrompt) uploadPrompt.style.display = "none"; 

  // Show immediate local previews 
  const previews = await createLocalPreviews(pendingImageFiles); 
  previews.forEach((src, i) => { 
    const item = document.createElement("div"); 
    item.className = "img-preview-item"; 
    item.innerHTML = ` 
      <img src="${src}" alt="Preview ${i + 1}" onerror="this.onerror=null;this.src='${CATEGORY_PLACEHOLDERS.default}'"> 
      <button class="del-img" type="button" onclick="removeImagePreview(${i})" title="Remove">✕</button> 
    `; 
    previewContainer.appendChild(item); 
  }); 
} 

function removeImagePreview(index) { 
  pendingImageFiles.splice(index, 1); 
  // Re-trigger preview render 
  const mockInput = { files: pendingImageFiles }; 
  handleImgUpload(mockInput); 
  if (pendingImageFiles.length === 0) { 
    const uploadPrompt = document.getElementById("uploadPrompt"); 
    if (uploadPrompt) uploadPrompt.style.display = "block"; 
    const previewContainer = document.getElementById("imgPreviews"); 
    if (previewContainer) previewContainer.innerHTML = ""; 
  } 
} 

/** 
 * Call this when saving product — uploads pending files and returns URLs 
 */ 
async function finalizePendingImages(existingUrls = []) { 
  if (pendingImageFiles.length === 0) return existingUrls; 

  showToast("Uploading images…", "info"); 
  const newUrls = await uploadProductImages(pendingImageFiles); 
  pendingImageFiles = []; 
  return [...existingUrls, ...newUrls]; 
} 

// ───────────────────────────────────────── 
// RENDER HELPERS 
// ───────────────────────────────────────── 

/** 
 * ✅ FIX: Render product image in any container safely 
 * Fixes the "Cannot set properties of null" crash 
 */ 
function renderImageInContainer(containerId, product) { 
  const container = document.getElementById(containerId); 
  if (!container) { 
    // ✅ Crash fix: guard null before doing anything 
    console.warn(`renderImageInContainer: element #${containerId} not found`); 
    return; 
  } 
  container.innerHTML = ""; 
  const imgEl = buildProductImage(product); 
  container.appendChild(imgEl); 
} 

/** 
 * Safe innerHTML image tag — handles all URL types 
 */ 
function productImgTag(product, cssClass = "", style = "") { 
  const url = getProductImageUrl(product); 
  const cat = (product.category || 'default').toLowerCase();
  const fallback = CATEGORY_PLACEHOLDERS[cat] || CATEGORY_PLACEHOLDERS.default; 
  const escapedFallback = fallback.replace(/"/g, "&quot;"); 
  const name = (product.name || "Product").replace(/"/g, "&quot;"); 
  return `<img  
    src="${url}"  
    alt="${name}"  
    class="${cssClass}"  
    style="${style}"  
    onerror="this.onerror=null;this.src='${escapedFallback}';" 
    loading="lazy" 
  >`; 
} 

/**
 * ✅ FIX: Farmer Avatar renderer
 * Renders initials with a nice gradient background if photo is missing.
 */
function farmerAvatarTag(farmer, cssClass = "farmer-avatar", size = "40px") {
  if (!farmer) return `<div class="${cssClass}" style="width:${size};height:${size};display:flex;align-items:center;justify-content:center;background:var(--gray-200);border-radius:50%;font-weight:700">?</div>`;
  
  const name = farmer.name || farmer.farmer_name || "Farmer";
  const initials = name[0].toUpperCase();
  const photo = farmer.photo || farmer.profile_photo || farmer.farmer_photo;
  
  const gradients = [
    'linear-gradient(135deg, #10b981, #065f46)', // Green
    'linear-gradient(135deg, #3b82f6, #1e40af)', // Blue
    'linear-gradient(135deg, #f59e0b, #92400e)', // Amber
    'linear-gradient(135deg, #ef4444, #991b1b)', // Red
    'linear-gradient(135deg, #8b5cf6, #5b21b6)', // Purple
  ];
  
  // Use name to pick a consistent gradient
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradient = gradients[hash % gradients.length];

  if (photo) {
    const fullUrl = (typeof getFullImageUrl === 'function') ? getFullImageUrl(photo) : photo;
    return `<div class="${cssClass}" style="width:${size};height:${size};position:relative;border-radius:50%;overflow:hidden;background:${gradient}">
      <img src="${fullUrl}" 
        style="width:100%;height:100%;object-fit:cover" 
        onerror="this.onerror=null;this.parentElement.innerHTML='<span style=\'color:white\'>${initials}</span>';">
    </div>`;
  }

  return `<div class="${cssClass}" style="width:${size};height:${size};display:flex;align-items:center;justify-content:center;background:${gradient};color:white;border-radius:50%;font-weight:700;font-size:calc(${size} * 0.4)">
    ${initials}
  </div>`;
}

// ───────────────────────────────────────── 
// UTILITY 
// ───────────────────────────────────────── 

function getAuthToken() { 
  return localStorage.getItem("authToken") || sessionStorage.getItem("authToken") || ""; 
} 

/** 
 * Compress an image using canvas before upload. 
 * Reduces size significantly while maintaining reasonable quality. 
 */ 
async function compressImage(file, maxWidth = 1200, quality = 0.7) { 
  return new Promise((resolve) => { 
    const reader = new FileReader(); 
    reader.readAsDataURL(file); 
    reader.onload = (event) => { 
      const img = new Image(); 
      img.src = event.target.result; 
      img.onload = () => { 
        const canvas = document.createElement("canvas"); 
        let width = img.width; 
        let height = img.height; 

        if (width > maxWidth) { 
          height *= maxWidth / width; 
          width = maxWidth; 
        } 

        canvas.width = width; 
        canvas.height = height; 
        const ctx = canvas.getContext("2d"); 
        ctx.drawImage(img, 0, 0, width, height); 

        canvas.toBlob( 
          (blob) => { 
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), { 
              type: "image/webp", 
              lastModified: Date.now(), 
            }); 
            resolve(compressedFile); 
          }, 
          "image/webp", 
          quality 
        ); 
      }; 
    }; 
  }); 
} 

// Export for module systems, or just leave as globals 
if (typeof module !== "undefined") { 
  module.exports = { 
    getProductImageUrl, 
    buildProductImage, 
    productImgTag, 
    handleImgUpload, 
    finalizePendingImages, 
    removeImagePreview, 
    renderImageInContainer, 
    safeImageError, 
    CATEGORY_PLACEHOLDERS, 
    getFullImageUrl,
    compressImage,
  }; 
} 

/**
 * Helper to get full URL for an image path.
 * If it's already a full URL (Cloudinary/http), returns as is.
 * If it's a relative path, prepends backend base URL.
 */
function getFullImageUrl(path) {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("data:")) return path;
  
  // If it's a relative path from our backend
  let base = window.API_BASE || "";
  
  // Auto-detect production base if API_BASE is missing
  if (!base) {
    base = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
      ? "http://localhost:8000/api"
      : "https://agridirect-zwew.onrender.com/api";
  }
  
  // If API_BASE is "http://localhost:8000/api", staticBase is "http://localhost:8000"
  const staticBase = base.endsWith("/api") ? base.replace(/\/api$/, "") : base;
  
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${staticBase.replace(/\/$/, '')}/${cleanPath}`;
}
window.getFullImageUrl = getFullImageUrl;

/**
 * Shared nav HTML helpers
 */
function getCategoryEmoji(cat = '') {
  return {vegetables:'🥬',fruits:'🍎',grains:'🌾',dairy:'🥛',spices:'🌶️',herbs:'🌿',pulses:'🫘'}[cat.toLowerCase()] || '🥗';
}
window.getCategoryEmoji = getCategoryEmoji;

function renderStars(n, max = 5) {
  return Array.from({length: max}, (_, i) =>
    `<span class="${i < Math.round(n) ? '' : 'empty'}">★</span>`
  ).join('');
}
window.renderStars = renderStars;

function fmtDate(d)     { return d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : ''; }
window.fmtDate = fmtDate;

function fmtDateTime(d) { return d ? new Date(d).toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : ''; }
window.fmtDateTime = fmtDateTime;

function fmtCurrency(n) { return '₹' + Number(n).toLocaleString('en-IN',{minimumFractionDigits:2}); }
window.fmtCurrency = fmtCurrency;
