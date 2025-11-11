from typing import List, Optional
from sqlalchemy.orm import Session
from app.crud.crud_base import CRUDBase
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate


class CRUDCategory(CRUDBase[Category, CategoryCreate, CategoryUpdate]):
    """카테고리 CRUD 연산"""

    def get_by_id(self, db: Session, *, category_id: int) -> Optional[Category]:
        """카테고리 ID로 조회"""
        return db.query(Category).filter(Category.category_id == category_id).first()

    def get_by_title(self, db: Session, *, title: str) -> Optional[Category]:
        """제목으로 카테고리 조회"""
        return db.query(Category).filter(Category.title == title).first()

   def get_multi_categories(
        self, 
        db: Session, 
        *, 
        skip: int = 0, 
        limit: int = 100,
        sort_by: Optional[str] = None  # <-- 1. 정렬 파라미터 추가
    ) -> List[Category]:
        """카테고리 목록 조회 (페이지네이션 및 정렬)"""
        
        query = db.query(Category)
        
        # --- 2. 정렬 로직 추가 ---
        if sort_by == "title":
            query = query.order_by(Category.title.asc())
        else:
            # 기본 정렬 (예: 최신순)
            query = query.order_by(Category.created_at.desc())
        # ---
            
        return query.offset(skip).limit(limit).all()

    def create_category(self, db: Session, *, obj_in: CategoryCreate) -> Category:
        """새 카테고리 생성"""
        db_obj = Category(
            title=obj_in.title
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update_category(
        self, 
        db: Session, 
        *, 
        db_obj: Category, 
        obj_in: CategoryUpdate
    ) -> Category:
        """카테고리 업데이트"""
        update_data = obj_in.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete_category(self, db: Session, *, category_id: int) -> bool:
        """카테고리 삭제"""
        db_obj = self.get_by_id(db, category_id=category_id)
        if db_obj:
            db.delete(db_obj)
            db.commit()
            return True
        return False

    def search_categories(
            self, 
            db: Session, 
            *, 
            search_term: str, 
            skip: int = 0, 
            limit: int = 100,
            sort_by: Optional[str] = None  # <-- 1. 정렬 파라미터 추가
        ) -> List[Category]:
            """카테고리 검색 (정렬 기능 포함)"""
            
            query = db.query(Category).filter(
                Category.title.contains(search_term)
            )
            
            # --- 2. 정렬 로직 추가 ---
            if sort_by == "title":
                query = query.order_by(Category.title.asc())
            else:
                # 기본 정렬 (예: 최신순)
                query = query.order_by(Category.created_at.desc())
            # ---

            return query.offset(skip).limit(limit).all()

    
# 카테고리 CRUD 인스턴스
category_crud = CRUDCategory(Category)
