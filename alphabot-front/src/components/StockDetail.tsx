import React, { useState } from 'react';
import styled from 'styled-components';
import { FaTimes, FaStar, FaRegStar } from 'react-icons/fa';

interface Stock {
  code: string;
  name: string;
  exchange: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  marketCap: number;
  pe: number;
  eps: number;
  dividend: number;
}

interface StockDetailProps {
  stock: Stock;
  onClose: () => void;
}

const StockDetail: React.FC<StockDetailProps> = ({ stock, onClose }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'financial'>('info');
  const [isWatchlisted, setIsWatchlisted] = useState(false);

  const handleToggleWatchlist = () => {
    setIsWatchlisted(!isWatchlisted);
    alert(isWatchlisted ? '관심 종목에서 제거되었습니다.' : '관심 종목에 추가되었습니다.');
  };

  // Mock 재무제표 데이터
  const financialData = {
    revenue: [
      { period: '2024 Q1', value: 94.8 },
      { period: '2023 Q4', value: 119.6 },
      { period: '2023 Q3', value: 89.5 },
      { period: '2023 Q2', value: 81.8 },
    ],
    netIncome: [
      { period: '2024 Q1', value: 23.6 },
      { period: '2023 Q4', value: 33.9 },
      { period: '2023 Q3', value: 23.0 },
      { period: '2023 Q2', value: 19.9 },
    ],
    assets: 353.5,
    liabilities: 258.5,
    equity: 95.0,
  };

  const formatNumber = (num: number) => {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    return num.toLocaleString();
  };

  return (
    <Overlay onClick={onClose}>
      <Container onClick={(e) => e.stopPropagation()}>
        <Header>
          <HeaderLeft>
            <StockCode>{stock.code}</StockCode>
            <StockName>{stock.name}</StockName>
            <Exchange>{stock.exchange}</Exchange>
          </HeaderLeft>
          <HeaderRight>
            <WatchlistButton onClick={handleToggleWatchlist}>
              {isWatchlisted ? <FaStar color="#f39c12" /> : <FaRegStar />}
              관심 종목
            </WatchlistButton>
            <CloseButton onClick={onClose}>
              <FaTimes />
            </CloseButton>
          </HeaderRight>
        </Header>

        <PriceSection>
          <CurrentPrice>${stock.currentPrice.toFixed(2)}</CurrentPrice>
          <PriceChange isPositive={stock.change >= 0}>
            {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%)
          </PriceChange>
        </PriceSection>

        <TabContainer>
          <Tab active={activeTab === 'info'} onClick={() => setActiveTab('info')}>
            상세 정보
          </Tab>
          <Tab active={activeTab === 'financial'} onClick={() => setActiveTab('financial')}>
            재무제표
          </Tab>
        </TabContainer>

        <Content>
          {activeTab === 'info' && (
            <InfoGrid>
              <InfoCard>
                <InfoLabel>시가</InfoLabel>
                <InfoValue>${stock.open.toFixed(2)}</InfoValue>
              </InfoCard>
              <InfoCard>
                <InfoLabel>고가</InfoLabel>
                <InfoValue>${stock.high.toFixed(2)}</InfoValue>
              </InfoCard>
              <InfoCard>
                <InfoLabel>저가</InfoLabel>
                <InfoValue>${stock.low.toFixed(2)}</InfoValue>
              </InfoCard>
              <InfoCard>
                <InfoLabel>거래량</InfoLabel>
                <InfoValue>{formatNumber(stock.volume)}</InfoValue>
              </InfoCard>
              <InfoCard>
                <InfoLabel>시가총액</InfoLabel>
                <InfoValue>${formatNumber(stock.marketCap)}</InfoValue>
              </InfoCard>
              <InfoCard>
                <InfoLabel>P/E Ratio</InfoLabel>
                <InfoValue>{stock.pe.toFixed(2)}</InfoValue>
              </InfoCard>
              <InfoCard>
                <InfoLabel>EPS</InfoLabel>
                <InfoValue>${stock.eps.toFixed(2)}</InfoValue>
              </InfoCard>
              <InfoCard>
                <InfoLabel>배당수익률</InfoLabel>
                <InfoValue>{stock.dividend.toFixed(2)}%</InfoValue>
              </InfoCard>
            </InfoGrid>
          )}

          {activeTab === 'financial' && (
            <FinancialSection>
              <FinancialGroup>
                <GroupTitle>매출 추이 (단위: B)</GroupTitle>
                <Table>
                  <thead>
                    <tr>
                      {financialData.revenue.map(item => (
                        <Th key={item.period}>{item.period}</Th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {financialData.revenue.map(item => (
                        <Td key={item.period}>${item.value}B</Td>
                      ))}
                    </tr>
                  </tbody>
                </Table>
                <ChartBar>
                  {financialData.revenue.map((item, index) => (
                    <BarWrapper key={index}>
                      <Bar height={(item.value / 120) * 100} />
                      <BarLabel>${item.value}B</BarLabel>
                    </BarWrapper>
                  ))}
                </ChartBar>
              </FinancialGroup>

              <FinancialGroup>
                <GroupTitle>순이익 추이 (단위: B)</GroupTitle>
                <Table>
                  <thead>
                    <tr>
                      {financialData.netIncome.map(item => (
                        <Th key={item.period}>{item.period}</Th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {financialData.netIncome.map(item => (
                        <Td key={item.period}>${item.value}B</Td>
                      ))}
                    </tr>
                  </tbody>
                </Table>
              </FinancialGroup>

              <FinancialGroup>
                <GroupTitle>재무상태표 (단위: B)</GroupTitle>
                <BalanceSheet>
                  <BalanceItem>
                    <BalanceLabel>총 자산</BalanceLabel>
                    <BalanceValue>${financialData.assets}B</BalanceValue>
                  </BalanceItem>
                  <BalanceItem>
                    <BalanceLabel>총 부채</BalanceLabel>
                    <BalanceValue>${financialData.liabilities}B</BalanceValue>
                  </BalanceItem>
                  <BalanceItem>
                    <BalanceLabel>자본</BalanceLabel>
                    <BalanceValue>${financialData.equity}B</BalanceValue>
                  </BalanceItem>
                </BalanceSheet>
              </FinancialGroup>
            </FinancialSection>
          )}
        </Content>
      </Container>
    </Overlay>
  );
};

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
`;

const Container = styled.div`
  background: var(--color-panel);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px;
  border-bottom: 1px solid var(--color-border);
`;

const HeaderLeft = styled.div`
  flex: 1;
`;

const StockCode = styled.h1`
  font-size: 32px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 4px;
`;

const StockName = styled.h2`
  font-size: 18px;
  color: var(--color-muted);
  margin-bottom: 8px;
`;

const Exchange = styled.span`
  display: inline-block;
  padding: 4px 12px;
  background: rgba(65, 105, 225, 0.2);
  color: var(--color-primary);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
`;

const HeaderRight = styled.div`
  display: flex;
  gap: 10px;
`;

const WatchlistButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--color-accent);
  }
`;

const CloseButton = styled.button`
  padding: 10px;
  background: transparent;
  border: none;
  color: var(--color-muted);
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;

  &:hover {
    background: var(--color-accent);
    color: var(--color-text);
  }
`;

const PriceSection = styled.div`
  padding: 24px;
  border-bottom: 1px solid var(--color-border);
`;

const CurrentPrice = styled.div`
  font-size: 48px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 8px;
`;

const PriceChange = styled.div<{ isPositive: boolean }>`
  font-size: 20px;
  font-weight: 600;
  color: ${props => props.isPositive ? '#27ae60' : '#e74c3c'};
`;

const TabContainer = styled.div`
  display: flex;
  border-bottom: 2px solid var(--color-border);
  padding: 0 24px;
`;

const Tab = styled.button<{ active: boolean }>`
  padding: 16px 24px;
  background: transparent;
  border: none;
  border-bottom: 3px solid ${props => props.active ? 'var(--color-primary)' : 'transparent'};
  color: ${props => props.active ? 'var(--color-primary)' : 'var(--color-muted)'};
  font-size: 16px;
  font-weight: ${props => props.active ? '600' : '400'};
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: -2px;

  &:hover {
    color: var(--color-primary);
  }
`;

const Content = styled.div`
  padding: 24px;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
`;

const InfoCard = styled.div`
  padding: 16px;
  background: var(--color-card);
  border-radius: 8px;
  border: 1px solid var(--color-border);
`;

const InfoLabel = styled.div`
  font-size: 13px;
  color: var(--color-muted);
  margin-bottom: 8px;
  font-weight: 500;
`;

const InfoValue = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text);
`;

const FinancialSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 30px;
`;

const FinancialGroup = styled.div``;

const GroupTitle = styled.h3`
  font-size: 18px;
  color: var(--color-text);
  margin-bottom: 16px;
  font-weight: 600;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;
`;

const Th = styled.th`
  padding: 12px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  text-align: center;
  font-size: 13px;
  color: var(--color-muted);
  font-weight: 600;
`;

const Td = styled.td`
  padding: 12px;
  border: 1px solid var(--color-border);
  text-align: center;
  font-size: 14px;
  color: var(--color-text);
  font-weight: 600;
`;

const ChartBar = styled.div`
  display: flex;
  gap: 20px;
  align-items: flex-end;
  height: 200px;
  padding: 20px;
  background: var(--color-card);
  border-radius: 8px;
  border: 1px solid var(--color-border);
`;

const BarWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
`;

const Bar = styled.div<{ height: number }>`
  width: 100%;
  height: ${props => props.height}%;
  background: linear-gradient(180deg, var(--color-primary) 0%, #3558b8 100%);
  border-radius: 8px 8px 0 0;
  transition: height 0.3s;
  min-height: 20px;
`;

const BarLabel = styled.div`
  margin-top: 8px;
  font-size: 12px;
  color: var(--color-muted);
  font-weight: 600;
`;

const BalanceSheet = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
`;

const BalanceItem = styled.div`
  padding: 20px;
  background: var(--color-card);
  border-radius: 8px;
  border: 1px solid var(--color-border);
`;

const BalanceLabel = styled.div`
  font-size: 14px;
  color: var(--color-muted);
  margin-bottom: 10px;
  font-weight: 500;
`;

const BalanceValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text);
`;

export default StockDetail;

