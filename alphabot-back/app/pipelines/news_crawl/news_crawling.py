import requests
from bs4 import BeautifulSoup
import re
import time
import random
from urllib.parse import urljoin, urlparse, parse_qs
from datetime import datetime, timedelta
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.db.database import SessionLocal
from app.models.models import NewsArticle

# -------------------------------------------------
# 기본 설정
# -------------------------------------------------
BASE_URL = "https://finance.naver.com"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/121.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "Connection": "keep-alive",
}

SOURCE_NAME = "NAVER_FINANCE"
BATCH_SAVE_SIZE = 100

# 뉴스포커스 카테고리별 리스트 URL
CATEGORY_URLS = {
    "시황/전망": (
        "/news/news_list.naver"
        "?mode=LSS3D&section_id=101&section_id2=258&section_id3=401"
    ),
    "기업/종목분석": (
        "/news/news_list.naver"
        "?mode=LSS3D&section_id=101&section_id2=258&section_id3=402"
    ),
    "해외증시": (
        "/news/news_list.naver"
        "?mode=LSS3D&section_id=101&section_id2=258&section_id3=403"
    ),
    "채권/선물": (
        "/news/news_list.naver"
        "?mode=LSS3D&section_id=101&section_id2=258&section_id3=404"
    ),
    "공시/메모": (
        "/news/news_list.naver"
        "?mode=LSS3D&section_id=101&section_id2=258&section_id3=406"
    ),
    "환율": (
        "/news/news_list.naver"
        "?mode=LSS3D&section_id=101&section_id2=258&section_id3=429"
    ),
}


# -------------------------------------------------
# 0) 안전한 요청 함수 (안전 모드)
# -------------------------------------------------
def safe_get(url: str, headers: dict | None = None, timeout: int = 10):
    """
    requests.get 래퍼.
    - 429 / 5xx 등에서 살짝 쉬어주고 None 리턴
    - 기타 RequestException도 None 리턴
    """
    try:
        res = requests.get(url, headers=headers, timeout=timeout)
    except requests.exceptions.RequestException as e:
        print(f"[WARN] 요청 실패: {e}")
        # 네트워크 에러 났으면 조금 쉬었다가 상위 로직에서 건너뛰기
        time.sleep(random.uniform(3, 5))
        return None

    if res.status_code == 429:
        print("[WARN] 429 Too Many Requests → 1분 정도 휴식 권장")
        time.sleep(random.uniform(60, 90))
        return None

    if 500 <= res.status_code < 600:
        print(f"[WARN] 서버 에러 {res.status_code} → 잠깐 쉬기")
        time.sleep(random.uniform(5, 15))

    if res.status_code >= 400:
        print(f"[WARN] HTTP {res.status_code} 에러 ({url})")
        return None

    return res


# -------------------------------------------------
# 1) HTML 가져오기
# -------------------------------------------------
def get_soup(url: str) -> BeautifulSoup:
    """URL에서 HTML을 가져와 BeautifulSoup 객체로 반환 (리스트 페이지용)"""
    full_url = url if url.startswith("http") else BASE_URL + url
    res = safe_get(full_url, headers=HEADERS, timeout=10)
    if res is None:
        raise RuntimeError(f"요청 실패: {full_url}")

    # 네이버 금융 리스트 페이지 인코딩
    res.encoding = "euc-kr"
    return BeautifulSoup(res.text, "html.parser")


# -------------------------------------------------
# 2) 날짜 유틸: 문자열 → YYYYMMDD / 날짜 리스트 생성
# -------------------------------------------------
def normalize_date(date_str: str) -> str:
    """
    'YYYYMMDD' 또는 'YYYY-MM-DD' 둘 다 허용해서
    내부적으로 'YYYYMMDD' 형태로 통일.
    """
    s = date_str.strip()
    if re.fullmatch(r"\d{8}", s):
        return s
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", s):
        return s.replace("-", "")
    raise ValueError("날짜 형식은 'YYYYMMDD' 또는 'YYYY-MM-DD'만 지원합니다.")


def generate_date_list(start_date: str, end_date: str) -> list[str]:
    """
    start_date ~ end_date 사이의 날짜를 'YYYYMMDD' 문자열 리스트로 반환.
    (과거 → 최근 순서)
    """
    start_norm = normalize_date(start_date)
    end_norm = normalize_date(end_date)

    start_dt = datetime.strptime(start_norm, "%Y%m%d")
    end_dt = datetime.strptime(end_norm, "%Y%m%d")

    if start_dt > end_dt:
        start_dt, end_dt = end_dt, start_dt  # 순서 뒤집어서 처리

    dates: list[str] = []
    cur = start_dt
    while cur <= end_dt:
        dates.append(cur.strftime("%Y%m%d"))
        cur += timedelta(days=1)
    return dates


# -------------------------------------------------
# 3) 가운데 영역(ul.realtimeNewsList) 뉴스 링크 수집
# -------------------------------------------------
def collect_article_links_from_list_page(list_url: str) -> list[dict]:
    """
    지정된 리스트 URL(카테고리+date+page)에 대해
    가운데 영역(ul.realtimeNewsList)의 뉴스들만 대상으로
    링크 + 리스트에서 보이는 제목을 수집.
    """
    soup = get_soup(list_url)
    ul = soup.find("ul", class_="realtimeNewsList")

    if ul is None:
        print("-> realtimeNewsList 를 찾지 못했습니다. (구조 변경 가능성)")
        return []

    # 상단/하단 dl 안의 dd.articleSubject, dt.articleSubject 전부 타켓
    subject_nodes = ul.find_all(["dd", "dt"], class_="articleSubject")

    found: list[dict] = []
    for subj in subject_nodes:
        a = subj.find("a", href=True)
        if not a:
            continue

        href = a["href"].strip()

        # finance 스타일(news_read.naver) 링크인지 먼저 체크
        if "news_read.naver" in href:
            # 상대경로(/news/...)라면 finance.naver.com 기준
            if href.startswith("http"):
                article_url = href
            else:
                article_url = urljoin(BASE_URL, href)
        else:
            # 그 외는 n.news로 처리
            if href.startswith("http"):
                article_url = href
            else:
                article_url = urljoin("https://n.news.naver.com", href)

        raw_title = a.get("title") or a.get_text(strip=True)
        title = raw_title.strip()
        if len(title) < 2:
            continue

        found.append(
            {
                "title_from_list": title,
                "url": article_url,
            }
        )

    print(f"-> 가운데 영역에서 뉴스 {len(found)}개 추출")
    return found


# -------------------------------------------------
# 4) 해당 날짜의 '마지막 페이지' 번호 구하기 (맨뒤 버튼 이용)
# -------------------------------------------------
def get_last_page_for_date(base_path: str, date_yyyymmdd: str) -> int:
    """
    특정 카테고리(base_path) + 날짜(date=YYYYMMDD)에 대해
    페이지 네비게이션(Nnavi)을 읽어서 마지막 page 번호를 구하고,
    없으면 1로 가정.
    """
    # 기본적으로 page=1로 접속
    first_url = f"{base_path}&date={date_yyyymmdd}&page=1"
    try:
        soup = get_soup(first_url)
    except Exception as e:
        print(f"! 날짜 {date_yyyymmdd} 첫 페이지 요청 실패: {e}")
        return 1

    nav_table = soup.find("table", class_="Nnavi")
    if not nav_table:
        # 페이지 네비가 없으면 페이지가 1개뿐이라고 가정하고 진행
        print("-> 페이지 네비게이션 없음: 1페이지로 가정")
        return 1

    last_page = 1

    # 1) '맨뒤' 링크(td.pgRR) 우선 사용
    pg_rr = nav_table.find("td", class_="pgRR")
    if pg_rr:
        a = pg_rr.find("a", href=True)
        if a:
            parsed = urlparse(a["href"])
            qs = parse_qs(parsed.query)
            p = qs.get("page", [None])[0]
            if p and p.isdigit():
                last_page = int(p)
                print(f"    -> 맨뒤 페이지: {last_page}")
                return last_page

    # 2) 그 외에는 a 태그들에서 page 최대값 찾기
    for a in nav_table.find_all("a", href=True):
        parsed = urlparse(a["href"])
        qs = parse_qs(parsed.query)
        p = qs.get("page", [None])[0]
        if p and p.isdigit():
            last_page = max(last_page, int(p))

    print(f"-> 네비게이션에서 추정한 마지막 페이지: {last_page}")
    return max(last_page, 1)


# -------------------------------------------------
# 5) finance URL → n.news URL 변환
# -------------------------------------------------
def finance_to_news_url(url: str) -> str:
    """
    finance.naver.com/news_read.naver?article_id=...&office_id=...
    → n.news.naver.com/mnews/article/{office_id}/{article_id} 로 변환.
    이미 n.news.naver.com / news.naver.com 이면 그대로 반환.
    """
    parsed = urlparse(url)
    host = parsed.netloc

    # 이미 뉴스 도메인(n.news.naver.com / news.naver.com)이면 그대로 사용
    if host.endswith("news.naver.com"):
        return url

    # finance.naver.com 의 news_read.naver 만 변환
    if host == "finance.naver.com" and "news_read.naver" in parsed.path:
        qs = parse_qs(parsed.query)
        aid = qs.get("article_id", [None])[0]
        oid = qs.get("office_id", [None])[0]

        if aid and oid:
            return f"https://n.news.naver.com/mnews/article/{oid}/{aid}"

    # 그 외는 원본 유지
    return url


# -------------------------------------------------
# 6) 뉴스 페이지에서 뉴스제목/날짜/본문 추출
# -------------------------------------------------
def extract_article_detail(article_url: str, debug: bool = False) -> dict:
    """
    n.news.naver.com (또는 finance → 변환) 뉴스 페이지에서
      - title  : 뉴스제목
      - date   : 뉴스 날짜
      - content: 본문(article#dic_area 기준)
    을 추출해 dict로 반환.
    """
    news_url = finance_to_news_url(article_url)

    headers = dict(HEADERS)
    headers["Referer"] = BASE_URL

    res = safe_get(news_url, headers=headers, timeout=10)
    if res is None:
        raise RuntimeError(f"뉴스 요청 실패: {news_url}")

    if debug:
        print(f"[DETAIL] 요청 URL: {news_url}, status={res.status_code}")

    res.encoding = "utf-8"
    soup = BeautifulSoup(res.text, "html.parser")

    # 뉴스제목
    headline = ""
    h_tag = soup.select_one(
        "h2.media_end_head_headline, "
        "h3#articleTitle, h2#articleTitle"
    )
    if h_tag:
        headline = h_tag.get_text(" ", strip=True)

    # 날짜
    news_date = ""
    date_tag = soup.select_one(
        "span.media_end_head_info_datestamp_time._ARTICLE_DATE_TIME, "
        "span._ARTICLE_DATE_TIME"
    )
    if date_tag:
        news_date = (date_tag.get("data-date-time") or "").strip()
        if not news_date:
            news_date = date_tag.get_text(strip=True)

    if not news_date:
        page_text = soup.get_text(" ", strip=True)
        m = re.search(r"\d{4}\.\d{2}\.\d{2}\s*[^\d]{0,3}\d{1,2}:\d{2}", page_text)
        if m:
            news_date = m.group(0)
        else:
            m2 = re.search(r"\d{4}\.\d{2}\.\d{2}", page_text)
            if m2:
                news_date = m2.group(0)

    # 본문
    content = ""
    article_tag = soup.find("article", id="dic_area")
    if not article_tag:
        article_tag = soup.find("article", class_="_article_content")

    if article_tag:
        content = article_tag.get_text(" ", strip=True)

    if debug:
        print(f"[DETAIL] 뉴스제목: {headline}")
        print(f"[DETAIL] 날짜: {news_date}")
        print(f"[DETAIL] 본문 길이: {len(content)}")

    return {
        "title": headline,
        "date": news_date,
        "content": content,
    }


# -------------------------------------------------
# 7) DB 저장
# -------------------------------------------------
def save_rows_to_db(rows: list[dict]) -> None:
    """
    수집된 뉴스 목록을 데이터베이스에 저장.
    이미 존재하는 URL은 건너뜀.
    """
    if not rows:
        print("저장할 데이터가 없습니다.")
        return

    session = SessionLocal()
    try:
        urls = [row["url"] for row in rows]
        existing_urls: set[str] = set()
        if urls:
            stmt = select(NewsArticle.url).where(NewsArticle.url.in_(urls))
            existing_urls = set(session.execute(stmt).scalars())

        new_articles: list[NewsArticle] = []
        for row in rows:
            if row["url"] in existing_urls:
                continue
            new_articles.append(
                NewsArticle(
                    category=row["뉴스카테고리"],
                    title=row["뉴스제목"],
                    content=row["뉴스내용"],
                    url=row["url"],
                    source=SOURCE_NAME,
                    published_at_text=row["뉴스날짜"],
                )
            )

        if not new_articles:
            print("신규 뉴스가 없어 DB 저장을 건너뜁니다.")
            return

        session.add_all(new_articles)
        session.commit()
        print(f"\n총 {len(new_articles)}개의 뉴스를 DB에 저장했습니다.")
    except SQLAlchemyError as exc:
        session.rollback()
        print(f"DB 저장 중 오류 발생: {exc}")
        raise
    finally:
        session.close()


def flush_rows_buffer(buffer: list[dict]) -> None:
    """
    버퍼에 쌓인 rows를 DB에 저장하고 비웁니다.
    """
    if not buffer:
        return
    save_rows_to_db(buffer)
    buffer.clear()


# -------------------------------------------------
# 7) 날짜 범위 + 모든 페이지 크롤링 (안전 버전)
# -------------------------------------------------
def crawl_news_focus_date_range(
    start_date: str,
    end_date: str,
):
    """
    start_date ~ end_date 범위(포함)의 날짜에 대해,
    각 카테고리별로 해당 날짜의 모든 페이지를 돌아가며

    id, 뉴스카테고리, 뉴스날짜(뉴스 실제 날짜),
    뉴스제목, 뉴스내용, url

    을 CSV로 저장.
    (안전 모드: 뉴스/날짜/카테고리 단위로 random sleep 포함)
    """
    date_list = generate_date_list(start_date, end_date)
    print(f"[INFO] 날짜 범위: {date_list[0]} ~ {date_list[-1]} ({len(date_list)}일)")

    rows: list[dict] = []
    article_id = 1
    
    # 카테고리 + 정규화된 뉴스 URL 기준으로 중복 방지
    visited_keys: set[str] = set()

    for category_name, base_path in CATEGORY_URLS.items():
        print(f"\n[카테고리] {category_name}")

        for date_yyyymmdd in date_list:
            print(f"[날짜] {date_yyyymmdd} 처리 중...")

            last_page = get_last_page_for_date(base_path, date_yyyymmdd)
            print(f"-> 총 {last_page} 페이지")

            for page in range(1, last_page + 1):
                list_url = f"{base_path}&date={date_yyyymmdd}&page={page}"
                print(f"[페이지] {page} URL={list_url}")

                try:
                    article_links = collect_article_links_from_list_page(list_url)
                except Exception as e:
                    print(f"      ! 리스트 수집 실패: {e}")
                    continue

                print(f"      -> 뉴스 {len(article_links)}개 발견")

                for idx, item in enumerate(article_links, start=1):
                    # 1) finance → n.news 형태로 정규화 (canonical URL)
                    canonical_url = finance_to_news_url(item["url"])

                    # 2) 카테고리별 중복 제거 key (카테고리까지 포함)
                    visit_key = f"{category_name}|{canonical_url}"

                    if visit_key in visited_keys:
                        # 같은 카테고리 안에서 이미 수집한 뉴스면 스킵
                        continue
                    visited_keys.add(visit_key)

                    print(f"({article_id}) 뉴스 내용 크롤링 중...")
                    debug_flag = False

                    try:
                        detail = extract_article_detail(item["url"], debug=debug_flag)
                    except Exception as e:
                        print(f"! 뉴스 크롤링 에러로 건너뜀: {e}")
                        continue

                    final_title = detail["title"] or item["title_from_list"]

                    rows.append(
                        {
                            "id": article_id,
                            "뉴스카테고리": category_name,
                            "뉴스날짜": detail["date"],
                            "뉴스제목": final_title,
                            "뉴스내용": detail["content"],
                            # 저장할 url도 정규화된 n.news 주소로
                            "url": canonical_url,
                        }
                    )
                    article_id += 1

                    time.sleep(random.uniform(0.3, 0.8))

                    if len(rows) >= BATCH_SAVE_SIZE:
                        print(f"[INFO] 누적 {len(rows)}건 → 중간 저장")
                        flush_rows_buffer(rows)


            # 날짜 하나 끝날 때 쉬기 (2 ~ 4초)
            time.sleep(random.uniform(2, 4))

        # 카테고리 하나 끝날 때 쉬기 (5 ~ 10초)
        time.sleep(random.uniform(5, 10))

    if not rows:
        print("수집된 데이터가 없습니다.")
        return

    flush_rows_buffer(rows)


if __name__ == "__main__":
    # 이곳을 수정해서 원하는 시간 설졍
    crawl_news_focus_date_range(
        start_date="2025-11-01",           # 시작일 (YYYYMMDD or YYYY-MM-DD)
        end_date="2025-11-25",             # 종료일
    )
