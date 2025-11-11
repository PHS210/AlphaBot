# 7. Implementation requirements

본 문서는 웹사이트 서비스의 안정적인 배포 및 운영을 위한 최소/권장 구현 사양을 정의합니다.

## 7.1 H/W 플랫폼 요구 사양

### 7.1.1 클라이언트 (Client Access Environment)
사용자는 별도 H/W 요구 사양 없이, 인터넷에 연결된 모던 디바이스를 통해 접속합니다.

| 구분 | 요구 사양 | 비고 |
|---|---|---|
| Target Device | PC (Windows/Mac), 모바일 (Smartphone), 태블릿 | 반응형 웹(RWD) 디자인 필수 |
| RAM | 4GB 이상 권장 | 원활한 브라우저 구동 |
| 네트워크 | 광대역 인터넷 (Wi-Fi, LTE, 5G) | TCP/IP 기반, 실시간 통신 |

### 7.1.2 서버 (Server)
GCP(Google Cloud Platform) 기반을 전제로 하며, 초기 트래픽을 감당할 수 있는 최소한의 상용 사양(t2/t3 small 이상급)으로 설정합니다.

| 구분 | 인스턴스 유형 | CPU (vCPU) | RAM (GB) | 스토리지 (GB) | 비고 |
|---|---|---|---|---|---|
| Web/App Server | GCP Compute Engine (예: t4g.small or t3.small) | 2 vCPU | 2 GB | 50 GB (gp3) | 비용 효율적인 Graviton(ARM) t4g 권장 |
| DB Server | GCP Cloud SQL (예: db.t4g.small or db.t3.small) | 2 vCPU | 2 GB | 100 GB (gp3) | t2 계열은 구형이며 성능 제한이 심함 |
| Static Assets | GCP Cloud Storage & CloudFront | - | - | - | (필수) 웹 리소스(JS/CSS/Image) CDN 배포 |

## 7.2 S/W 플랫폼 요구 사양

### 7.2.1 클라이언트 (Client Access Environment)
사용자가 접속하는 브라우저의 호환성 요구 사양입니다.

| 항목 | 요구 사양 | 비고 |
|---|---|---|
| PC 브라우저 | Chrome <br>Safari <br>Edge (Chromium) <br>Firefox | |
| 모바일 브라우저 | Safari <br>Chrome | |
| 화면 | 반응형 웹 (RWD) | 모바일/태블릿/PC 뷰포트 완벽 지원 |

### 7.2.2 서버 & 개발 스택 (Server & Development Stack)
안정성 및 보안을 위해 LTS(Long Term Support) 버전을 기준으로 합니다.

| 구분 | 항목 | 요구 사양 | 비고 |
|---|---|---|---|
| Server | OS | Ubuntu 22.04 LTS | |
| | Web Server | Nginx (최신 안정 버전) | 리버스 프록시, SSL/TLS, 로드 밸런싱 |
| | DBMS | PostgreSQL 15+ | |
| Stack | Backend | FastAPI 0.111.0+ | |
| | Frontend | React 19+ | |
| | 언어 | TypeScript 5.x+ (권장) | |
| 개발 환경 | OS | Windows 10/11, macOS | |
| | IDE | Cursor (권장) | |

# 8. Glossary

- **KST (Korea Standard Time)**: 한국 표준시(UTC+9). 문서의 시간 표기 기준.
- **Rate Limit (레이트 리밋)**: 시스템·게이트웨이가 허용하는 요청 빈도 제한 정책.
- **Cache (캐시) / Cache Miss (캐시 미스)**: 결과를 임시 저장하여 재사용 / 캐시에 결과가 없어 원본 조회가 필요한 상태.
- **Realized / Unrealized P&L (실현/미실현 손익)**: 매매로 확정된 손익 / 보유 중 평가손익.
- **WebSocket (웹소켓)**: 서버↔클라이언트 양방향 실시간 통신.
- **CDN (Content Delivery Network)**: 정적 리소스를 지리적으로 분산 캐싱/전송하는 네트워크.
- **LTS (Long Term Support)**: 장기 지원 버전. 안정적 유지보수와 보안 패치 제공 기간이 김.

