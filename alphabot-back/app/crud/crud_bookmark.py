from sqlalchemy.orm import Session
from typing import List, Optional
from app.crud.crud_base import CRUDBase
from app.models.models import Bookmark  # models.py에서 Bookmark 모델 가져오기
from app.schemas.bookmark import BookmarkCreate, BookmarkUpdate


# CRUDBase[모델, 생성스키마, 수정스키마] 순서로 제네릭 타입 지정
class CRUDBookmark(CRUDBase[Bookmark, BookmarkCreate, BookmarkUpdate]):

    def create_with_user(
        self, 
        db: Session, 
        *, 
        obj_in: BookmarkCreate, 
        user_id: int
    ) -> Bookmark:
        """
        새 북마크 생성 (user_id는 인증된 사용자의 ID를 받음)
        (유스케이스 4.1.5)
        """
        # Pydantic 스키마를 dict로 변환
        obj_in_data = obj_in.dict()
        # user_id를 추가하여 SQLAlchemy 모델 인스턴스 생성
        db_obj = self.model(**obj_in_data, user_id=user_id)
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_by_id_and_user(
        self, db: Session, *, bookmark_id: int, user_id: int
    ) -> Optional[Bookmark]:
        """
        북마크 ID와 사용자 ID로 단일 북마크 조회
        (삭제/수정 시 본인 확인용)
        """
        return db.query(self.model).filter(
            self.model.bookmark_id == bookmark_id,
            self.model.user_id == user_id
        ).first()

    def get_multi_by_user(
        self, 
        db: Session, 
        *, 
        user_id: int, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[Bookmark]:
        """
        특정 사용자의 '모든' 북마크 목록 조회 (페이지네이션)
        (UI: '전체' 카테고리 클릭 시)
        """
        return (
            db.query(self.model)
            .filter(self.model.user_id == user_id)
            .order_by(self.model.created_at.desc()) # 최신순으로 정렬
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_count_by_user(self, db: Session, *, user_id: int) -> int:
        """특정 사용자의 '모든' 북마크 총 개수 조회 (페이지네이션용)"""
        return db.query(self.model).filter(self.model.user_id == user_id).count()

    def get_multi_by_user_and_category(
        self, 
        db: Session, 
        *, 
        user_id: int, 
        category_id: int, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[Bookmark]:
        """
        특정 사용자의 + '특정 카테고리'의 북마크 목록 조회 (페이지네이션)
        (유스케이스 4.1.6)
        """
        return (
            db.query(self.model)
            .filter(self.model.user_id == user_id, self.model.category_id == category_id)
            .order_by(self.model.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_count_by_user_and_category(
        self, db: Session, *, user_id: int, category_id: int
    ) -> int:
        """특정 사용자의 + '특정 카테고리'의 북마크 총 개수 조회 (페이지네이션용)"""
        return (
            db.query(self.model)
            .filter(self.model.user_id == user_id, self.model.category_id == category_id)
            .count()
        )

    def remove_by_id_and_user(
        self, db: Session, *, bookmark_id: int, user_id: int
    ) -> Optional[Bookmark]:
        """
        북마크 삭제 (유스케이스 4.1.8)
        - 반드시 본인(user_id)의 북마크(bookmark_id)만 삭제하도록 함
        """
        # 먼저 본인 소유의 북마크가 맞는지 확인
        db_obj = self.get_by_id_and_user(db, bookmark_id=bookmark_id, user_id=user_id)

        if db_obj:
            db.delete(db_obj)
            db.commit()
        return db_obj

# 다른 파일(라우터)에서 쉽게 import할 수 있도록 인스턴스 생성
bookmark_crud = CRUDBookmark(Bookmark)