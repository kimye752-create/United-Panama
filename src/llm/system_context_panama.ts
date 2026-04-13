/**
 * 파나마 제약 도메인 컨텍스트 — LLM 분석·보고 시 참고용 (필요 시 system 보조에 주입)
 */
export const PANAMA_DOMAIN_CONTEXT = `
[파나마 제약 도메인 지식 — 분석 시 반드시 적용]

1. 화폐 단위 (Currency Rule)
- 파나마 발보아(PAB)는 미국 달러(USD)와 1:1 고정 환율(Pegged)
- 가격 기호가 "B/." 이든 "$" 이든 모두 USD 동일 가치 취급
- 환율 변환 로직 절대 적용 금지

2. 스페인어 제형 매핑 (Linguistic Rule)
- Tableta / Tab / Comp / Comprimido = 정제 (알약)
- Cápsula / Cap = 캡슐
- Jarabe / Jbe = 시럽 (Levodropropizine 타겟)
- Suspensión / Susp = 현탁액
- Gotas = 점적액
- Inyectable / Amp / Ampolla = 주사제 (자사 8 INN 타겟 아님 → 필터 아웃)

3. 경쟁사 티어 구분 (Competitor Taxonomy)
- Tier 1 (글로벌 오리지널): Pfizer, GSK, Sanofi, Novartis → 최고가 정책
- Tier 2 (중남미 권역 제네릭): Genfar(콜롬비아/Sanofi 자회사), Roemmers(아르헨티나), Stein(코스타리카), Bagó → 중간 가격, 1차 경쟁 타겟
- Tier 3 (파나마 로컬 제네릭): Medipan, Rigar, Lafsa → 최저가 방어선

4. 한국유나이티드제약 포지셔닝 전략
- Tier 3보다 비싸게, Tier 1보다 싸게, Tier 2와 유사한 가격대
- 무기: "고품질 + 한국=고위생국가(WLA) 패스트트랙"
- WLA 효과: 위생등록 심사 기존 2~3년 → 대폭 단축 (Law 419, 2024.02 발효)
`.trim();
