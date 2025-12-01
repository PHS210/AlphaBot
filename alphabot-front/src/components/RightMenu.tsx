import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import Button from './Button/Button'; 
import { FaBars, FaHistory, FaTrash, FaSignOutAlt, FaBookmark, FaComments } from 'react-icons/fa';
import StockSearch from './StockSearch';

interface RightMenuProps {
  onSelectStock?: (stock: any) => void;
  selectedStockCode?: string | null;
  selectedStockName?: string | null;
}

export default function RightMenu({ onSelectStock, selectedStockCode }: RightMenuProps) {
  const navigate = useNavigate();
  const [showStockSearch, setShowStockSearch] = useState(false);

  const handleLogout = () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      alert('로그아웃되었습니다.');
      navigate('/login');
    }
  };

  const handleStockSelect = (stock: any) => {
    if (onSelectStock) {
      onSelectStock(stock);
    }
    setShowStockSearch(false);
  };

  return (
    <Sidebar>
      <Button 
        variant="primary" 
        size="medium" 
        onClick={() => navigate('/admin/categories')}
      >
        <FaBars /> 카테고리
      </Button>
      
      <Button 
        variant="secondary" 
        size="medium" 
        onClick={() => setShowStockSearch(!showStockSearch)}
      >
        <FaHistory /> {showStockSearch ? '검색 닫기' : '종목 검색'}
      </Button>
      
      {showStockSearch && (
        <SearchContainer>
          <StockSearch onSelectStock={handleStockSelect} />
        </SearchContainer>
      )}
      
      <Button 
        variant="ghost" 
        size="medium" 
        onClick={() => navigate('/trash')}
      >
        <FaTrash /> 휴지통
      </Button>

      <Button 
        variant="primary" 
        size="medium" 
        onClick={() => navigate('/bookmarks')}
      >
        <FaBookmark /> 저장된 메시지
      </Button>

      <Button 
        variant="primary" 
        size="medium" 
        onClick={() => {
          if (selectedStockCode) {
            navigate(`/discussion/${selectedStockCode}`)
          } else {
            navigate('/discussion')
          }
        }}
      >
        <FaComments /> 종목 토론
      </Button>

      <Button 
        variant="ghost" 
        size="medium" 
        onClick={handleLogout}
      >
        <FaSignOutAlt /> 로그아웃
      </Button>
    </Sidebar>
  );
}

const Sidebar = styled.aside`
  width: 240px;
  background: #ffffff;
  border-left: 1px solid #e5e5e5;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;

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

const SearchContainer = styled.div`
  margin-top: 12px;
`;
