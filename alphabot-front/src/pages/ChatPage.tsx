// 기존에 app.tsx에 있던 내용을 아예 페이지 컴포넌트로 만듬. 로그인페이지와 웰컴페이지 라우팅을 위해서.

import React, { useState } from 'react';
import Header from '../components/Header';
import LeftSidebar from '../components/LeftSidebar';
import RightMenu from '../components/RightMenu';
import ChatArea from '../components/ChatArea';
import StockDetail from '../components/StockDetail';

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

const MainPage: React.FC = () => {
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);

  const handleSelectStock = (stock: any) => {
    // Mock: 전체 데이터 채우기
    const fullStock: Stock = {
      ...stock,
      open: stock.currentPrice * 0.99,
      high: stock.currentPrice * 1.02,
      low: stock.currentPrice * 0.97,
      volume: 45000000,
      marketCap: 2900000000000,
      pe: 28.5,
      eps: 6.25,
      dividend: 0.52,
    };
    setSelectedStock(fullStock);
  };

  return (
    <div className="app">
      <Header />
      <main className="main">
        <LeftSidebar />
        <ChatArea />
        <RightMenu onSelectStock={handleSelectStock} />
      </main>

      {selectedStock && (
        <StockDetail stock={selectedStock} onClose={() => setSelectedStock(null)} />
      )}
    </div>
  );
};

export default MainPage;