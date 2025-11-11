# AlphaBot Frontend - 기능 목록

## 구현된 주요 기능 (Use Case 기반)

### 1. 사용자 인증 및 계정 관리

#### Use Case #0: 로그인 (Log-in)
- **경로**: `/login`
- **기능**: 아이디와 비밀번호로 로그인
- **화면**: `LoginPage.tsx`

#### Use Case #1: 회원가입 (Sign up)
- **경로**: `/signup`
- **기능**: 
  - 아이디, 이름, 비밀번호, 비밀번호 확인 입력
  - 유효성 검증 (필수 항목, 비밀번호 일치, 아이디 중복)
  - 실시간 에러 메시지 표시
- **화면**: `SignupPage.tsx`

#### Use Case #2: 로그아웃 (Log out)
- **위치**: Header 드롭다운 메뉴
- **기능**: 로그아웃 확인 후 로그인 페이지로 이동
- **컴포넌트**: `Header.tsx`

#### Use Case #3: 프로필 수정 (Profile Edit)
- **경로**: `/mypage`
- **기능**: 
  - 사용자 이름 수정
  - 아이디는 읽기 전용
  - 수정/취소 기능
- **화면**: `MyPage.tsx` (프로필 탭)

#### Use Case #4: 비밀번호 변경 (Password Change)
- **경로**: `/mypage`
- **기능**:
  - 현재 비밀번호 확인
  - 새 비밀번호 입력 및 확인
  - 비밀번호 일치 검증
- **화면**: `MyPage.tsx` (비밀번호 탭)

---

### 2. 채팅 및 메시지 관리

#### Use Case #4: 채팅 메시지 저장 (북마크)
- **경로**: `/bookmarks`
- **기능**:
  - 저장된 메시지 목록 조회
  - 카테고리별 필터링
  - 카테고리 생성/관리
  - 북마크 삭제
- **화면**: `BookmarkPage.tsx`

#### Use Case #5: 채팅방 삭제
- **경로**: `/trash`
- **기능**:
  - 삭제된 채팅방 및 북마크 조회
  - 항목 복원
  - 영구 삭제
  - 휴지통 비우기
- **화면**: `TrashPage.tsx`

#### Use Case #2: 휴지통 관리
- **경로**: `/trash`
- **기능**:
  - 채팅방과 북마크 통합 관리
  - 선택 복원/삭제
  - 전체 선택
  - 휴지통 비우기 (전체 삭제)
- **화면**: `TrashPage.tsx`

---

### 3. 종목 정보 조회

#### Use Case #14: 종목 검색
- **위치**: 메인 페이지 (Chat Page)
- **기능**:
  - 티커/종목명으로 실시간 검색
  - 자동완성 결과 표시
  - 최근 검색 기록 관리
  - 검색 결과에 현재가, 등락률 표시
- **컴포넌트**: `StockSearch.tsx`

#### Use Case #1: 종목 상세 정보 조회
- **표시**: 모달 팝업
- **기능**:
  - **상세 정보 탭**:
    - 시가, 고가, 저가, 거래량
    - 시가총액, P/E Ratio, EPS
    - 배당수익률
  - **재무제표 탭**:
    - 분기별 매출 추이 (차트)
    - 순이익 추이
    - 재무상태표 (자산, 부채, 자본)
  - 관심 종목 추가/제거
- **컴포넌트**: `StockDetail.tsx`

---

### 4. 네비게이션 및 레이아웃

#### Header (상단 바)
- **기능**:
  - 로고 클릭 시 채팅 페이지로 이동
  - 사용자 드롭다운 메뉴:
    - 마이페이지
    - 저장된 메시지
    - 휴지통
    - 로그아웃
- **컴포넌트**: `Header.tsx`

#### Left Sidebar (왼쪽 사이드바)
- **기능**:
  - 채팅방 목록 표시
  - 새 채팅 시작 버튼
  - 채팅방 날짜 표시
- **컴포넌트**: `LeftSidebar.tsx`

---

## 페이지 구조

```
/                    - WelcomePage (시작 페이지)
/login               - LoginPage (로그인)
/signup              - SignupPage (회원가입)
/chat                - ChatPage (메인 - 채팅 & 종목 검색)
/mypage              - MyPage (프로필 & 비밀번호 수정)
/bookmarks           - BookmarkPage (저장된 메시지)
/trash               - TrashPage (휴지통)
```

---

## 주요 컴포넌트

### Pages (페이지)
- `WelcomePage.tsx` - 웰컴 화면
- `LoginPage.tsx` - 로그인
- `SignupPage.tsx` - 회원가입
- `ChatPage.tsx` - 메인 채팅 페이지
- `MyPage.tsx` - 마이페이지 (프로필/비밀번호)
- `BookmarkPage.tsx` - 북마크 관리
- `TrashPage.tsx` - 휴지통 관리

### Components (재사용 컴포넌트)
- `Header.tsx` - 상단 헤더 (네비게이션)
- `LeftSidebar.tsx` - 채팅방 목록 사이드바
- `StockSearch.tsx` - 종목 검색 (자동완성)
- `StockDetail.tsx` - 종목 상세 정보 모달

---

## Mock 데이터

현재 모든 기능은 Mock 데이터로 구현되어 있습니다:

### 주식 데이터
- AAPL, MSFT, GOOGL, NVDA, TSLA, AMZN, META
- 현재가, 등락률, 거래량, 재무 정보

### 사용자 데이터
- 로그인: 임의의 아이디/비밀번호
- 프로필: 홍길동 (user123)

### 채팅방
- 3개의 샘플 채팅방

### 북마크
- 4개의 샘플 북마크 메시지
- 4개의 카테고리 (전체, 투자 전략, 재무제표 분석, 시장 동향)

### 휴지통
- 2개의 채팅방, 2개의 북마크

---

## 기술 스택

- **React 19** + **TypeScript**
- **React Router DOM** - 페이지 라우팅
- **Styled Components** - CSS-in-JS 스타일링
- **React Icons** - 아이콘 라이브러리

---

## 실행 방법

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build
```

---

## 향후 구현 예정

- [ ] 실제 채팅 기능 (OpenAI API 연동)
- [ ] 백엔드 API 연동
- [ ] 실시간 주가 업데이트
- [ ] 차트 라이브러리 통합 (주가 차트)
- [ ] 워치리스트 (관심 종목)
- [ ] 포트폴리오 관리
- [ ] 알림 설정
- [ ] 뉴스/공시 조회
- [ ] 도움말 및 FAQ

