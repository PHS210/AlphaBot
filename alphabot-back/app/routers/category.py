from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
import math

from app.db import get_db
from app.crud.crud_category import category_crud
from app.schemas.category import Category, CategoryCreate, CategoryUpdate, CategoryList
from app.models.models import User
from app.core.dependencies import require_admin_user # 현재 이함수는 없음 관리자라는 개념이 User 모델에 빠져있기 때문에 사용 불가가

router = APIRouter()


@router.post("/", response_model=Category, status_code=status.HTTP_201_CREATED)
def create_category(
    *,
    db: Session = Depends(get_db),
    category_in: CategoryCreate,
    current_user: User = Depends(require_admin_user)
) -> Category:
    """새 카테고리 생성 (관리자 권한 필요)"""
    
    # 중복 제목 확인
    existing_category = category_crud.get_by_title(db, title=category_in.title)
    if existing_category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with this title already exists"
        )
    
    category = category_crud.create_category(db, obj_in=category_in)
    return category


@router.get("/", response_model=CategoryList)
def read_categories(
    *,
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="페이지 번호"),
    page_size: int = Query(10, ge=1, le=100, description="페이지 크기"),
    search: str = Query(None, description="검색어"),
    # --- 1. sort_by 쿼리 파라미터 추가 ---
    sort_by: Optional[str] = Query(None, description="Sort by 'title' (asc) or 'created_at' (desc)")
) -> CategoryList:
    """모든 카테고리 목록 조회 (페이지네이션 및 검색 지원)"""
    
    skip = (page - 1) * page_size
    
    if search:
        categories = category_crud.search_categories(
            db, search_term=search, skip=skip, limit=page_size, sort_by=sort_by  # <-- 2. 파라미터 전달
        )
        total = len(category_crud.search_categories(db, search_term=search, skip=0, limit=1000))
    else:
        categories = category_crud.get_multi_categories(
            db, skip=skip, limit=page_size, sort_by=sort_by  # <-- 2. 파라미터 전달
        )
        total = category_crud.get_count(db)
    
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    
    return CategoryList(
        categories=categories,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/{category_id}", response_model=Category)
def read_category(
    *,
    db: Session = Depends(get_db),
    category_id: int
) -> Category:
    """특정 카테고리 상세 정보 조회"""
    
    category = category_crud.get_by_id(db, category_id=category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    return category


@router.put("/{category_id}", response_model=Category)
def update_category(
    *,
    db: Session = Depends(get_db),
    category_id: int,
    category_in: CategoryUpdate,
    current_user: User = Depends(require_admin_user)
) -> Category:
    """특정 카테고리 정보 수정 (관리자 권한 필요)"""
    
    category = category_crud.get_by_id(db, category_id=category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # 제목 변경 시 중복 확인
    if category_in.title and category_in.title != category.title:
        existing_category = category_crud.get_by_title(db, title=category_in.title)
        if existing_category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category with this title already exists"
            )
    
    category = category_crud.update_category(db, db_obj=category, obj_in=category_in)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    *,
    db: Session = Depends(get_db),
    category_id: int,
    current_user: User = Depends(require_admin_user)
):
    """특정 카테고리 삭제 (관리자 권한 필요)"""
    
    success = category_crud.delete_category(db, category_id=category_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
