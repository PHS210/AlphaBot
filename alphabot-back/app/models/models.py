import enum
from sqlalchemy import (
    create_engine, Column, Integer, String, Text, TIMESTAMP, 
    ForeignKey, Enum, BigInteger, Numeric, Date, UniqueConstraint, Index, text
)
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func # func.now()를 위해 임포트

# 1. Base 클래스 생성
Base = declarative_base()

# 2. SQL의 ENUM을 Python enum 클래스로 정의
class RoleEnum(enum.Enum):
    user = 'user'
    assistant = 'assistant'

class TrashEnum(enum.Enum):
    in_ = 'in' # 'in'은 Python 예약어이므로 _in으로 변경
    out = 'out'

# 3. 모델 클래스 정의

class ReportTypeEnum(str, enum.Enum):
    annual = 'Annual'
    quarterly = 'Quarterly'

class User(Base):
    __tablename__ = 'users'
    __table_args__ = {'schema': 'public'}

    user_id = Column(Integer, primary_key=True, autoincrement=True)
    login_id = Column(String(100), nullable=False, unique=True)
    username = Column(String(50), nullable=False)
    hashed_pw = Column(String(255), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    # --- Relationships ---
    # User(1)가 Chat(N), Message(N), Bookmark(N)를 소유함
    # 'user_make_chat' FK에 대응
    chats = relationship("Chat", back_populates="user", cascade="all, delete")
    # 'fk_messages_user_id' FK에 대응
    messages = relationship("Message", back_populates="user", cascade="all, delete")
    # 'fk_bookmark_user_id' FK에 대응
    bookmarks = relationship("Bookmark", back_populates="user", cascade="all, delete")
    # 'fk_category_user_id' FK에 대응
    categories = relationship("Category", back_populates="user", cascade="all, delete")
    # 'fk_comment_user_id' FK에 대응
    comments = relationship("Comment", back_populates="user", cascade="all, delete")

    def __repr__(self):
        return f"<User(user_id={self.user_id}, login_id='{self.login_id}')>"

class Chat(Base):
    __tablename__ = 'chat'
    __table_args__ = (
        # 조건부 유니크 인덱스(사용자와 종목코드 조합)
        Index(
            'ux_chat_user_stock_active',
            'user_id',
            'stock_code',
            unique=True,
            postgresql_where=text("stock_code IS NOT NULL AND trash_can = 'out'")
        ),
        {'schema': 'public'},
    )

    chat_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('public.users.user_id', ondelete="CASCADE"), nullable=False)
    title = Column(String(100), nullable=False)
    # 종목별 채팅 기능을 위한 선택적 종목 코드 (예: AAPL). 인덱스 부여.
    stock_code = Column(String(20), nullable=True, index=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    lastchat_at = Column(TIMESTAMP, nullable=True)
    trash_can = Column(Enum(TrashEnum, name='trash_enum', create_type=False), server_default=TrashEnum.in_.value)

    # --- Relationships ---
    # Chat(1)이 User(1)에 속함
    user = relationship("User", back_populates="chats")
    # Chat(1)이 Message(N)를 포함함
    messages = relationship("Message", back_populates="chat", cascade="all, delete")

    def __repr__(self):
        return f"<Chat(chat_id={self.chat_id}, title='{self.title}')>"

class Message(Base):
    __tablename__ = 'messages'
    __table_args__ = {'schema': 'public'}

    messages_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('public.users.user_id', ondelete="CASCADE"), nullable=False)
    chat_id = Column(Integer, ForeignKey('public.chat.chat_id', ondelete="CASCADE"), nullable=False)
    role = Column(Enum(RoleEnum, name='role_enum', create_type=False), server_default=RoleEnum.user.value)
    content = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    # --- Relationships ---
    # Message(1)가 User(1)에 속함
    user = relationship("User", back_populates="messages")
    # Message(1)가 Chat(1)에 속함
    chat = relationship("Chat", back_populates="messages")
    # Message(1)가 Bookmark(N)에 의해 참조됨
    bookmarks = relationship("Bookmark", back_populates="message", cascade="all, delete")

    def __repr__(self):
        return f"<Message(messages_id={self.messages_id}, role='{self.role}')>"

class Category(Base):
    __tablename__ = 'category'
    __table_args__ = {'schema': 'public'}

    category_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('public.users.user_id', ondelete="CASCADE"), nullable=False)
    title = Column(String(50), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    # --- Relationships ---
    # Category(1)가 Bookmark(N)를 가짐 (SQL에는 FK가 없었지만, 컬럼이 존재하므로 관계 정의)
    bookmarks = relationship("Bookmark", back_populates="category")
    user = relationship("User", back_populates="categories")

    def __repr__(self):
        return f"<Category(category_id={self.category_id}, title='{self.title}')>"

class Bookmark(Base):
    __tablename__ = 'bookmark'
    __table_args__ = {'schema': 'public'}

    bookmark_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('public.users.user_id', ondelete="CASCADE"), nullable=False)
    messages_id = Column(Integer, ForeignKey('public.messages.messages_id', ondelete="CASCADE"), nullable=False)
    # [참고] 원본 SQL에는 category_id에 FK 제약이 없었으나, ORM 관계를 위해 추가
    # 만약 FK가 없어야 한다면 ForeignKey() 부분을 제거해야 함 (단, category 관계 사용이 복잡해짐)
    category_id = Column(Integer, ForeignKey('public.category.category_id'), nullable=True) 
    created_at = Column(TIMESTAMP, server_default=func.now())

    # --- Relationships ---
    # Bookmark(1)가 User(1)에 속함
    user = relationship("User", back_populates="bookmarks")
    # Bookmark(1)가 Message(1)에 속함
    message = relationship("Message", back_populates="bookmarks")
    # Bookmark(1)가 Category(1)에 속함
    category = relationship("Category", back_populates="bookmarks")

    def __repr__(self):
        return f"<Bookmark(bookmark_id={self.bookmark_id})>"


class Stock(Base):
    __tablename__ = 'stocks'
    __table_args__ = {'schema': 'public'}

    # 1. 기본 정보 (Basic Info)
    code = Column(String(20), primary_key=True)  # 종목 코드 (PK)
    company_name = Column(String(255), nullable=True)
    sector = Column(String(100), nullable=True)
    industry = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    website = Column(String(255), nullable=True)
    full_time_employees = Column(Integer, nullable=True)
    business_summary = Column(Text, nullable=True)

    # 2. 현재가 및 시장 데이터 (Market Data)
    current_price = Column(Numeric(18, 4), nullable=True)
    previous_close = Column(Numeric(18, 4), nullable=True)
    open = Column('open', Numeric(18, 4), nullable=True) # 'open'은 SQL 예약어일 수 있으므로 컬럼명 지정
    day_high = Column(Numeric(18, 4), nullable=True)
    day_low = Column(Numeric(18, 4), nullable=True)
    market_cap = Column(BigInteger, nullable=True)
    volume = Column(BigInteger, nullable=True)
    average_volume_10d = Column(BigInteger, nullable=True)
    
    # 3. 밸류에이션 지표 (Valuation)
    pe_ratio = Column(Numeric(18, 4), nullable=True)
    forward_pe = Column(Numeric(18, 4), nullable=True)
    pbr = Column(Numeric(18, 4), nullable=True)
    psr = Column(Numeric(18, 4), nullable=True)
    eps = Column(Numeric(18, 4), nullable=True)
    forward_eps = Column(Numeric(18, 4), nullable=True)
    enterprise_value = Column(BigInteger, nullable=True)
    enterprise_to_revenue = Column(Numeric(18, 4), nullable=True)
    enterprise_to_ebitda = Column(Numeric(18, 4), nullable=True)

    # 4. 재무 건전성 요약 (Financial Health Summary)
    profit_margins = Column(Numeric(18, 4), nullable=True)
    operating_margins = Column(Numeric(18, 4), nullable=True)
    gross_margins = Column(Numeric(18, 4), nullable=True)
    roa = Column(Numeric(18, 4), nullable=True)
    roe = Column(Numeric(18, 4), nullable=True)
    total_debt = Column(BigInteger, nullable=True)
    total_cash = Column(BigInteger, nullable=True)
    debt_to_equity = Column(Numeric(18, 4), nullable=True)
    free_cashflow = Column(BigInteger, nullable=True)
    revenue_growth = Column(Numeric(18, 4), nullable=True)
    earnings_growth = Column(Numeric(18, 4), nullable=True)

    # 5. 주가 변동성 (Price History)
    fifty_two_week_high = Column(Numeric(18, 4), nullable=True)
    fifty_two_week_low = Column(Numeric(18, 4), nullable=True)
    fifty_day_average = Column(Numeric(18, 4), nullable=True)
    two_hundred_day_average = Column(Numeric(18, 4), nullable=True)
    beta = Column(Numeric(18, 4), nullable=True)

    # 6. 배당 정보 (Dividends)
    dividend_rate = Column(Numeric(18, 4), nullable=True)
    dividend_yield = Column(Numeric(18, 4), nullable=True)
    payout_ratio = Column(Numeric(18, 4), nullable=True)
    ex_dividend_date = Column(TIMESTAMP(timezone=True), nullable=True)
    last_dividend_value = Column(Numeric(18, 4), nullable=True)

    # 7. 애널리스트 의견 (Analyst Ratings)
    recommendation = Column(String(50), nullable=True)
    target_mean_price = Column(Numeric(18, 4), nullable=True)
    target_high_price = Column(Numeric(18, 4), nullable=True)
    target_low_price = Column(Numeric(18, 4), nullable=True)
    number_of_analyst_opinions = Column(Integer, nullable=True)
    
    # 8. 메타데이터
    last_updated = Column(TIMESTAMP(timezone=True), server_default=func.now())
    
    # --- Relationships ---
    # Stock(1)이 FinancialStatement(N)를 가짐
    financial_statements = relationship("FinancialStatement", back_populates="stock", cascade="all, delete")
    comments = relationship("Comment", back_populates="stock", cascade="all, delete")

    def __repr__(self):
        return f"<Stock(code='{self.code}', company_name='{self.company_name}')>"


class FinancialStatement(Base):
    __tablename__ = 'financial_statements'
    
    __table_args__ = (
        UniqueConstraint('stock_code', 'report_period', 'report_type', name='unique_stock_period_type'),
        {'schema': 'public'}
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    # --- [수정] 'Stock' 모델을 명시적으로 참조 ---
    stock_code = Column(String(20), ForeignKey('public.stocks.code', ondelete="CASCADE"), nullable=False, index=True)
    
    report_period = Column(Date, nullable=False)
    report_type = Column(
        Enum(
            ReportTypeEnum,
            name='report_type_enum',
            create_type=False,
            values_callable=lambda enum_cls: [e.value for e in enum_cls],
        ),
        nullable=False,
    )
    
    # ... (revenue, net_income 등 나머지 컬럼들은 동일) ...
    revenue = Column(BigInteger, nullable=True)
    gross_profit = Column(BigInteger, nullable=True)
    operating_income = Column(BigInteger, nullable=True)
    ebitda = Column(BigInteger, nullable=True)
    net_income = Column(BigInteger, nullable=True)
    total_assets = Column(BigInteger, nullable=True)
    total_liabilities = Column(BigInteger, nullable=True)
    total_equity = Column(BigInteger, nullable=True)
    operating_cash_flow = Column(BigInteger, nullable=True)
    investing_cash_flow = Column(BigInteger, nullable=True)
    financing_cash_flow = Column(BigInteger, nullable=True)
    free_cash_flow = Column(BigInteger, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    # --- [추가] 'Stock' 모델과의 양방향 관계 ---
    stock = relationship("Stock", back_populates="financial_statements")

    def __repr__(self):
        return f"<FinancialStatement(stock_code='{self.stock_code}', period='{self.report_period}')>"
    

class Comment(Base):
    __tablename__ = 'comments'
    __table_args__ = {'schema': 'public'}

    comment_id = Column(Integer, primary_key=True, autoincrement=True)
    # 작성자 (User) 연결
    user_id = Column(Integer, ForeignKey('public.users.user_id', ondelete="CASCADE"), nullable=False)
    # 종목 (Stock) 연결
    stock_code = Column(String(20), ForeignKey('public.stocks.code', ondelete="CASCADE"), nullable=False)
    
    content = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    # --- Relationships ---
    user = relationship("User", back_populates="comments")
    stock = relationship("Stock", back_populates="comments")

    def __repr__(self):
        return f"<Comment(comment_id={self.comment_id}, stock_code='{self.stock_code}')>"