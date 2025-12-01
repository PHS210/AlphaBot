// src/global.d.ts

interface ImportMetaEnv {
  // .env 파일에서 사용하는 모든 환경 변수의 타입을 여기에 정의합니다.
  // 예시: VITE_API_BASE_URL
  readonly VITE_API_BASE_URL: string;

  // 다른 변수들도 추가할 수 있습니다.
  // readonly VITE_SOME_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}