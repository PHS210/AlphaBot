from fastapi import FastAPI, HTTPException
import logging
import os
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.db import engine, get_db, Base
from app.routers import auth, chat, user, category, bookmark, comment

app = FastAPI()

logger = logging.getLogger(__name__)

# 기본 로깅 레벨 WARNING으로 설정
logging.getLogger().setLevel(logging.WARNING)
logging.getLogger("uvicorn").setLevel(logging.WARNING)
logging.getLogger("uvicorn.error").setLevel(logging.WARNING)
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


# CORS 설정: 프론트엔드 개발 서버 접근 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://0.0.0.0:5173",
        "http://localhost:8080",
        "http://0.0.0.0:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup() -> None:
    # 테이블 생성 (없으면)
    Base.metadata.create_all(bind=engine)

# 프론트엔드 정적 파일 경로 설정
BASE_DIR = Path(__file__).resolve().parent  # .../alphabot-back/app
PROJECT_ROOT = BASE_DIR.parent.parent  # .../softwareEng
FRONTEND_BUILD_DIR = Path(
    os.getenv("FRONTEND_BUILD_DIR", PROJECT_ROOT / "alphabot-front" / "dist")
)
FRONTEND_INDEX_FILE = FRONTEND_BUILD_DIR / "index.html"
FRONTEND_ASSETS_DIR = FRONTEND_BUILD_DIR / "assets"

if FRONTEND_ASSETS_DIR.exists():
    app.mount(
        "/assets",
        StaticFiles(directory=FRONTEND_ASSETS_DIR),
        name="frontend-assets",
    )
else:
    logger.warning(
        "Frontend assets directory not found at %s. Static files will not be served.",
        FRONTEND_ASSETS_DIR,
    )

# chat, auth 라우터 등록
app.include_router(user.router, prefix="/api", tags=["User"])
app.include_router(auth.router, prefix="/api", tags=["Auth"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(category.router, prefix="/api/categories", tags=["Categories"])
app.include_router(bookmark.router, prefix="/api/bookmarks", tags=["Bookmarks"])
app.include_router(comment.router, prefix="/api/comments", tags=["Comments"])

# 모든 경로 index.html 반환
@app.get("/{full_path:path}", include_in_schema=False)
def serve_react_app_catch_all(full_path: str):
    if FRONTEND_INDEX_FILE.exists():
        return FileResponse(FRONTEND_INDEX_FILE)
    raise HTTPException(
        status_code=503,
        detail=(
            "Frontend build not found. "
            "Run `npm run build` inside `alphabot-front` or set FRONTEND_BUILD_DIR."
        ),
    )
