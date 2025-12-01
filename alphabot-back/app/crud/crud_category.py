from typing import List, Optional
from sqlalchemy.orm import Session
from app.crud.crud_base import CRUDBase
# 1. models.category가 아닌 models.models에서 Category 모델 가져오기
from app.models.models import Category
from app.schemas.category import CategoryCreate, CategoryUpdate


class CRUDCategory(CRUDBase[Category, CategoryCreate, CategoryUpdate]):
    """
    사용자별 카테고리 CRUD 연산
    (bookmark_crud와 동일한 '개인화' 로직 적용)
    """

    def create_with_user(self, db: Session, *, obj_in: CategoryCreate, user_id: int) -> Category:
        """새 카테고리 생성 (user_id 포함)"""
        # 2. models.py와 schemas.py에 맞게 title만 사용
        db_obj = Category(
            title=obj_in.title,
            user_id=user_id
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_by_id_and_user(self, db: Session, *, category_id: int, user_id: int) -> Optional[Category]:
        """사용자 ID와 카테고리 ID로 조회 (본인 확인용)"""
        return db.query(Category).filter(
            Category.category_id == category_id, 
            Category.user_id == user_id
        ).first()

    def get_by_title_and_user(self, db: Session, *, title: str, user_id: int) -> Optional[Category]:
        """사용자 ID와 제목으로 조회 (중복 확인용)"""
        return db.query(Category).filter(
            Category.title == title, 
            Category.user_id == user_id
        ).first()

    def get_multi_by_user(
        self, 
        db: Session, 
        *, 
        user_id: int,
        skip: int = 0, 
        limit: int = 100,
        sort_by: Optional[str] = None
    ) -> List[Category]:
        """특정 사용자의 모든 카테고리 목록 조회 (정렬 포함)"""
        # 3. user_id로 필터링하는 로직 추가
        query = db.query(Category).filter(Category.user_id == user_id)
        
        if sort_by == "title":
            query = query.order_by(Category.title.asc())
        else:
            query = query.order_by(Category.created_at.desc())
            
        return query.offset(skip).limit(limit).all()

    def get_count_by_user(self, db: Session, *, user_id: int) -> int:
        """특정 사용자의 카테고리 총 개수 조회 (페이지네이션용)"""
        # 4. user_id로 필터링하는 로직 추가
        return db.query(Category).filter(Category.user_id == user_id).count()

    def search_categories(
        self, 
        db: Session, 
        *, 
        user_id: int,  # 5. user_id 파라미터 추가
        search_term: str, 
        skip: int = 0, 
        limit: int = 100,
        sort_by: Optional[str] = None
    ) -> List[Category]:
        """카테고리 검색 (정렬 기능 포함)"""
        
        query = db.query(Category).filter(
            Category.title.contains(search_term),
            Category.user_id == user_id  # 6. user_id로 필터링
        )
        
        if sort_by == "title":
            query = query.order_by(Category.title.asc())
        else:
            query = query.order_by(Category.created_at.desc())

        return query.offset(skip).limit(limit).all()

    def remove_by_id_and_user(self, db: Session, *, category_id: int, user_id: int) -> Optional[Category]:
        """
        본인(user_id)의 카테고리(category_id)만 삭제하도록 함
        """
        # 7. 본인 소유인지 확인하는 로직으로 변경
        db_obj = self.get_by_id_and_user(db, category_id=category_id, user_id=user_id)

        if db_obj:
            db.delete(db_obj)
            db.commit()
        return db_obj

    # update_category는 CRUDBase의 제네릭 함수를 사용하므로
    # 라우터에서 get_by_id_and_user로 객체를 조회한 후 넘겨주면 됩니다.

# 카테고리 CRUD 인스턴스
category_crud = CRUDCategory(Category)