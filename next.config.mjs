/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Vercel serverless 번들에 PDF 렌더용 폰트 파일을 강제 포함한다.
  // @react-pdf/renderer는 런타임에 fs로 ttf/otf를 읽기 때문에,
  // Next.js 파일 트레이서가 동적 경로(process.cwd() + "public/fonts/...")를
  // 정적 분석할 수 없어 기본적으로 번들에서 빠진다.
  // 이 옵션이 없으면 서버리스 런타임에서 폰트 로딩 실패 → Helvetica 폴백 →
  // 한글 코드포인트가 Latin 글리프로 렌더링 (mojibake).
  // Next 14: outputFileTracingIncludes 는 experimental 하위에 있어야 한다.
  // (Next 15 에서 top-level 로 승격됨)
  experimental: {
    outputFileTracingIncludes: {
      "/api/**/*":                           ["./public/fonts/**/*"],
      "/api/panama/report/combined/**/*":    ["./public/fonts/**/*"],
      "/api/panama/report/partner/**/*":     ["./public/fonts/**/*"],
      "/api/panama/report/pricing/**/*":     ["./public/fonts/**/*"],
      "/api/panama/report/*/*/pdf/**/*":     ["./public/fonts/**/*"],
    },
  },
};

export default nextConfig;
