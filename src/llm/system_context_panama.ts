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

5. PanamaCompra V3 핵심 유통 파트너 (Distribution Partner Intelligence)
- SEVEN PHARMA PANAMA S.A.: INDIA Hetero/Celon 제네릭 유통 최강 (잠재 한국유나이티드 파트너 1순위)
- COMPAÑÍA ASTOR S.A.: Servier (프랑스) + GSK 오리지널 독점 채널 (Sereterol 직접 경쟁사)
- REPRICO S.A.: Merck Colombia Cilostazol 단독 공급 (Ciloduo 직접 경쟁사)
- C.G. DE HASETH & CIA S.A.: Laboratorios Normon (스페인) 유통 (Public 채널)
- MEDIPAN S.A.: 파나마 자체 제조 + 유통 (Tier 3 로컬 제네릭)

6. 파나마 공공조달 가격 패턴 (Public Procurement Price Pattern)
- 동일 제품 동일 공급사도 병원별 수의계약 시 가격 편차 ±20~110%
- → FOB 산정 시 단일 시장가 대신 중앙값 또는 가중평균 사용 권장
- 대량 구매 (10만 정 이상) vs 소량 구매 (1만 정 이하) 가격 차 평균 2배
- INDIA 제네릭 vs ESPAÑA 제네릭 가격 차 미미 (10% 이하), ORIGINAL (Servier/GSK) 30~40% 프리미엄
`.trim();