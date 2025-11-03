from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from PIL import Image
import os
import secrets
from ..core.config import settings
from ..core.dependencies import get_current_user

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    
    ext = file.filename.split(".")[-1].lower()
    if ext not in settings.allowed_extensions_list:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed: {', '.join(settings.allowed_extensions_list)}"
        )
    
    filename = f"{secrets.token_urlsafe(16)}.{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    
    content = await file.read()
    
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="File too large")
    
    with open(filepath, "wb") as f:
        f.write(content)
    
    try:
        img = Image.open(filepath)
        img.thumbnail((800, 800))
        img.save(filepath, optimize=True, quality=85)
    except Exception as e:
        os.remove(filepath)
        raise HTTPException(status_code=400, detail="Invalid image file")
    
    return {"url": f"/uploads/{filename}"}
