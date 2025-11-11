from fastapi import FastAPI
import logging
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware


from app.db import engine, get_db
from app.models import Base, role_enum, trash_enum
from app.routers import auth, chat,user


# 기본 로깅 레벨 WARNING으로 설정
logging.getLogger().setLevel(logging.WARNING)
logging.getLogger("uvicorn").setLevel(logging.WARNING)
logging.getLogger("uvicorn.error").setLevel(logging.WARNING)
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

# chat, auth 라우터 등록
app.include_router(user.router, prefix="/api", tags=["User"])
app.include_router(auth.router, prefix="/api", tags=["Auth"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(category.router, prefix="/api/categories", tags=["Categories"])
app.include_router(bookmark.router, prefix="/api/bookmarks", tags=["Bookmarks"])

# 모든 경로 index.html 반환
@app.get("/{full_path:path}")
def serve_react_app_catch_all(full_path: str):
    return FileResponse("frontend/index.html")
#----------------------------------------------------------


#서버 실행 시 DB에 테이블이 없다면 models.py에 있는 정보 토대로 자동생성
models.Base.metadata.create_all(bind=engine)
