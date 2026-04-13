# Cursor 구현 지시서 — 파나마 1공정 크롤러

> **세션 16 / 2026-04-13 패치**
> 용어 체계 이중 축 정립 (수집 시점 L1/L2/L3 + 데이터 채널 Phase A/B), PanamaCompra 명세 정정, L2 크롤러 0건 현황 박제

## 📌 먼저 읽을 것
1. `ARCHITECTURE.md` — 전체 아키텍처 (필수, 세션 16 갱신본)
2. `src/config/product-dictionary.ts` — 8종 INN 매핑 (세션 3 완성)
3. `핸드오프_세션15_to_16.md` — 최신 세션 핸드오프 ⭐ (이전 세션은 `docs/handoffs/archive/`)
4. `REPORT1_SPEC.md` — 보고서 1장 설계 명세 (W4 구현 근거)
5. `USER_FLOW.md` — 전체 유저 플로우 (세션 16 갱신본)
6. `TECHNIQUES_STATUS.md` — 10가지 기법 진척도 (세션 16 갱신본)
7. `docs/research/freshness_2gate_architecture.md` — 해법 C 설계 박제 (Phase 2 로드맵)

## System Role
너는 Cursor IDE의 수석 백엔드 개발자이자 AI 파이프라인 아키텍트다. 파나마 의약품 시장 진출을 위해 11개 사이트(거시 5 / Phase A 4 / Phase B 2)에서 데이터를 수집하는 초저부하(Polite) 지능형 크롤러를 TypeScript + Playwright로 구축한다. 10가지 크롤링 기법(ARCHITECTURE.md 참조)을 미들웨어로 통합한다.

## 🔑 용어 체계 (세션 16 정립)

**수집 시점 (3계층, 폴더 분리 기준)**
- L1 정적 seed (~85%) — `src/seed_loaders/`
- L2 조건부 우리 크롤러 (~10%) — `src/crawlers/preload/`
- L3 실시간 LLM 보강 (~5%) — `src/crawlers/realtime/`

**데이터 채널 (Phase A/B + 거시, `pa_source`로 구분)**
- Phase A 공공조달·규제 — PanamaCompra, MINSA, CSS, ACODECO
- Phase B 민간 소매 — Arrocha, Metro Plus
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
9. **`pa_source_type` 컬럼 사용 금지** (세션 3 디버깅 결과 — 잉여 필드. `pa_source`만 사용)
10. **문자열 파싱 시 부정 키워드 우선 매칭** ("미포함" → "포함" 순서)
11. **"X건 적재" 보고는 반드시 `SELECT COUNT` 1회 검증 후 신뢰**
12. **freshness 판정은 해법 C (AI 의미 게이트)** — 시간 규칙 단독 판정 금지
13. **`pa_collected_at` 등 timestamp는 DB 실제값만 사용, 하드코딩 금지** (세션 13)
14. **제품 매칭 시 form·strength·unit 다중 필터 필수** — CR/일반, 캡슐/시럽 엄격 구분 (세션 13)
15. **PanamaCompra `pa_currency_unit`은 응답값 그대로** — 하드코드 USD 금지 (세션 16)
16. **PanamaCompra UNSPSC 51000000 필터 사용 금지** — 노이즈 다수, 키워드 매칭으로 대체 (세션 16)
17. **MACRO_PRODUCT_ID 폴백 금지** — 8 INN 매칭 실패 시 INSERT 스킵 (세션 16)

## 🚀 작업 순서 (세션 16 시점)

### ✅ 완료 (세션 1~15)

#### L1 seed 트랙 (메인)
- [x] `src/utils/db_connector.ts` — Supabase INSERT 래퍼 + 6컬럼 검증
- [x] `src/seed_loaders/load_eml.ts` — panama_eml 16건 적재 완료
- [x] `src/seed_loaders/load_macro.ts` — round1_macro.json 적재
- [x] `src/seed_loaders/load_market_intel.ts` — round3_market_intel.json + panama_distributors 4건
- [x] `src/seed_loaders/load_regulatory_milestones.ts` — 규제 마일스톤 2건 (세션 13)
- [x] `scripts/runners/seed_panama.ts` — 순차 실행 runner

#### L2 거시 크롤러
- [x] `src/crawlers/preload/pa_worldbank.ts` — GDP·인구·보건지출
- [x] `src/crawlers/preload/pa_ita.ts`
- [x] `src/crawlers/preload/pa_kotra.ts`
- [x] `src/crawlers/preload/pa_motie.ts`
- [x] `src/crawlers/preload/pa_pubmed.ts`

#### 정제·인프라
- [x] `src/cleansing/sand_outlier.ts` — IQR (기법 ③)
- [x] `src/cleansing/comem_matcher.ts` — 스페인어 정규화 (기법 ④)
- [x] `src/crawler/stealth_setup.ts` — Polite + Resource Blocking (기법 ⑦⑩)
- [x] `src/utils/html_preprocessor.ts` — 76.3% 토큰 절감 (기법 ⑧)
- [x] `src/utils/ebnf_schemas.ts` — JSON 스키마 (기법 ⑨)
- [x] `src/utils/xgrammar_enforcer.ts` — 포스트 검증 (기법 ⑤ 스켈레톤)

#### 프론트·보고서
- [x] Next.js 14 App Router + Tailwind
- [x] `app/panama/page.tsx` — 국가 페이지 (거시 카드 + 8 INN 드롭다운)
- [x] `app/panama/report/[inn]/page.tsx` — 보고서 1장
- [x] `src/logic/case_judgment.ts` — Case A/B/C 규칙 기반
- [x] LLM 보고서 생성 (Opus → Sonnet → fallback 3단)
- [x] panama_report_cache 24h TTL
- [x] Vercel 베타 배포 (`united-panama.vercel.app`)

### 🔴 진행 중 (세션 16)

#### L2 Phase A 크롤러 (적재 0건 상태)
- [⚙] `src/crawlers/preload/pa_panamacompra.ts` (424줄, 명세 정정 완료)
  - URL: `/api/v1/releases` ✅
  - 파싱: `awards[].items[]` ✅
  - 8 INN 매칭: **0건 발견** — 7,500건 샘플 0매칭. 진단 진행 중
  - 다음: 동의어·브랜드명 확장 / DGCP 별도 endpoint 정찰 / 비교 검증
- [ ] `src/crawlers/preload/pa_minsa.ts` (72줄 스켈레톤, CSRF 미구현)
- [ ] `src/crawlers/preload/pa_css.ts` (149줄 부분, Cloudflare 챌린지 확인)
- [x] `src/crawlers/preload/pa_acodeco.ts` (적재 2건, 정상 작동)

#### L2 Phase B 크롤러 (후퇴 옵션 검토 중)
- [ ] `src/crawlers/preload/pa_arrocha.ts` (55줄 스켈레톤)
  - 세션 16 실측: 200 OK, cf-mitigated 헤더 없음 → 우회 가능성 재검토
- [ ] `src/crawlers/preload/pa_metroplus.ts` (43줄 스켈레톤)
  - 세션 16 실측: DNS 실패 (네트워크 의존)

### 🟡 세션 17+ 작업 큐 (세션 12~13에서 결정, 미착수)

#### 작업 1: data_reconciler.ts 신규 (2시간)
신규 크롤링 vs 기존 DB 충돌 판단 4규칙:
1. 출처 신뢰도 우선 (공식 API > seed > 민간)
2. 신선도 우선 (같은 출처 시 pa_collected_at 최근)
3. 가격 차이 ±50% 초과 시 둘 다 보관 + "검토 필요"
4. 신규 발견 항목은 INSERT + "이번 분석에서 신규 발견" 표시

#### 작업 2: product-dictionary.ts 보강 (2시간)
신규 필드 추가:
```typescript
{
  form: "capsule" | "tablet" | "tablet_cr" | "syrup" | "injection",
  strength_value: number,
  strength_unit: "mg" | "g" | "mg/ml" | "IU",
  pack_size: number,
  pack_unit: "capsule" | "tablet" | "ml" | "vial",
  matching_policy: {
    strength_tolerance: number,
    accept_form_substitution: boolean,
    pack_size_normalize: boolean
  }
}
```
특히 실로스탄 CR정: `accept_form_substitution: false` (일반 Cilostazol과 30~50% 가격 차)

#### 작업 3: src/logic/product_matcher.ts 신규 (2~3시간)
5단계 매칭 위계 (Exact / Strong / Partial / Form Mismatch / INN Only)
- 단위 환산 (mg/g, ml/L, 포장)
- MatchResult: grade + confidence + reasons + normalized_price
- Supabase INSERT 시 매칭 정보 함께 저장 (`pa_match_grade`, `pa_match_confidence`)

#### 작업 4: 보고서 4-2 가격 포지셔닝 개선 (1시간)
- 매칭 등급 표시 UI (✅/🟡/⚠ 아이콘)
- 시스템 프롬프트에 제형 매칭 처리 룰 추가

#### 작업 5: 보고서 2페이지 — 데이터 투명성 (3시간)
- REPORT2_SPEC.md 신규 작성
- 5개 블록: 적재 현황 / 출처별 인벤토리 / URL 인벤토리 / 수집 방법론 / 신뢰도 평가
- 디자인: 감사 보고서 톤 (text-sm, 표 위주)

#### 작업 6: Perplexity API + 보고서 3페이지 (3~4시간)
- 환경변수: `PERPLEXITY_API_KEY`, `PERPLEXITY_MODEL=sonar-pro`
- INN별 논문 5건 + 거시 논문 3건
- DOI 사후 검증 필수
- 학술 저널 디자인

### 🟢 Phase 2 로드맵 (시연 후)

- [ ] freshness_checker 본격 구현 (해법 C 3단계)
- [ ] PDF 다운로드 복구 (Puppeteer 검토)
- [ ] CSS Cloudflare 우회 (Residential Proxy)
- [ ] Phase B 후퇴 결정 시 ERP fallback 보고서 명시 강화
- [ ] 8 INN 전체 분석 검증 (현재 하이드린만 풀 분석)
- [ ] World Bank 자동 갱신 (분기별)
- [ ] 2공정 (FOB 역산), 3공정 (AHP 파트너 매칭) 엔진

## 🔑 GitHub Secrets
`SUPABASE_URL`, `SUPABASE_KEY`, `RESIDENTIAL_PROXY_URL`(Phase B 활성화 시), `ANTHROPIC_API_KEY`, `WORLD_BANK_API_KEY`, `PERPLEXITY_API_KEY`(작업 6 진입 시), `SLACK_WEBHOOK_URL`

## 📏 Polite Scraping 기준
- 요청 간격: 1.5~3초 랜덤 딜레이
- 연속 에러 3회 시 즉시 중단
- PanamaCompra OCDS API: 1초당 1~2회 제한 준수
- User-Agent 로테이션 + Residential Proxy(Phase B 활성화 시)

## 📊 적재 현황 (세션 16 시점)

| pa_source | 건수 | 비고 |
|---|---|---|
| gemini_seed | 32 | L1 메인 |
| acodeco | 2 | L2 정상 |
| ita | 2 | L2 |
| kotra | 2 | L2 |
| motie | 2 | L2 |
| pubmed | 2 | L2 |
| who_paho | 2 | L2 |
| worldbank | 2 | L2 |
| iqvia_sandoz_2024 | 1 | 세션 13 |
| kotra_2026 | 1 | 세션 13 |
| minsa_official | 1 | 세션 13 (`pa_source: minsa`와 다름) |
| worldbank_who_ghed | 1 | 세션 13 |
| panamacompra | **0** | 명세 정정 후 7,500건 샘플 0매칭 |
| minsa | **0** | 스켈레톤 |
| css | **0** | Cloudflare 챌린지 |
| arrocha | **0** | 스켈레톤 |
| metroplus | **0** | 스켈레톤 |
| **합계** | **50** | |

## ⚠ 신규 기법 3개 작업 원칙
- ⑧ html_preprocessor.ts: 5단계 파이프라인, cheerio 기반, StaticCrawler에서 선택적 호출 (완성)
- ⑨ ebnf_schemas.ts: product/macro/tender 3종 EBNF 스키마, Anthropic SDK와 연동 (완성)
- ⑩ Resource Blocking: stealth_setup.ts 내부 함수, PlaywrightCrawler가 자동 적용 (Skeleton)

## Action Request
이해했으면 "파나마 1공정 지능형 아키텍처 — 세션 16 작업을 시작합니다."라고 답하고, 사용자가 지정한 작업으로 진입하라.