import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'
import { FaArrowLeft, FaComments } from 'react-icons/fa'
import StockCommentPanel from '@/components/comment/StockCommentPanel'

export default function StockDiscussionPage() {
  const navigate = useNavigate()
  const { stockCode: urlStockCode } = useParams<{ stockCode?: string }>()
  const [stockCode] = useState<string | null>(urlStockCode?.toUpperCase() || null)

  const handleBack = () => {
    if (stockCode) {
      navigate(`/chat/${stockCode}`)
    } else {
      navigate('/chat')
    }
  }

  return (
    <Container>
      <Header>
        <HeaderContent>
          <BackButton onClick={handleBack}>
            <FaArrowLeft />
            <span>채팅으로 돌아가기</span>
          </BackButton>
          <Title>
            <FaComments />
            <span>종목 토론</span>
          </Title>
        </HeaderContent>
      </Header>

      <MainContent>
        <ContentWrapper>
          {!stockCode ? (
            <EmptyState>
              <EmptyIcon>💬</EmptyIcon>
              <EmptyTitle>종목을 선택해주세요</EmptyTitle>
              <EmptyDescription>
                채팅 페이지에서 종목을 선택한 후 종목 토론을 이용할 수 있습니다.
              </EmptyDescription>
            </EmptyState>
          ) : (
            <StockCommentPanel stockCode={stockCode} stockName={stockCode} variant="page" />
          )}
        </ContentWrapper>
      </MainContent>
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f7f7f8;
`

const Header = styled.header`
  background: #ffffff;
  border-bottom: 1px solid #e5e5e5;
  padding: 16px 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`

const HeaderContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 24px;
`

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #f7f7f8;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  color: #565869;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #e5e5e5;
    color: #202123;
  }
`

const Title = styled.h1`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 24px;
  font-weight: 700;
  color: #202123;
  margin: 0;

  svg {
    color: #4169e1;
  }
`

const MainContent = styled.main`
  flex: 1;
  overflow-y: auto;
  padding: 24px;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: #d9d9e3;
    border-radius: 4px;
  }
`

const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
`

const EmptyIcon = styled.div`
  font-size: 64px;
  margin-bottom: 24px;
  opacity: 0.6;
`

const EmptyTitle = styled.h2`
  font-size: 24px;
  font-weight: 600;
  color: #202123;
  margin: 0 0 12px 0;
`

const EmptyDescription = styled.p`
  font-size: 16px;
  color: #8e8ea0;
  line-height: 1.6;
  max-width: 500px;
  margin: 0;
`

