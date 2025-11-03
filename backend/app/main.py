from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from pathlib import Path
from .core.config import settings
from .core.database import Base, engine
from .routers import auth, products, auctions, orders, uploads, admin

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Aalam Al-Otoor API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if not os.path.exists(settings.UPLOAD_DIR):
    os.makedirs(settings.UPLOAD_DIR)

if os.path.exists(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(auctions.router)
app.include_router(orders.router)
app.include_router(uploads.router)
app.include_router(admin.router)


@app.get("/healthz")
async def health_check():
    return {"ok": True}


frontend_dist = Path(__file__).parent.parent.parent / "frontend" / "dist"
api_prefixes = ('auth', 'products', 'auctions', 'orders', 'uploads', 'admin', 'healthz')

if frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        for prefix in api_prefixes:
            if full_path == prefix or full_path.startswith(f"{prefix}/"):
                raise HTTPException(status_code=404, detail=f"API endpoint /{full_path} not found")
        
        file_path = frontend_dist / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(frontend_dist / "index.html")
else:
    @app.get("/")
    async def root():
        return {"message": "Aalam Al-Otoor API - Perfume Marketplace", "version": "1.0.0", "frontend": "not built"}
