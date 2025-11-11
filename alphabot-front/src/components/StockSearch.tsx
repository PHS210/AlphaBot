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
  left: 12px;
  color: var(--color-muted);
  pointer-events: none;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 36px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 13px;
  color: var(--color-text);
  transition: all 0.3s;

  &:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  &::placeholder {
    color: var(--color-muted);
  }
`;

const ClearButton = styled.button`
  position: absolute;
  right: 8px;
  padding: 6px;
  background: transparent;
  border: none;
  color: var(--color-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;

  &:hover {
    background: var(--color-accent);
    color: var(--color-text);
  }
`;

const DropdownContainer = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: var(--color-panel);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  max-height: 350px;
  overflow-y: auto;
  z-index: 1000;
`;

const Section = styled.div`
  padding: 8px 0;
`;

const SectionTitle = styled.div`
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-muted);
  text-transform: uppercase;
`;

const RecentItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: var(--color-card);
  }
`;

const RecentCode = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
`;

const DeleteRecentButton = styled.button`
  padding: 4px;
  background: transparent;
  border: none;
  color: var(--color-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;

  &:hover {
    background: var(--color-accent);
    color: #e74c3c;
  }
`;

const StockItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid var(--color-border);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: var(--color-card);
  }
`;

const StockInfo = styled.div`
  flex: 1;
`;

const StockCode = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 2px;
`;

const StockName = styled.div`
  font-size: 12px;
  color: var(--color-muted);
  margin-bottom: 2px;
`;

const Exchange = styled.div`
  display: inline-block;
  padding: 2px 6px;
  background: rgba(65, 105, 225, 0.2);
  color: var(--color-primary);
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
`;

const PriceInfo = styled.div`
  text-align: right;
`;

const Price = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 2px;
`;

const Change = styled.div<{ isPositive: boolean }>`
  font-size: 11px;
  font-weight: 600;
  color: ${props => props.isPositive ? '#27ae60' : '#e74c3c'};
`;

const EmptyResult = styled.div`
  padding: 30px 20px;
  text-align: center;
  color: var(--color-muted);
  font-size: 13px;
`;

export default StockSearch;

