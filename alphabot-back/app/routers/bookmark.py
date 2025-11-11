from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session
from typing import Optional
import math

# crud, schemas, models, db 폴더에서 필요한 것들을 import
from ..crud.crud_bookmark import bookmark_crud
from .. import schemas
from ..models import models
from ..db import get_db

# 인증을 위해 현재 로그인한 사용자를 가져오는 의존성 (경로 확인 필요)
from ..core.dependencies import get_current_user

# APIRouter 객체 생성
router = APIRouter()

# --- API 엔드포인트 정의 ---

@router.post(
    "/", 
    response_model=schemas.BookmarkRead, 
    status_code=status.HTTP_201_CREATED
)
def create_bookmark(
    *,
    db: Session = Depends(get_db),
    bookmark_in: schemas.BookmarkCreate,
    current_user: models.User = Depends(get_current_user)
):
    """
    새 북마크(메시지 저장)를 생성합니다. (로그인 필요)
    
    - **유스케이스 4.1.5**: 채팅 메시지를 특정 카테고리에 북마크합니다.
    """
    # crud 함수를 호출할 때 인증된 사용자의 user_id를 함께 전달
    bookmark = crud.bookmark_crud.create_with_user(
        db=db, obj_in=bookmark_in, user_id=current_user.user_id
    )
    return bookmark


@router.get("/", response_model=schemas.BookmarkList)
def read_bookmarks(
    *,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    page: int = Query(1, ge=1, description="페이지 번호"),
    page_size: int = Query(10, ge=1, le=100, description="페이지 크기"),
    category_id: Optional[int] = Query(None, description="카테고리 ID (없으면 '전체' 조회)")
):
    """
    로그인한 사용자의 북마크 목록을 조회합니다. (페이지네이션 및 카테고리 필터링)
    
    - **유스케이스 4.1.6**: 카테고리 클릭 시 해당 북마크 목록 표시.
      (category_id가 None이면 '전체' 목록, 값이 있으면 해당 카테고리 목록)
    """
    skip = (page - 1) * page_size
    
    if category_id is None:
        # '전체' 북마크 조회 (이미지의 '전체 (4)' 클릭 시)
        bookmarks = crud.bookmark_crud.get_multi_by_user(
            db, user_id=current_user.user_id, skip=skip, limit=page_size
        )
        total = crud.bookmark_crud.get_count_by_user(db, user_id=current_user.user_id)
    else:
        # 특정 카테고리 북마크 조회 (이미지의 '투자 전략 (1)' 클릭 시)
        bookmarks = crud.bookmark_crud.get_multi_by_user_and_category(
            db, user_id=current_user.user_id, category_id=category_id, skip=skip, limit=page_size
        )
        total = crud.bookmark_crud.get_count_by_user_and_category(
            db, user_id=current_user.user_id, category_id=category_id
        )
    
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    
    return schemas.BookmarkList(
        bookmarks=bookmarks,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.put("/{bookmark_id}", response_model=schemas.BookmarkRead)
def update_bookmark_category(
    *,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    bookmark_id: int,
    bookmark_in: schemas.BookmarkUpdate
):
    """
    북마크의 카테고리를 변경합니다. (예: 다른 카테고리로 이동)
    """
    # 먼저 해당 북마크가 로그인한 사용자의 소유인지 확인
    db_bookmark = crud.bookmark_crud.get_by_id_and_user(
        db, bookmark_id=bookmark_id, user_id=current_user.user_id
    )
    
    if not db_bookmark:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bookmark not found or permission denied"
        )
    
    # CRUDBase의 제네릭 update 함수를 호출
    bookmark = crud.bookmark_crud.update(db=db, db_obj=db_bookmark, obj_in=bookmark_in)
    return bookmark


@router.delete("/{bookmark_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bookmark(
    *,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    bookmark_id: int
):
    """
    북마크를 삭제합니다. (로그인 필요)
    
    - **유스케이스 4.1.8**: 개별 북마크 삭제 (이미지의 휴지통 아이콘)
    """
    # crud 함수에서 본인 소유가 맞는지 확인하며 삭제
    deleted_bookmark = crud.bookmark_crud.remove_by_id_and_user(
        db, bookmark_id=bookmark_id, user_id=current_user.user_id
    )
    
    if not deleted_bookmark:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bookmark not found or permission denied"
        )
    
    # 성공적으로 삭제되면 204 No Content 응답 반환
    return Response(status_code=status.HTTP_204_NO_CONTENT)