from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session
import math

# 1. DB 세션 및 CRUD, 스키마 import
from app.db import get_db
from app.crud.crud_category import category_crud
from app.schemas.category import Category, CategoryCreate, CategoryUpdate, CategoryList

# 2. models.py에서 User 모델 import
from app.models.models import User

# 3. 'require_admin_user' 대신 'get_current_user' import
from app.core.dependencies import get_current_user

router = APIRouter()


@router.post("", response_model=Category, status_code=status.HTTP_201_CREATED)
def create_category(
    *,
    db: Session = Depends(get_db),
    category_in: CategoryCreate,
    # 4. 'require_admin_user' -> 'get_current_user'로 변경
    current_user: User = Depends(get_current_user) 
) -> Category:
    """새 카테고리 생성 (로그인한 사용자 본인)"""
    
    # 5. 중복 확인을 '본인 계정 내에서만' 하도록 변경
    existing_category = category_crud.get_by_title_and_user(
        db, title=category_in.title, user_id=current_user.user_id
    )
    if existing_category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with this title already exists"
        )
    
    # 6. 'user_id'를 전달하는 'create_with_user' 함수로 변경
    category = category_crud.create_with_user(db, obj_in=category_in, user_id=current_user.user_id)
    return category


@router.get("", response_model=CategoryList)
def read_categories(
    *,
    db: Session = Depends(get_db),
    # 7. 본인 카테고리만 봐야 하므로 'get_current_user' 추가
    current_user: User = Depends(get_current_user), 
    page: int = Query(1, ge=1, description="페이지 번호"),
    page_size: int = Query(10, ge=1, le=100, description="페이지 크기"),
    # 8. 'search' 파라미터가 Optional이 되도록 수정
    search: Optional[str] = Query(None, description="검색어"), 
    sort_by: Optional[str] = Query(None, description="Sort by 'title' (asc) or 'created_at' (desc)")
) -> CategoryList:
    """로그인한 사용자의 모든 카테고리 목록 조회"""
    
    skip = (page - 1) * page_size
    
    if search:
        # 9. 검색 시에도 user_id 전달
        categories = category_crud.search_categories(
            db, 
            user_id=current_user.user_id,
            search_term=search, 
            skip=skip, 
            limit=page_size, 
            sort_by=sort_by
        )
        total = len(category_crud.search_categories(db, user_id=current_user.user_id, search_term=search, skip=0, limit=1000))
    else:
        # 10. 'get_multi_categories' -> 'get_multi_by_user'로 변경
        categories = category_crud.get_multi_by_user(
            db, 
            user_id=current_user.user_id,
            skip=skip, 
            limit=page_size, 
            sort_by=sort_by
        )
        # 11. total 계산도 user_id 기준으로 변경
        total = category_crud.get_count_by_user(db, user_id=current_user.user_id)
    
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
    category_id: int,
    # 12. 본인 확인을 위해 'get_current_user' 추가
    current_user: User = Depends(get_current_user)
) -> Category:
    """특정 카테고리 상세 정보 조회 (본인 것만)"""
    
    # 13. 'get_by_id' -> 'get_by_id_and_user'로 변경 (본인 확인)
    category = category_crud.get_by_id_and_user(
        db, category_id=category_id, user_id=current_user.user_id
    )
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found or permission denied"
        )
    return category


@router.put("/{category_id}", response_model=Category)
def update_category(
    *,
    db: Session = Depends(get_db),
    category_id: int,
    category_in: CategoryUpdate,
    # 14. 'require_admin_user' -> 'get_current_user'로 변경
    current_user: User = Depends(get_current_user)
) -> Category:
    """특정 카테고리 정보 수정 (본인 것만)"""
    
    # 15. 본인 소유인지 먼저 확인
    category = category_crud.get_by_id_and_user(
        db, category_id=category_id, user_id=current_user.user_id
    )
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found or permission denied"
        )
    
    # 16. 중복 확인도 본인 계정 내에서만
    if category_in.title and category_in.title != category.title:
        existing_category = category_crud.get_by_title_and_user(
            db, title=category_in.title, user_id=current_user.user_id
        )
        if existing_category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category with this title already exists"
            )
    
    # CRUDBase의 제네릭 update 함수 사용
    category = category_crud.update(db, db_obj=category, obj_in=category_in)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    *,
    db: Session = Depends(get_db),
    category_id: int,
    # 17. 'require_admin_user' -> 'get_current_user'로 변경
    current_user: User = Depends(get_current_user)
):
    """특정 카테고리 삭제 (본인 것만)"""
    
    # 18. 'remove_by_id_and_user'로 변경 (본인 확인 및 삭제)
    deleted_category = category_crud.remove_by_id_and_user(
        db, category_id=category_id, user_id=current_user.user_id
    )
    
    if not deleted_category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found or permission denied"
        )
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)