import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useNavigate, useParams } from 'react-router-dom';
import ChatArea from '../components/ChatArea';
import LeftSidebar from '../components/LeftSidebar';
import RightMenu from '../components/RightMenu';
import { FaUser } from 'react-icons/fa';

interface Stock {
  code: string;
  name: string;
  exchange: string;
  currentPrice: number;
  change: number;
  changePercent: number;
}

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const { stockCode: stockCodeParam } = useParams<{ stockCode?: string }>();
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);

  useEffect(() => {
    if (!stockCodeParam) {
      setSelectedStock(null);
      return;
    }
    const normalized = stockCodeParam.toUpperCase();
    setSelectedStock((prev) => {
      if (prev && prev.code === normalized) {
        return prev;
      }
      return {
        code: normalized,
        name: normalized,
        exchange: '',
        currentPrice: 0,
        change: 0,
        changePercent: 0,
      };
    });
  }, [stockCodeParam]);

  const handleSelectStock = (stock: Stock) => {
    setSelectedStock(stock);
    navigate(`/chat/${encodeURIComponent(stock.code)}`);
  };

  const handleClearSelection = () => {
    setSelectedStock(null);
    navigate('/chat');
  };

  const handleGoToMyPage = () => {
    navigate('/mypage');
  };

  return (
    <Container>
      <ChatHeader>
        <HeaderContent>
          <Logo>
            <LogoIcon>💼</LogoIcon>
            <LogoText>Alpha Bot</LogoText>
          </Logo>
          
          <HeaderRight>
          {selectedStock && (
            <SelectedStockInfo>
              <StockBadge>
                <StockCode>{selectedStock.code}</StockCode>
                <StockName>{selectedStock.name}</StockName>
              </StockBadge>
              <ClearButton onClick={handleClearSelection} title="종목 선택 해제">
                ✕
              </ClearButton>
            </SelectedStockInfo>
          )}
            <MyPageButton type="button" onClick={handleGoToMyPage}>
              <FaUser aria-hidden />
              <span>마이페이지</span>
            </MyPageButton>
          </HeaderRight>
        </HeaderContent>
      </ChatHeader>

      <MainContent>
        <LeftSidebar
          selectedStockCode={selectedStock?.code}
          onSelectStock={handleSelectStock}
        />
        <ChatArea stockCode={selectedStock?.code} />
        <RightMenu onSelectStock={handleSelectStock} />
      </MainContent>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f7f7f8;
`;

const ChatHeader = styled.header`
  background: #ffffff;
  border-bottom: 1px solid #e5e5e5;
  padding: 12px 20px;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
`;

const HeaderContent = styled.div`
  max-width: 100%;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 24px;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`;

const LogoIcon = styled.span`
  font-size: 24px;
`;

const LogoText = styled.span`
  font-size: 18px;
  font-weight: 700;
  color: #202123;
`;

const HeaderRight = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const SelectedStockInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f0f7ff;
  border: 1px solid #d0e7ff;
  border-radius: 8px;
  flex-shrink: 0;
`;

const StockBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StockCode = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: #4169e1;
`;

const StockName = styled.span`
  font-size: 13px;
  color: #565869;
`;

const ClearButton = styled.button`
  background: transparent;
  border: none;
  color: #8e8ea0;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 14px;
  transition: all 0.2s;

  &:hover {
    background: #e5e5e5;
    color: #565869;
  }
`;

const MainContent = styled.main`
  flex: 1;
  overflow: hidden;
  display: flex;
  width: 100%;
`;

const MyPageButton = styled.button`
  background: #4169e1;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);

  &:hover {
    background: #3558b8;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

export default ChatPage;
