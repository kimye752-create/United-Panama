# Cursor 구현 지시서 — 파나마 1공정 크롤러

> **세션 16 / 2026-04-13 마무리 + 세션 17 진입**
> 세션 16 버그 4종 + 잘림 모두 통과. prevalence 8 INN 완전 적재. 세션 17 작업 큐 12개 확정.

## 📌 먼저 읽을 것

1. `ARCHITECTURE.md` — 세션 16 마무리 갱신본 (필수)
2. `핸드오프_세션15_to_16.md` — 최신 세션 핸드오프 ⭐
3. `src/config/product-dictionary.ts` — 8 INN UUID 매핑
4. `REPORT1_SPEC.md` — 보고서 1장 설계 명세 (블록 3 항목별 maxLength 갱신본)
5. `USER_FLOW.md` — 전체 유저 플로우
6. `TECHNIQUES_STATUS.md` — 10가지 기법 진척도

## System Role

너는 Cursor IDE의 수석 백엔드 개발자이자 AI 파이프라인 아키텍트다. 파나마 의약품 시장 진출을 위해 23개 사이트(거시 5 / Phase A 공공조달 4 / Phase A 규제 3 / Phase B 민간 8)에서 데이터를 수집하는 초저부하(Polite) 지능형 크롤러를 TypeScript + Playwright로 구축한다.

## 🔑 용어 체계

**수집 시점 (3계층, 폴더 분리 기준)**
- L1 정적 seed (~85%) — `src/seed_loaders/`
- L2 조건부 우리 크롤러 (~10%) — `src/crawlers/preload/`
- L3 실시간 LLM 보강 (~5%) — `src/crawlers/realtime/`

**데이터 채널 (Phase A/B + 규제 + 거시, `pa_source`로 구분)**
- Phase A 공공조달 — PanamaCompra, MINSA faddi, CSS, ACODECO
- Phase A 규제 — DNFD 공공 조회, DNFD 공식, MINSA 메인
- Phase B 민간 소매 — Arrocha(차단), Metro Plus(별도), El Javillo, Revilla, FarmaValue, Saba, Super 99, Riba Smith
- 거시 — World Bank, ITA, KOTRA, PubMed, MOTIE

## ⚠ 절대 원칙 (협상 불가)

1. **수집 시점별 폴더 분리** — L1·L2·L3 코드는 각자 폴더에. 절대 섞지 않음
2. 모든 워크플로우는 `workflow_dispatch`만. cron 절대 금지
3. 분석 버튼 클릭 시 분석 시점 흐름 준수 (L2 크롤링 1~3분 허용, 단계별 표시 UI 필수, 12시간 캐시)
4. `fob_estimated_usd`는 1공정 NULL — FOB 역산 절대 금지
5. LLM 호출은 `MAX_LLM_CALLS_PER_RUN=3` 환경변수 강제
6. 공통 6컬럼(id, product_id, market_segment, fob_estimated_usd, confidence, crawled_at) 이름·타입 변경 금지
7. `any` 타입 절대 금지
8. `.ts`(로직)와 `.tsx`(UI) 엄격 분리
9. **`pa_source_type` 컬럼 사용 금지** — `pa_source`만 사용
10. **문자열 파싱 시 부정 키워드 우선 매칭** ("미포함" → "포함" 순서)
11. **"X건 적재" 보고는 반드시 `SELECT COUNT` 1회 검증 후 신뢰**
12. **freshness 판정은 해법 C (AI 의미 게이트)** — Phase 2 로드맵
13. **`pa_collected_at` 등 timestamp는 DB 실제값만 사용, 하드코딩 금지**
14. **제품 매칭 시 form·strength·unit 다중 필터 필수** — CR/일반, 캡슐/시럽 엄격 구분
15. **PanamaCompra `pa_currency_unit`은 응답값 그대로** — 하드코드 USD 금지
16. **PanamaCompra UNSPSC 51000000 필터 사용 금지** — 키워드 매칭으로 대체
17. **MACRO_PRODUCT_ID 폴백 금지** — 8 INN 매칭 실패 시 INSERT 스킵
18. **🆕 크롤러 작업 완료 기준은 "DB INSERT N행 + SQL 검증"** — 코드 작성·tsc 통과만으로 통과 처리 금지. 외부 가설(Shopify 쉬움 등) 모두 실제 INSERT까지 도달해야 인정. PanamaCompra 0건·Arrocha 차단 교훈
19. **🆕 보고서 prevalence 조회 시 product_id 엄격 일치 + 폴백 금지** — 매칭 실패 시 빈 문자열. 다른 INN 데이터 폴백 절대 금지 (H.pylori 교차오염 교훈)
20. **🆕 보고서 판정근거 항목별 maxLength 차등** — `[200,100,100,100,250]`. 1번 prevalence 풀 인용·5번 파트너 4사 풀 명시 가능. Aceclofenac scope=latam_average는 `splitAceclofenacPrevalenceForBlock3`로 본문 분리 + footer 표시

## 🚀 작업 순서

### ✅ 완료 (세션 1~16)

#### L1 seed 트랙
- [x] db_connector, seed_loaders 6종 (eml, macro, market_intel, regulatory_milestones, prevalence, paho_reference_prices)
- [x] panama 50건 + panama_distributors 4건 + panama_eml 16건 + gemini_prevalence 9건

#### L2 거시 크롤러
- [x] pa_worldbank, pa_ita, pa_kotra, pa_motie, pa_pubmed (5종 정상)

#### L2 Phase A 크롤러
- [x] pa_acodeco (2건 정상)
- [⚙] pa_panamacompra (424줄, 명세 정정 완료, 8 INN 부재로 0건)
- [ ] pa_minsa (72줄 스켈레톤)
- [ ] pa_css (149줄 부분, Cloudflare 차단)

#### L2 Phase B 크롤러 (Arrocha·Metro Plus 후퇴)
- [🔴] pa_arrocha (Shopify 정찰 완료, 의약품 차단 → Phase 2)
- [🔴] pa_metroplus (WordPress 확인, 별도 전략 → Phase 2)

#### 정제·인프라
- [x] SAND IQR, ComEM 스페인어 정규화, Polite Scraping, HTML Preprocessing 76.3%, EBNF JSON 강제

#### 프론트·보고서
- [x] Next.js 14 + Tailwind + Pretendard
- [x] 보고서 1장 5블록 (REPORT1_SPEC 준수)
- [x] LLM 3단 체인 (Opus → Sonnet → fallback)
- [x] panama_report_cache 12h TTL
- [x] 세션 16 버그 4종 + 잘림 + scope footer 모두 통과

### 🔴 세션 17 작업 큐 (12개, 32~42시간 = 세션 17~20 분량)

#### 작업 1: ACODECO PDF 파서 (4~6h, 1순위)

**목표**: panama 테이블 적재 50건 → 200건+ (CABAMED 153품목 추가)

- ACODECO 사이트(`acodeco.gob.pa`)에서 CABAMED PDF/Excel 자동 다운로드
- pdf-parse + cheerio로 가격표 파싱
- 153품목 × 8 INN 매칭 → 적재
- 차단 위험 0, 데이터 밀도 최고
- **성공 측정**: `SELECT COUNT FROM panama WHERE pa_source = 'acodeco_cabamed'` ≥ 50건

#### 작업 2: DNFD 공공 조회 포털 Playwright (3~4h, 2순위, 신규)

**목표**: 자사 8 INN 위생등록 여부 직접 확인 → 8행 적재

- URL: `tramites-minsa.panamadigital.gob.pa`
- 검색창 폼 제출 (INN별 또는 "Korea United Pharm" 회사명)
- CAPTCHA 간헐적 노출 → Timeout 넉넉히 + 예외 처리
- 등록번호·발급일·만료일 추출
- 신규 `pa_source: dnfd_consulta`
- WLA 패스트트랙 5단계 절차 명시 (한국 위생선진국 지정 활용)
- **성공 측정**: 자사 8 INN 등록 여부 8행 적재

#### 작업 3: DNFD 공식 사이트 크롤러 (2~3h, 3순위, 신규)

**목표**: 규제 변경·의약품 경고 5건+ 적재

- URL: `dnfd.minsa.gob.pa`
- 정적 HTML cheerio 파싱
- 신규 법령·경고(Alerts) 텍스트 수집
- 신규 `pa_source: dnfd_official`
- 분기별 1회 workflow_dispatch
- **성공 측정**: 5건+ 적재

#### 작업 4: FarmaValue Playwright (2~3h, 4순위)

**목표**: 최저가 벤치마크 8 INN 매칭 가격 적재

- URL: `farmavalue.com/pa`
- SPA 기반, Playwright `waitForSelector` 적용
- 검색창에 INN 입력 → 결과 DOM 파싱
- 신규 `pa_source: farmavalue`
- **성공 측정**: 8 INN 중 매칭 INN 수 + 적재 건수

#### 작업 5: 보고서 INN 빠른 전환 탭 UI (2~3h, 5순위, 신규)

**목표**: 발표 시연 시 8 INN 한 화면 전환

- 위치: 보고서 상단, [재분석] 버튼 아래
- 형식: 가로 탭 8개 (한글 브랜드명, 현재 INN 강조)
- 동작: 클릭 시 해당 INN 보고서로 즉시 전환 (캐시 활용)
- 모바일: 가로 스크롤
- 사용자 결정: B 옵션 (가로 탭) 채택. Cursor 진입 시 A(드롭다운)/C(사이드바) 재제안 가능

#### 작업 6: Perplexity API + 보고서 3페이지 (3~4h, 6순위, 신규)

**목표**: 학술 자료 8편 표시로 신뢰도 0.80 → 0.85+

**환경변수** (사용자 .env.local + Vercel 추가 완료 가정):
```
PERPLEXITY_API_KEY=pplx-xxxxx
PERPLEXITY_MODEL=sonar-pro
MAX_PAPERS_PER_INN=5
MAX_PAPERS_MACRO=3
```

**위치**: 1공정 최후방 (보고서 1·2 후, 3페이지 렌더링 전)

**검색 조건**:
- 시기: 2025~2026 우선 (필요 시 최근 3년 완화)
- 인용수 우선
- DOI 사후 검증 (실존 논문만, 환각 차단)
- 도메인 화이트리스트: pubmed, scholar, who, paho, scielo, ncbi, lancet
- 한국어 요약 강제
- 적합 0건이면 "조사되지 않음" 명시

**INN별 검색 키워드** (사전 박제):
- Hydroxyurea: "Hydroxyurea Panama leukemia / Latin America cancer access"
- Cilostazol: "Cilostazol PAD Latin America / Panama PAD prevalence"
- Itopride: "Itopride functional dyspepsia Latin America / FGID Panama"
- Aceclofenac: "Aceclofenac osteoarthritis Latin America NSAIDs"
- Rabeprazole: "Rabeprazole H. pylori Latin America / GERD Panama"
- Erdosteine: "Erdosteine COPD Latin America / mucolytic Central America"
- Omega-3: "Omega-3 dyslipidemia Latin America / cardiovascular Panama PREFREC"
- Levodropropizine: "Levodropropizine cough children / antitussive pediatric Latin America"
- 거시: "Panama pharmaceutical market 2025 / Korea-Panama FTA pharma"

**신규 파일**:
- `src/llm/perplexity_paper_search.ts`
- `src/logic/paper_validator.ts` (DOI 검증)
- `components/Report3.tsx`

#### 작업 7: data_reconciler 6규칙 (4~5h, 7순위)

**목표**: 신규 vs 기존 충돌 자동 해결

규칙 6개 (세션 12 결정 4규칙 + 제미나이 3규칙 통합):

| # | 규칙 | 적용 |
|---|---|---|
| A | 도메인 우선 (제약 특화 > 거시) | IQVIA > ITA |
| B | 최신성 우선 (가격만) | 실시간 크롤러 > 정적 DB |
| C | 법적 효력 우선 (규제) | 정부 공식 > 크롤러·기사 |
| D | 신선도 (같은 출처) | pa_collected_at 최근 |
| E | 가격 차이 ±50% 초과 | 둘 다 보관 + "검토 필요" |
| F | 신규 발견 | INSERT + "신규" 표시 |

**신규 파일**: `src/logic/data_reconciler.ts`

#### 작업 8: ATC 코드 + product_matcher 5단계 위계 (3~4h, 8순위)

**ATC 코드 8 INN 사전 박제**:
- Hydroxyurea: L01XX05 (항암제, 기타)
- Cilostazol: B01AC23 (항혈소판제)
- Itopride: A03FA07 (위장운동촉진제)
- Aceclofenac: M01AB16 (NSAIDs)
- Rabeprazole: A02BC04 (PPI)
- Erdosteine: R05CB15 (거담제)
- Omega-3: C10AX06 (이상지질혈증제)
- Levodropropizine: R05DB27 (진해제)

**5단계 위계** (세션 13 결정):
- Exact (1~5단계 모두): 직접 비교
- Strong (1~4단계, 포장만 다름): 환산 후 비교
- Partial (1~3단계, 단위 다름): 환산 가능 시
- Form Mismatch (1~2단계, 제형 다름): 참고용
- INN Only (1단계만): 비교 부적합

**제미나이 3단계 매칭 통합**:
1. INN 1차 검색
2. ATC 코드/효능군 fallback
3. 제형 정규화 (Tablet/Capsule/Jarabe) → 단위당 가격

**신규 파일**: `src/logic/product_matcher.ts`

#### 작업 9: product-dictionary form/strength 보강 (2h, 9순위)

신규 필드 추가:
```typescript
{
  form: "capsule" | "tablet" | "tablet_cr" | "syrup" | "injection",
  strength_value: number,
  strength_unit: "mg" | "g" | "mg/ml" | "IU",
  pack_size: number,
  pack_unit: "capsule" | "tablet" | "ml" | "vial",
  atc_code: string,  // 작업 8과 연동
  matching_policy: {
    strength_tolerance: number,
    accept_form_substitution: boolean,
    pack_size_normalize: boolean
  }
}
```

특히 실로스탄 CR정: `accept_form_substitution: false` (일반 Cilostazol과 30~50% 가격 차)

#### 작업 10: 신규 6사 라이브 검증 (2h, 10순위)

후속 크롤링 타겟 결정 위한 정찰만:
- El Javillo, Revilla, FarmaValue, Saba, Super 99, Riba Smith
- 각 30분 검증: 응답 코드, 의약품 검색 가능 여부, 차단 여부
- 코드 작성 X, DB INSERT X (정찰 전용)

#### 작업 11: ITA RAG 추출 (2~3h, 11순위)

**목표**: ITA 페이지 → LLM 구조화 추출 → L1 seed 적재

- 분기별 1회 workflow_dispatch
- ITA 페이지 fetch → Anthropic Haiku에게 JSON 스키마로 추출
- 추출 대상: 시장 규모·CAGR / 위생등록 절차·기간 / 위생선진국 효과 / 수입 관세·FTA
- 결과를 round5_ita_insights.json (또는 round1_macro 확장)에 적재
- L1 seed로 영구 저장

#### 작업 12: 보고서 2페이지 — 데이터 투명성 (3h, 12순위)

5개 블록:
- 블록 ⑥: 적재 현황 요약
- 블록 ⑦: 출처별 인벤토리 테이블
- 블록 ⑧: URL 인벤토리 (INN별 카테고리 분류)
- 블록 ⑨: 수집 방법론 (4가지: API/크롤링/검증/ERP)
- 블록 ⑩: 신뢰도 평가 + 한계 + 사용 권장 범위

**신규 파일**:
- `lib/fetch_source_inventory.ts`
- `lib/calculate_credibility.ts`
- `components/Report2.tsx`
- `REPORT2_SPEC.md`

### 🟢 세션 17~20 후순위 (Phase 2 로드맵)

- Aceclofenac 본문 "(중남미 평균)" 중복 정리 (5분, seed 정리)
- freshness_checker 본격 구현 (해법 C 3단계)
- PDF 다운로드 복구 (Puppeteer 검토)
- CSS Cloudflare 우회 (Residential Proxy)
- Arrocha·Metro Plus 우회 (로그인·지역 인증)
- 8 INN 전체 분석 검증 (시연 시 INN 탭 UI로 즉시 전환)
- World Bank 자동 갱신 (분기별)
- 2공정 (FOB 역산), 3공정 (AHP 파트너 매칭) 엔진

## 🔑 GitHub Secrets

`SUPABASE_URL`, `SUPABASE_KEY`, `ANTHROPIC_API_KEY`, `WORLD_BANK_API_KEY`, **`PERPLEXITY_API_KEY`**(작업 6 진입 시), `RESIDENTIAL_PROXY_URL`(Phase 2)

## 📏 Polite Scraping 기준

- 요청 간격: 1.5~3초 랜덤 딜레이
- 연속 에러 3회 시 즉시 중단
- PanamaCompra OCDS API: 1초당 1~2회 제한 준수
- DNFD 공공 조회 포털: CAPTCHA 대비 Timeout 30초+
- User-Agent 로테이션 + Residential Proxy(Phase 2)

## 📊 적재 현황 (세션 16 마무리 시점)

| pa_source | 건수 | 비고 |
|---|---|---|
| gemini_seed | 32 | L1 메인 |
| **gemini_prevalence** | **9** | **세션 16 신규 (8 INN + MACRO)** |
| acodeco | 2 | L2 정상 (작업 1에서 153품목 확장) |
| ita | 2 | L2 |
| kotra | 2 | L2 |
| motie | 2 | L2 |
| pubmed | 2 | L2 |
| who_paho | 2 | L2 |
| worldbank | 2 | L2 |
| iqvia_sandoz_2024 | 1 | 세션 13 |
| kotra_2026 | 1 | 세션 13 |
| minsa_official | 1 | 세션 13 |
| worldbank_who_ghed | 1 | 세션 13 |
| panamacompra | **0** | 8 INN 부재 진단 완료 |
| minsa | **0** | 스켈레톤 |
| css | **0** | Cloudflare 차단 |
| arrocha | **0** | Shopify 의약품 차단 (후퇴) |
| metroplus | **0** | WordPress (별도 전략) |
| **합계** | **59** | |

## Action Request

이해했으면 "파나마 1공정 — 세션 17 진입. ACODECO 1순위 작업을 시작합니다."라고 답하고, 사용자가 지정한 작업으로 진입하라.