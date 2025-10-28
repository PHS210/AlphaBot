"""Utilities for collecting and storing company data from Yahoo Finance.

Features:
- Read ticker symbols from `app/pipelines/data/sp500_tickers.csv`.
- Fetch summary info and financial statements (annual, quarterly) via yfinance.
- Upsert into database models defined in `app/models/models.py` (Stock, FinancialStatement).
"""

from __future__ import annotations

import argparse
import csv
import sys
from itertools import islice
from pathlib import Path
from datetime import date, datetime
from typing import Any, Dict, Iterable, Iterator, List, Optional, Sequence, Tuple
import time
import random

import requests
import yfinance as yf
from sqlalchemy.orm import Session

# ORM models and DB session
from app.models.models import (
    Stock,
    FinancialStatement,
    ReportTypeEnum,
)
from app.db.database import SessionLocal

# Optional imports used for type and value handling
try:
    import pandas as pd
except Exception as e:  # pragma: no cover - defensive import
    print(f"[stock_collector] pandas import failed: error={e!r}")
    pd = None  # type: ignore
try:
    from pandas import Timestamp as _PandasTimestamp  # type: ignore
except Exception as e:  # pragma: no cover - defensive import
    print(f"[stock_collector] pandas.Timestamp import failed: error={e!r}; using stub")
    class _PandasTimestamp:  # type: ignore
        ...

YF_SCREENER_URL = "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved"
YF_US_SCREENER_ID = "universe_us"
DEFAULT_PAGE_SIZE = 250
DEFAULT_SP500_CSV = Path(__file__).with_name("data").joinpath("sp500_tickers.csv")

# Throttling configuration
MIN_DELAY_S = 0.5
MAX_DELAY_S = 1.2
MIN_PAGE_DELAY_S = 0.6
MAX_PAGE_DELAY_S = 1.5


def _sleep(min_s: float = MIN_DELAY_S, max_s: float = MAX_DELAY_S) -> None:
    try:
        duration = random.uniform(min_s, max_s)
    except Exception as e:
        print(f"[stock_collector] _sleep: random.uniform failed, error={e!r}")
        duration = min_s
    print(f"[stock_collector] sleep {duration:.2f}s (throttle)")
    time.sleep(duration)

def _chunked(iterable: Sequence[str] | Iterable[str], size: int) -> Iterator[List[str]]:
    """Yield items from *iterable* in lists of length *size*."""

    print(f"[stock_collector] _chunked: size={size}")

    if size <= 0:
        raise ValueError("Chunk size must be greater than zero")

    it = iter(iterable)
    while True:
        chunk = list(islice(it, size))
        if not chunk:
            return
        yield chunk


# --------- Helpers for parsing and normalization ---------

def _norm_label(label: str) -> str:
    """Normalize a financial line-item label for robust matching."""

    print(f"[stock_collector] _norm_label: label={label!r}")

    return "".join(ch for ch in label.lower() if ch.isalnum())


def _first_matching_row(df: Any, candidates: Sequence[str]) -> Optional[str]:
    """Return the first row name in df that best matches any candidate.

    Matching strategy:
    1) Exact normalized equality
    2) Substring containment (either direction) on normalized labels
    """

    try:
        print(f"[stock_collector] _first_matching_row: candidates_count={len(candidates)}")
    except Exception as e:
        print(f"[stock_collector] _first_matching_row: failed to print candidates_count, error={e!r}")
    

    if df is None:
        print(f"[stock_collector] _first_matching_row: df is None")
        return None
    #print(f"[stock_collector] _first_matching_row: df={df}")
    try:
        print(f"[stock_collector] _first_matching_row: trying to read index")
        print(f"[stock_collector] _first_matching_row: df={df}")
        #index_values = list(getattr(df, "index", []) or [])
        idx = getattr(df, "index", None)
        index_values = list(idx) if idx is not None else []
        print(f"[stock_collector] _first_matching_row: index_values={index_values}")
    except Exception as e:
        print(f"[stock_collector] _first_matching_row: failed to read index, error={e!r}")
        return None

    normalized_to_original: Dict[str, str] = { _norm_label(str(idx)): str(idx) for idx in index_values }

    # 1) Exact
    for cand in candidates:
        cand_norm = _norm_label(cand)
        if cand_norm in normalized_to_original:
            print(f"[stock_collector] _first_matching_row: exact match found: {normalized_to_original[cand_norm]}")
            return normalized_to_original[cand_norm]

    # 2) Substring containment
    for cand in candidates:
        cand_norm = _norm_label(cand)
        for idx_norm, original in normalized_to_original.items():
            if cand_norm in idx_norm or idx_norm in cand_norm:
                print(f"[stock_collector] _first_matching_row: substring match found: {original}")
                return original

    # One-time debug snapshot to help diagnose mismatches
    try:
        preview = ", ".join(list(map(str, index_values[:8])))
        print(f"[stock_collector] _first_matching_row: no match. index preview=[{preview}]")
    except Exception as e:
        print(f"[stock_collector] _first_matching_row: failed to print index preview, error={e!r}")

    return None


def _to_int(value: Any) -> Optional[int]:
    try:
        if value is None:
            return None
        # Handle pandas NA/NaN
        if pd is not None and pd.isna(value):  # type: ignore[attr-defined]
            return None
        # Handle numeric strings with commas or parentheses
        if isinstance(value, str):
            s = value.strip()
            negative = s.startswith("(") and s.endswith(")")
            if negative:
                s = s[1:-1]
            s = s.replace(",", "")
            val = float(s)
            if negative:
                val = -val
            return int(round(val))
        return int(round(float(value)))
    except Exception as e:
        print(f"[stock_collector] _to_int: failed to convert value={value!r}, error={e!r}")
        return None


def _to_float(value: Any) -> Optional[float]:
    try:
        if value is None:
            return None
        if pd is not None and pd.isna(value):  # type: ignore[attr-defined]
            return None
        if isinstance(value, str):
            s = value.strip()
            negative = s.startswith("(") and s.endswith(")")
            if negative:
                s = s[1:-1]
            s = s.replace(",", "")
            val = float(s)
            return -val if negative else val
        return float(value)
    except Exception as e:
        print(f"[stock_collector] _to_float: failed to convert value={value!r}, error={e!r}")
        return None


def _to_date(col_label: Any) -> Optional["date"]:
    from datetime import date, datetime

    try:
        if isinstance(col_label, _PandasTimestamp):  # type: ignore
            return col_label.date()  # type: ignore[return-value]
        if isinstance(col_label, datetime):
            return col_label.date()
        if isinstance(col_label, date):
            return col_label
        # Try pandas to_datetime for strings
        if pd is not None:
            ts = pd.to_datetime(col_label, errors="coerce")  # type: ignore[attr-defined]
            if ts is not None and not pd.isna(ts):  # type: ignore[attr-defined]
                return ts.date()  # type: ignore[return-value]
    except Exception as e:
        print(f"[stock_collector] _to_date: failed to convert col_label={col_label!r}, error={e!r}")
        return None
    return None


def _to_timestamp_from_epoch(value: Any) -> Optional["datetime"]:
    from datetime import datetime, timezone

    print(f"[stock_collector] _to_timestamp_from_epoch: value={value}")

    try:
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return datetime.fromtimestamp(int(value), tz=timezone.utc)
        # Some APIs return pandas Timestamp
        if isinstance(value, _PandasTimestamp):  # type: ignore
            return value.to_pydatetime().replace(tzinfo=timezone.utc)
    except Exception as e:
        print(f"[stock_collector] _to_timestamp_from_epoch: failed to convert value={value!r}, error={e!r}")
        return None
    return None


def _read_sp500_tickers(csv_path: Path = DEFAULT_SP500_CSV) -> List[str]:
    """Read ticker symbols from the CSV file, ignoring empty and comment lines."""

    print(f"[stock_collector] _read_sp500_tickers: csv_path={csv_path}")

    tickers: List[str] = []
    with csv_path.open("r", encoding="utf-8") as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            tickers.append(line.split(",")[0].strip().upper())
    return tickers


def fetch_company_snapshot(ticker: str) -> Dict[str, Any]:
    """Fetch a concise set of company metrics from Yahoo Finance."""

    print(f"[stock_collector] fetch_company_snapshot: ticker={ticker}")

    ticker_obj = yf.Ticker(ticker)
    info = ticker_obj.get_info()

    snapshot: Dict[str, Any] = {
        "ticker": ticker.upper(),
        "long_name": info.get("longName"),
        "currency": info.get("currency"),
        "market_cap": info.get("marketCap"),
        "regular_market_price": info.get("currentPrice") or info.get("regularMarketPrice"),
        "previous_close": info.get("previousClose"),
        "day_low": info.get("dayLow"),
        "day_high": info.get("dayHigh"),
        "fifty_two_week_low": info.get("fiftyTwoWeekLow"),
        "fifty_two_week_high": info.get("fiftyTwoWeekHigh"),
        "dividend_yield": info.get("dividendYield"),
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "website": info.get("website"),
    }

    return snapshot


# --------- DB upsert logic for Stock and FinancialStatement ---------

_INFO_FIELD_MAP: Dict[str, str] = {
    # Stock.basic
    "longName": "company_name",
    "sector": "sector",
    "industry": "industry",
    "country": "country",
    "website": "website",
    "fullTimeEmployees": "full_time_employees",
    "longBusinessSummary": "business_summary",
    # Market data
    "currentPrice": "current_price",
    "regularMarketPrice": "current_price",  # fallback
    "previousClose": "previous_close",
    "open": "open",
    "dayHigh": "day_high",
    "dayLow": "day_low",
    "marketCap": "market_cap",
    "volume": "volume",
    "averageDailyVolume10Day": "average_volume_10d",
    # Valuation
    "trailingPE": "pe_ratio",
    "forwardPE": "forward_pe",
    "priceToBook": "pbr",
    "priceToSalesTrailing12Months": "psr",
    "trailingEps": "eps",
    "forwardEps": "forward_eps",
    "enterpriseValue": "enterprise_value",
    "enterpriseToRevenue": "enterprise_to_revenue",
    "enterpriseToEbitda": "enterprise_to_ebitda",
    # Financial health
    "profitMargins": "profit_margins",
    "operatingMargins": "operating_margins",
    "grossMargins": "gross_margins",
    "returnOnAssets": "roa",
    "returnOnEquity": "roe",
    "totalDebt": "total_debt",
    "totalCash": "total_cash",
    "debtToEquity": "debt_to_equity",
    "freeCashflow": "free_cashflow",
    "revenueGrowth": "revenue_growth",
    "earningsGrowth": "earnings_growth",
    # Price history
    "fiftyTwoWeekHigh": "fifty_two_week_high",
    "fiftyTwoWeekLow": "fifty_two_week_low",
    "fiftyDayAverage": "fifty_day_average",
    "twoHundredDayAverage": "two_hundred_day_average",
    "beta": "beta",
    # Dividends & analyst
    "dividendRate": "dividend_rate",
    "dividendYield": "dividend_yield",
    "payoutRatio": "payout_ratio",
    "exDividendDate": "ex_dividend_date",
    "lastDividendValue": "last_dividend_value",
    "recommendationKey": "recommendation",
    "targetMeanPrice": "target_mean_price",
    "targetHighPrice": "target_high_price",
    "targetLowPrice": "target_low_price",
    "numberOfAnalystOpinions": "number_of_analyst_opinions",
}


def _upsert_stock(session: Session, ticker: str, info: Dict[str, Any]) -> Stock:
    """Create or update a Stock row based on yfinance info payload."""

    print(f"[stock_collector] _upsert_stock: ticker={ticker}")

    code = ticker.upper()
    print(f"[stock_collector] _upsert_stock: code={code}")
    # code가 존재하지 않으면 None을 반환
    stock: Optional[Stock] = session.get(Stock, code)
    print(f"[stock_collector] _upsert_stock: stock={stock}")
    if stock is None:
        stock = Stock(code=code)
        # code가 존재하지 않으면 새로운 Stock 객체를 생성하고 세션에 추가
        session.add(stock)

    # 매핑된 필드를 적절한 형식으로 할당
    for yf_key, model_attr in _INFO_FIELD_MAP.items():
        val = info.get(yf_key)
        if model_attr in {
            "company_name",
            "sector",
            "industry",
            "country",
            "website",
            "business_summary",
            "recommendation",
        }:
            setattr(stock, model_attr, None if val is None else str(val))
        elif model_attr in {
            "full_time_employees",
            "market_cap",
            "volume",
            "average_volume_10d",
            "enterprise_value",
            "number_of_analyst_opinions",
        }:
            setattr(stock, model_attr, _to_int(val))
        elif model_attr in {
            "current_price",
            "previous_close",
            "open",
            "day_high",
            "day_low",
            "pe_ratio",
            "forward_pe",
            "pbr",
            "psr",
            "eps",
            "forward_eps",
            "enterprise_to_revenue",
            "enterprise_to_ebitda",
            "profit_margins",
            "operating_margins",
            "gross_margins",
            "roa",
            "roe",
            "debt_to_equity",
            "revenue_growth",
            "earnings_growth",
            "fifty_two_week_high",
            "fifty_two_week_low",
            "fifty_day_average",
            "two_hundred_day_average",
            "beta",
            "dividend_rate",
            "dividend_yield",
            "payout_ratio",
            "last_dividend_value",
            "target_mean_price",
            "target_high_price",
            "target_low_price",
        }:
            setattr(stock, model_attr, _to_float(val))
        elif model_attr == "total_debt":
            setattr(stock, model_attr, _to_int(val))
        elif model_attr == "total_cash":
            setattr(stock, model_attr, _to_int(val))
        elif model_attr == "free_cashflow":
            setattr(stock, model_attr, _to_int(val))
        elif model_attr == "ex_dividend_date":
            setattr(stock, model_attr, _to_timestamp_from_epoch(val))

    return stock


def _get_df(t: yf.Ticker, attr: str) -> Optional[Any]:
    #print(f"[stock_collector] _get_df: attr={attr}")
    # Small throttle since yfinance may fetch lazily per attribute
    _sleep(0.2, 0.6)
    try:
        df = getattr(t, attr, None)
        if df is None:
            print(f"[stock_collector] _get_df: df is None")
            return None
        # yfinance sometimes exposes callables
        if callable(df):
            df = df()
            print(f"[stock_collector] _get_df: df is callable")
        # Empty DataFrame guard
        try:
            #print(f"[stock_collector] _get_df: df.empty={df.empty}")
            if hasattr(df, "empty") and df.empty:  # type: ignore[attr-defined]
                return None
        except Exception as e:
            print(f"[stock_collector] _get_df: failed checking df.empty, error={e!r}")
        #print(f"[stock_collector] _get_df: df={df}")
        return df
    except Exception as e:
        print(f"[stock_collector] _get_df: failed to get attr={attr!r}, error={e!r}")
        return None


def _get_value(df: Any, candidates: Sequence[str], period_col: Any) -> Optional[int]:
    """Return integer value for the first matching row at given period column."""

    try:
        print(f"[stock_collector] _get_value: candidates_count={len(candidates)}, period_col={period_col}")
    except Exception as e:
        print(f"[stock_collector] _get_value: failed to print debug, error={e!r}")

    if df is None:
        print(f"[stock_collector] _get_value: df is None")
        return None
    row_name = _first_matching_row(df, candidates)
    if row_name is None:
        print(f"[stock_collector] _get_value: row_name is None")
        return None
    try:
        print(f"[stock_collector] _get_value: trying df.loc[row_name, period_col]")
        val = df.loc[row_name, period_col]
    except Exception as e:
        print(f"[stock_collector] _get_value: primary lookup failed (row={row_name}, col={period_col}), error={e!r}")
        # Some frames have transposed orientation, try the opposite
        try:
            print(f"[stock_collector] _get_value: trying df.loc[period_col, row_name]")
            val = df.loc[period_col, row_name]
        except Exception as e2:
            print(f"[stock_collector] _get_value: secondary lookup failed (row={row_name}, col={period_col}), error={e2!r}")
            print(f"[stock_collector] _get_value: val is None")
            return None
    return _to_int(val)


INCOME_ROWS = {
    "revenue": [
        "Total Revenue",
        "TotalRevenue",
        "totalRevenue",
        "Revenue",
        "SalesRevenueNet",
        "RevenueFromContractWithCustomerExcludingAssessedTax",
    ],
    "gross_profit": [
        "Gross Profit",
        "GrossProfit",
        "GrossProfitIncomeStatement",
    ],
    "operating_income": [
        "Operating Income",
        "OperatingIncome",
        "Operating Income or Loss",
        "OperatingIncomeLoss",
        "OperatingIncomeLossIncomeStatement",
    ],
    "ebitda": [
        "EBITDA",
        "Ebitda",
        "EarningsBeforeInterestTaxesDepreciationAmortization",
    ],
    "net_income": [
        "Net Income",
        "NetIncome",
        "Net Income Common Stockholders",
        "NetIncomeApplicableToCommonShares",
        "ProfitLoss",
        "NetIncomeLoss",
    ],
}


BALANCE_ROWS = {
    "total_assets": [
        "Total Assets",
        "TotalAssets",
        "Assets",
    ],
    "total_liabilities": [
        "Total Liabilities Net Minority Interest",
        "Total Liabilities",
        "TotalLiabilitiesNetMinorityInterest",
        "TotalLiabilities",
        "Liabilities",
    ],
    "total_equity": [
        "Total Stockholder Equity",
        "Total equity",
        "TotalEquityGrossMinorityInterest",
        "TotalStockholderEquity",
        "StockholdersEquity",
        "Equity",
    ],
}


CASHFLOW_ROWS = {
    "operating_cash_flow": [
        "Operating Cash Flow",
        "OperatingCashFlow",
        "Total Cash From Operating Activities",
        "Net Cash Provided By Operating Activities",
    ],
    "investing_cash_flow": [
        "Investing Cash Flow",
        "InvestingCashFlow",
        "Total Cashflows From Investing Activities",
        "Net Cash Used For Investing Activities",
    ],
    "financing_cash_flow": [
        "Financing Cash Flow",
        "FinancingCashFlow",
        "Total Cash From Financing Activities",
        "Net Cash Provided By (Used In) Financing Activities",
    ],
    "free_cash_flow": [
        "Free Cash Flow",
        "FreeCashFlow",
    ],
}


def _save_financials(session: Session, stock_code: str, t: yf.Ticker, report_type: ReportTypeEnum) -> int:
    """Create or update FinancialStatement rows for the given ticker and report type.

    Returns number of statements upserted.
    """

    print(f"[stock_collector] _save_financials: stock_code={stock_code}, report_type={report_type.value}")

    if report_type == ReportTypeEnum.annual:
        income_df = _get_df(t, "financials")
        bs_df = _get_df(t, "balance_sheet")
        cf_df = _get_df(t, "cashflow")
        #print(f"[stock_collector] _save_financials: income_df={income_df}")
        #print(f"[stock_collector] _save_financials: bs_df={bs_df}")
        #print(f"[stock_collector] _save_financials: cf_df={cf_df}")
    else:
        income_df = _get_df(t, "quarterly_financials")
        bs_df = _get_df(t, "quarterly_balance_sheet")
        cf_df = _get_df(t, "quarterly_cashflow")
        #print(f"[stock_collector] _save_financials: income_df={income_df}")
        #print(f"[stock_collector] _save_financials: bs_df={bs_df}")
        #print(f"[stock_collector] _save_financials: cf_df={cf_df}")
    # Collect all period columns present
    columns: List[Any] = []
    for df in (income_df, bs_df, cf_df):
        try:
            if df is not None:
                for col in list(df.columns):
                    if col not in columns:
                        columns.append(col)
                        print(f"[stock_collector] _save_financials: columns={columns}")
        except Exception as e:
            print(f"[stock_collector] _save_financials: columns error, error={e!r}")
            continue

    upserted = 0
    for col in sorted(columns, key=lambda c: str(c)):
        period = _to_date(col)
        if period is None:
            continue

        # Try to find existing row
        existing: Optional[FinancialStatement] = (
            session.query(FinancialStatement)
            .filter(
                FinancialStatement.stock_code == stock_code,
                FinancialStatement.report_period == period,
                FinancialStatement.report_type == report_type,
            )
            .one_or_none()
        )

        if existing is None:
            fs = FinancialStatement(
                stock_code=stock_code,
                report_period=period,
                report_type=report_type,
            )
            session.add(fs)
        else:
            fs = existing

        # Fill values from each dataframe
        # Income
        revenue_val = _get_value(income_df, INCOME_ROWS["revenue"], col)
        gross_profit_val = _get_value(income_df, INCOME_ROWS["gross_profit"], col)
        operating_income_val = _get_value(income_df, INCOME_ROWS["operating_income"], col)
        ebitda_val = _get_value(income_df, INCOME_ROWS["ebitda"], col)
        net_income_val = _get_value(income_df, INCOME_ROWS["net_income"], col)
        print(f"[stock_collector] income mapped: revenue={revenue_val}, gross={gross_profit_val}, op={operating_income_val}, ebitda={ebitda_val}, net={net_income_val}")
        fs.revenue = revenue_val
        fs.gross_profit = gross_profit_val
        fs.operating_income = operating_income_val
        fs.ebitda = ebitda_val
        fs.net_income = net_income_val
        print(f"[stock_collector] _save_financials: fs={fs}")
        # Balance sheet
        total_assets_val = _get_value(bs_df, BALANCE_ROWS["total_assets"], col)
        total_liabilities_val = _get_value(bs_df, BALANCE_ROWS["total_liabilities"], col)
        total_equity_val = _get_value(bs_df, BALANCE_ROWS["total_equity"], col)
        print(f"[stock_collector] balance mapped: assets={total_assets_val}, liab={total_liabilities_val}, equity={total_equity_val}")
        fs.total_assets = total_assets_val
        fs.total_liabilities = total_liabilities_val
        fs.total_equity = total_equity_val
        print(f"[stock_collector] _save_financials: fs={fs}")
        # Cash flow
        op_cf_val = _get_value(cf_df, CASHFLOW_ROWS["operating_cash_flow"], col)
        inv_cf_val = _get_value(cf_df, CASHFLOW_ROWS["investing_cash_flow"], col)
        fin_cf_val = _get_value(cf_df, CASHFLOW_ROWS["financing_cash_flow"], col)
        fcf_val = _get_value(cf_df, CASHFLOW_ROWS["free_cash_flow"], col)
        print(f"[stock_collector] cashflow mapped: op={op_cf_val}, inv={inv_cf_val}, fin={fin_cf_val}, fcf={fcf_val}")
        fs.operating_cash_flow = op_cf_val
        fs.investing_cash_flow = inv_cf_val
        fs.financing_cash_flow = fin_cf_val
        fs.free_cash_flow = fcf_val
        print(f"[stock_collector] _save_financials: fs={fs}")
        upserted += 1

    return upserted


def ingest_ticker(session: Session, ticker: str) -> None:
    """Fetch and store both Stock summary and its financial statements."""

    print(f"[stock_collector] ingest_ticker: ticker={ticker}")
    # Throttle before making requests for this ticker
    _sleep()

    t = yf.Ticker(ticker)
    print(f"[stock_collector] ingest_ticker: t={t}")
    info = t.get_info()
    stock = _upsert_stock(session, ticker, info)

    # Save statements
    print(
        f"[stock_collector] ReportTypeEnum.annual obj={ReportTypeEnum.annual}, "
        f"name={ReportTypeEnum.annual.name}, value={ReportTypeEnum.annual.value}"
    )
    _save_financials(session, stock.code, t, ReportTypeEnum.annual)
    print(
        f"[stock_collector] ReportTypeEnum.quarterly obj={ReportTypeEnum.quarterly}, "
        f"name={ReportTypeEnum.quarterly.name}, value={ReportTypeEnum.quarterly.value}"
    )
    _save_financials(session, stock.code, t, ReportTypeEnum.quarterly)


def print_snapshot(snapshot: Dict[str, Any]) -> None:
    """Print the collected snapshot in a readable format."""

    try:
        print(f"[stock_collector] print_snapshot: keys={list(snapshot.keys())[:5]}")
    except Exception as e:
        print(f"[stock_collector] print_snapshot: failed to print keys, error={e!r}; snapshot")

    print("\n[Yahoo Finance Snapshot]")
    for key, value in snapshot.items():
        print(f"- {key}: {value}")


def collect_many(tickers: Iterable[str]) -> Dict[str, Dict[str, Any]]:
    """Fetch snapshots for multiple tickers and print each result."""

    try:
        print(f"[stock_collector] collect_many: count={len(list(tickers))}")
    except Exception as e:
        print(f"[stock_collector] collect_many: failed to print count, error={e!r}")

    results: Dict[str, Dict[str, Any]] = {}
    for ticker in tickers:
        snapshot = fetch_company_snapshot(ticker)
        print_snapshot(snapshot)
        results[ticker.upper()] = snapshot
    return results


def fetch_all_us_ticker_symbols(
    *,
    page_size: int = DEFAULT_PAGE_SIZE,
    limit: int | None = None,
) -> List[str]:
    """Retrieve every U.S. ticker symbol exposed by Yahoo's screener."""

    print(f"[stock_collector] fetch_all_us_ticker_symbols: page_size={page_size}, limit={limit}")

    symbols: set[str] = set()
    offset = 0

    while True:
        params = {
            "scrIds": YF_US_SCREENER_ID,
            "count": page_size,
            "offset": offset,
        }
        response = requests.get(YF_SCREENER_URL, params=params, timeout=15)
        response.raise_for_status()
        payload = response.json()

        result = payload.get("finance", {}).get("result", [])
        if not result:
            break

        quotes = result[0].get("quotes", [])
        if not quotes:
            break

        for quote in quotes:
            symbol = quote.get("symbol")
            if symbol:
                symbols.add(symbol.upper())
                if limit is not None and len(symbols) >= limit:
                    return sorted(symbols)

        offset += page_size

        if len(quotes) < page_size:
            break

        # Throttle between page requests
        _sleep(MIN_PAGE_DELAY_S, MAX_PAGE_DELAY_S)

    return sorted(symbols)


def collect_all_us_companies(
    *,
    limit: int | None = None,
    page_size: int = DEFAULT_PAGE_SIZE,
    batch_size: int = 50,
) -> Iterator[Tuple[str, Dict[str, Any]]]:
    """Fetch company snapshots for the entire U.S. ticker universe."""

    print(f"[stock_collector] collect_all_us_companies: limit={limit}, page_size={page_size}, batch_size={batch_size}")

    tickers = fetch_all_us_ticker_symbols(page_size=page_size, limit=limit)
    print(f"Total U.S. tickers fetched: {len(tickers)}")
    print(f"Collecting Yahoo Finance snapshots in batches of {batch_size}...")

    for chunk in _chunked(tickers, batch_size):
        chunk_results = collect_many(chunk)
        for symbol, data in chunk_results.items():
            yield symbol, data


def ingest_from_csv(csv_path: Path = DEFAULT_SP500_CSV, *, limit: Optional[int] = None) -> None:
    """Read tickers from CSV and ingest to DB."""

    print(f"[stock_collector] ingest_from_csv: csv_path={csv_path}, limit={limit}")

    tickers = _read_sp500_tickers(csv_path)
    print(tickers)
    if limit is not None:
        tickers = tickers[:limit]

    print(f"Ingesting {len(tickers)} tickers from {csv_path}...")
    db: Session = SessionLocal()
    print(f"[stock_collector] ingest_from_csv: db={db}")
    try:
        for i, sym in enumerate(tickers, 1):
            try:
                ingest_ticker(db, sym)
                if i % 5 == 0:
                    db.commit()
                print(f"[{i}/{len(tickers)}] Ingested {sym}")
            except Exception as e:
                db.rollback()
                print(f"Error ingesting {sym}: {e}")
            # Throttle between tickers to avoid rate limits
            _sleep()
        db.commit()
    finally:
        db.close()


def main(argv: list[str] | None = None) -> None:
    """Collect stock data using CLI arguments."""

    print(f"[stock_collector] main: argv={argv}")

    parser = argparse.ArgumentParser(description="Yahoo Finance stock collector")
    parser.add_argument(
        "tickers",
        nargs="*",
        help="Ticker symbols to fetch (defaults to AAPL if not provided)",
    )
    parser.add_argument(
        "--us-all",
        action="store_true",
        help="Fetch snapshots for all U.S. tickers listed by Yahoo Finance",
    )
    parser.add_argument(
        "--sp500",
        action="store_true",
        help="Read S&P 500 tickers from CSV and save to DB",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit the number of tickers when using --us-all (useful for testing)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=50,
        help="Number of symbols to process per batch when using --us-all",
    )
    parser.add_argument(
        "--page-size",
        type=int,
        default=DEFAULT_PAGE_SIZE,
        help="Yahoo Finance page size for pagination when loading U.S. tickers",
    )
    parser.add_argument(
        "--csv-path",
        type=str,
        default=str(DEFAULT_SP500_CSV),
        help="Path to S&P 500 tickers CSV file",
    )

    args = parser.parse_args(argv or sys.argv[1:])

    if args.sp500:
        ingest_from_csv(Path(args.csv_path), limit=args.limit)
    elif args.us_all:
        for _symbol, _data in collect_all_us_companies(
            limit=args.limit,
            page_size=args.page_size,
            batch_size=args.batch_size,
        ):
            # Output handled inside collect_many via print_snapshot.
            pass
    else:
        tickers = args.tickers or ["AAPL"]
        # Ingest into DB for ad-hoc tickers as well
        db: Session = SessionLocal()
        try:
            for sym in tickers:
                try:
                    ingest_ticker(db, sym)
                    print(f"Ingested {sym}")
                except Exception as e:
                    db.rollback()
                    print(f"Error ingesting {sym}: {e}")
            db.commit()
        finally:
            db.close()


if __name__ == "__main__":
    main()
