const React = require('react');
const { renderToBuffer, Document, Page, Text, View, Font } = require('@react-pdf/renderer');
const fs = require('fs');

Font.register({
  family: 'NanumGothic',
  fonts: [
    { src: 'public/fonts/NanumGothic-Regular.ttf', fontWeight: 'normal' },
    { src: 'public/fonts/NanumGothic-Bold.ttf', fontWeight: 'bold' },
    { src: 'public/fonts/NanumGothic-ExtraBold.ttf', fontWeight: 800 },
  ],
});
Font.registerHyphenationCallback((w) => [w]);

// Simulate partner report text
const TEXT = `파트너 통합 보고서 - Rosumeg Combigel
Laboratorios Prieto, Distrago Quimica-Panama S.A., U.S Pharmacy Systems Inc.
매출규모·파이프라인·제조소 보유·수입 경험·약국체인 운영 평가 기준에 따라 추천 기업 순위 배열.
파나마 제약시장 규모는 USD 534.5M (Statista 2024), 최근 5년 CAGR 약 9.0% 성장세.
Rosuvastatin + Omega-3-acid ethyl esters 복합제 Rosumeg Combigel의 예상 FOB 가격은 PAB 0.08.
저가 진입(PAB 0.06), 기준가(PAB 0.08), 프리미엄(PAB 0.10) 시나리오.
KRW 환산 시 약 120원 / 캡슐. 30캡슐 팩 구성 시 USD 2.40 / 팩.`;

const Doc = () => React.createElement(Document, null,
  React.createElement(Page, { size: 'A4', style: { fontFamily: 'NanumGothic', padding: 40, fontSize: 10 } },
    React.createElement(View, null,
      React.createElement(Text, null, TEXT),
      React.createElement(Text, { style: { fontWeight: 'bold', marginTop: 10 } }, '굵게: 시장조사 및 수출가격 분석 · ACODECO/PanamaCompra 참조'),
      React.createElement(Text, { style: { fontWeight: 800, marginTop: 10 } }, '아주 굵게: ⚠ 상기 가격은 FOB 역산 시뮬레이션'),
    )
  )
);

(async () => {
  try {
    const buf = await renderToBuffer(React.createElement(Doc));
    fs.writeFileSync('test-comprehensive.pdf', buf);
    console.log('SUCCESS: wrote', buf.length);
  } catch (e) {
    console.error('FAIL:', e.message);
    console.error(e.stack?.split('\n').slice(0, 8).join('\n'));
  }
})();
