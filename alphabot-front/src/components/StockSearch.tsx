import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { FaSearch, FaTimes } from 'react-icons/fa';

interface Stock {
  code: string;
  name: string;
  exchange: string;
  currentPrice: number;
  change: number;
  changePercent: number;
}

interface StockSearchProps {
  onSelectStock?: (stock: Stock) => void;
}

const StockSearch: React.FC<StockSearchProps> = ({ onSelectStock }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(['AAPL', 'MSFT', 'GOOGL']);
  const searchRef = useRef<HTMLDivElement>(null);

  // Mock 주식 데이터
  const mockStocks: Stock[] = [
    { code: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', currentPrice: 178.25, change: 2.15, changePercent: 1.22 },
    { code: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', currentPrice: 378.91, change: -1.32, changePercent: -0.35 },
    { code: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ', currentPrice: 141.80, change: 0.95, changePercent: 0.67 },
    { code: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', currentPrice: 502.10, change: 12.40, changePercent: 2.53 },
    { code: 'TSLA', name: 'Tesla, Inc.', exchange: 'NASDAQ', currentPrice: 248.50, change: -3.25, changePercent: -1.29 },
    { code: 'AMZN', name: 'Amazon.com, Inc.', exchange: 'NASDAQ', currentPrice: 178.35, change: 1.80, changePercent: 1.02 },
    { code: 'META', name: 'Meta Platforms, Inc.', exchange: 'NASDAQ', currentPrice: 498.75, change: 5.60, changePercent: 1.14 },
  ];

  const filteredStocks = searchTerm
    ? mockStocks.filter(stock =>
        stock.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (stock: Stock) => {
    setSearchTerm('');
    setIsOpen(false);
    
    // 최근 검색어에 추가
    setRecentSearches(prev => {
      const filtered = prev.filter(item => item !== stock.code);
      return [stock.code, ...filtered].slice(0, 5);
    });

    if (onSelectStock) {
      onSelectStock(stock);
    }
  };

  const getStockFromTerm = (term: string): Stock => {
    const normalized = term.toUpperCase();
    const matched = mockStocks.find(
      stock =>
        stock.code.toLowerCase() === term.toLowerCase() ||
        stock.name.toLowerCase() === term.toLowerCase(),
    );
    if (matched) {
      return matched;
    }
    return {
      code: normalized,
      name: normalized,
      exchange: '',
      currentPrice: 0,
      change: 0,
      changePercent: 0,
    };
  };

  const handleSubmitSearch = () => {
    const term = searchTerm.trim();
    if (!term) return;
    handleSearch(getStockFromTerm(term));
  };

  const handleRecentSearch = (code: string) => {
    const stock = mockStocks.find(s => s.code === code);
    if (stock) {
      handleSearch(stock);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleDeleteRecentSearch = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches(prev => prev.filter(item => item !== code));
  };

  return (
    <Container ref={searchRef}>
      <SearchBox>
        <SearchIcon>
          <FaSearch />
        </SearchIcon>
        <SearchInput
          type="text"
          placeholder="종목명 또는 티커를 검색하세요 (예: AAPL, Apple)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSubmitSearch();
            }
          }}
        />
        {searchTerm && (
          <ClearButton onClick={handleClearSearch}>
            <FaTimes />
          </ClearButton>
        )}
      </SearchBox>

      {isOpen && (
        <DropdownContainer>
          {!searchTerm && recentSearches.length > 0 && (
            <Section>
              <SectionTitle>최근 검색</SectionTitle>
              {recentSearches.map(code => (
                <RecentItem key={code} onClick={() => handleRecentSearch(code)}>
                  <RecentCode>{code}</RecentCode>
                  <DeleteRecentButton onClick={(e) => handleDeleteRecentSearch(code, e)}>
                    <FaTimes size={12} />
                  </DeleteRecentButton>
                </RecentItem>
              ))}
            </Section>
          )}

          {searchTerm && filteredStocks.length === 0 && (
            <EmptyResult>검색 결과가 없습니다.</EmptyResult>
          )}

          {searchTerm && filteredStocks.length > 0 && (
            <Section>
              <SectionTitle>검색 결과 ({filteredStocks.length})</SectionTitle>
              {filteredStocks.map(stock => (
                <StockItem key={stock.code} onClick={() => handleSearch(stock)}>
                  <StockInfo>
                    <StockCode>{stock.code}</StockCode>
                    <StockName>{stock.name}</StockName>
                    <Exchange>{stock.exchange}</Exchange>
                  </StockInfo>
                  <PriceInfo>
                    <Price>${stock.currentPrice.toFixed(2)}</Price>
                    <Change isPositive={stock.change >= 0}>
                      {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%)
                    </Change>
                  </PriceInfo>
                </StockItem>
              ))}
            </Section>
          )}
        </DropdownContainer>
      )}
    </Container>
  );
};

const Container = styled.div`
  position: relative;
  width: 100%;
`;

const SearchBox = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 14px;
  color: #8e8ea0;
  pointer-events: none;
  display: flex;
  align-items: center;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 40px;
  background: #f7f7f8;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 14px;
  color: #202123;
  transition: all 0.2s;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: #4169e1;
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(65, 105, 225, 0.1);
  }

  &::placeholder {
    color: #8e8ea0;
  }
`;

const ClearButton = styled.button`
  position: absolute;
  right: 10px;
  padding: 6px;
  background: transparent;
  border: none;
  color: #8e8ea0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    background: #e5e5e5;
    color: #565869;
  }
`;

const DropdownContainer = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: #ffffff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  max-height: 400px;
  overflow-y: auto;
  z-index: 1000;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: #d9d9e3;
    border-radius: 3px;
  }
`;

const Section = styled.div`
  padding: 8px 0;
`;

const SectionTitle = styled.div`
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  color: #8e8ea0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const RecentItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #f7f7f8;
  }
`;

const RecentCode = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #4169e1;
`;

const DeleteRecentButton = styled.button`
  padding: 6px;
  background: transparent;
  border: none;
  color: #8e8ea0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    background: #fee;
    color: #e74c3c;
  }
`;

const StockItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #f7f7f8;
  }
`;

const StockInfo = styled.div`
  flex: 1;
`;

const StockCode = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #202123;
  margin-bottom: 4px;
`;

const StockName = styled.div`
  font-size: 13px;
  color: #565869;
  margin-bottom: 6px;
`;

const Exchange = styled.div`
  display: inline-block;
  padding: 3px 8px;
  background: #f0f7ff;
  color: #4169e1;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
`;

const PriceInfo = styled.div`
  text-align: right;
`;

const Price = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #202123;
  margin-bottom: 4px;
`;

const Change = styled.div<{ isPositive: boolean }>`
  font-size: 12px;
  font-weight: 600;
  color: ${props => props.isPositive ? '#10a37f' : '#ef4444'};
`;

const EmptyResult = styled.div`
  padding: 32px 20px;
  text-align: center;
  color: #8e8ea0;
  font-size: 14px;
`;

export default StockSearch;
