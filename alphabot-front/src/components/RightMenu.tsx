import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from './Button/Button'; 
import { FaBars, FaHistory, FaTrash, FaUser, FaSignOutAlt, FaBookmark } from 'react-icons/fa';
import StockSearch from './StockSearch';

interface RightMenuProps {
  onSelectStock?: (stock: any) => void;
}

export default function RightMenu({ onSelectStock }: RightMenuProps) {
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
    <aside className="sidebar right">
      <Button 
        variant="primary" 
        size="medium" 
        onClick={() => navigate('/bookmarks')}
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
        <div style={{ marginTop: '12px' }}>
          <StockSearch onSelectStock={handleStockSelect} />
        </div>
      )}
      
      <Button 
        variant="ghost" 
        size="medium" 
        onClick={() => navigate('/trash')}
      >
        <FaTrash /> 휴지통
      </Button>

      <Button 
        variant="secondary" 
        size="medium" 
        onClick={() => navigate('/mypage')}
      >
        <FaUser /> 마이페이지
      </Button>

      <Button 
        variant="primary" 
        size="medium" 
        onClick={() => navigate('/bookmarks')}
      >
        <FaBookmark /> 저장된 메시지
      </Button>

      <Button 
        variant="ghost" 
        size="medium" 
        onClick={handleLogout}
      >
        <FaSignOutAlt /> 로그아웃
      </Button>
    </aside>
  );
}