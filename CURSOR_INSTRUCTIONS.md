# Cursor 구현 지시서 — 파나마 1공정 크롤러

## 📌 먼저 읽을 것
1. `ARCHITECTURE.md` — 전체 아키텍처 (필수)
2. `src/config/product-dictionary.ts` — 8종 INN 매핑 (세션 3 완성)
3. `핸드오프_세션4.md` — 최신 세션 핸드오프 ⭐ (세션 1은 `docs/handoffs/archive/`)

## System Role
너는 Cursor IDE의 수석 백엔드 개발자이자 AI 파이프라인 아키텍트다. 파나마 의약품 시장 진출을 위해 11개 사이트에서 데이터를 수집하는 초저부하(Polite) 지능형 크롤러를 TypeScript + Playwright로 구축한다. 10가지 크롤링 기법(ARCHITECTURE.md 참조)을 미들웨어로 통합한다.

## ⚠ 절대 원칙 (협상 불가)
1. Phase A와 Phase B 코드는 `preload/`와 `realtime/`에 절대 섞지 않음
2. 모든 워크플로우는 `workflow_dispatch`만. cron 절대 금지
3. 분석 버튼 시 11개 사이트 호출 절대 금지 — Supabase 조회만
4. `fob_estimated_usd`는 1공정 NULL — FOB 역산 절대 금지
5. LLM 호출은 `MAX_LLM_CALLS_PER_RUN=3` 환경변수 강제
6. 공통 6컬럼(id, product_id, market_segment, fob_estimated_usd, confidence, crawled_at) 이름·타입 변경 금지
7. `any` 타입 절대 금지
8. `.ts`(로직)와 `.tsx`(UI) 엄격 분리
9. **`pa_source_type` 컬럼 사용 금지** (세션 3 디버깅 결과 — 잉여 필드. `pa_source`만 사용)
10. **문자열 파싱 시 부정 키워드 우선 매칭** ("미포함" → "포함" 순서)
11. **"X건 적재" 보고는 반드시 `SELECT COUNT` 1회 검증 후 신뢰**

## 🚀 작업 순서 (9:1 재정립 반영)

### D1 — seed_loaders 트랙 (메인)
JSON seed 사전 수집 → 적재가 메인 트랙. preload 크롤러는 보완용으로 격하.
- [x] `src/utils/db_connector.ts` — Supabase INSERT 래퍼 + 6컬럼 검증
- [x] `src/seed_loaders/load_eml.ts` — 세션 3 완성, panama_eml 16건 적재 완료
- [ ] `src/seed_loaders/load_macro.ts` — 실행 대기 (tsc 통과만 확인됨)
- [ ] `src/seed_loaders/load_market_intel.ts` ⭐ — **세션 4 작성**. round3_market_intel.json 소스, panama 메인 + panama_distributors 4건(Feduro/Celmar/Haseth/Astur) INSERT
- [ ] `scripts/runners/seed_panama.ts` — load_macro → load_eml → load_market_intel 순차 실행 runner
- [ ] `package.json`에 `"seed:panama": "tsx scripts/runners/seed_panama.ts"` 추가

### D2~D3 — Phase A 공공 (preload 보완 트랙, 격하됨)
⚠ 이 트랙은 seed_loaders가 채우지 못한 빈칸만 보충하는 **보완용**. 메인이 아님.
- [ ] src/utils/pdf_parser.ts (세션 2 완성)
- [ ] src/utils/html_preprocessor.ts ⭐ (기법 ⑧ — 세션 2 완성, 76.3% 토큰 절감 실측)
- [ ] src/utils/ebnf_schemas.ts ⭐ (기법 ⑨ — 세션 4 작성)
- [ ] src/crawlers/preload/pa_panamacompra.ts (⑨ EBNF 스키마 적용, OCDS API 우선)
- [ ] src/crawlers/preload/pa_minsa.ts (⑧ 전처리 파이프라인 적용)
- [ ] src/crawlers/preload/pa_css.ts
- [ ] src/crawlers/preload/pa_acodeco.ts
- [ ] scripts/runners/preload_public.ts
- [ ] .github/workflows/pa_static_public.yml

### D4~D5 — Phase A 민간 (+ 10가지 기법 적용)
- [ ] src/crawler/stealth_setup.ts (⑦ Polite + ⑩ Resource Blocking 통합)
- [ ] src/agents/webwalker_core.ts (①)
- [ ] src/agents/wrapper_maintenance.ts (② + Top-down/Step-back 서브)
- [ ] src/cleansing/sand_outlier.ts (③)
- [ ] src/cleansing/comem_matcher.ts (④)
- [ ] src/utils/xgrammar_enforcer.ts (⑤)
- [ ] src/utils/atomic_factchecker.ts (⑥)
- [ ] src/crawlers/base/PlaywrightCrawler.ts
- [ ] src/crawlers/preload/pa_arrocha.ts
- [ ] src/crawlers/preload/pa_metroplus.ts

### D6 — Phase B 실시간 보강
- [ ] `src/utils/source_whitelist.ts` (`.gob.pa`, `.gov`, `.edu`, `.who.int`, `paho.org`만)
- [ ] `src/utils/llm_cost_guard.ts`
- [ ] `src/config/llm-trigger-rules.ts`
- [ ] `src/logic/freshness_checker.ts`
- [ ] `src/crawlers/base/LLMSearchCrawler.ts` (Anthropic web_search)
- [ ] `src/crawlers/realtime/pa_llm_freshness.ts`

### D7~D8 — 프론트 통합
- [ ] Render 백엔드 API (분석 버튼 → repository_dispatch)
- [ ] Vercel 프론트엔드 (Next.js)
- [ ] 응답 시간 10초 이내 검증

### D9~D10 — 시연 준비
- [ ] Phase A 3개 워크플로우 재실행 (신선도 갱신)
- [ ] 시연 리허설

## 🔑 GitHub Secrets
`SUPABASE_URL`, `SUPABASE_KEY`, `RESIDENTIAL_PROXY_URL`, `CLAUDE_API_KEY`, `WORLD_BANK_API_KEY`, `SLACK_WEBHOOK_URL`

## 📏 Polite Scraping 기준
- 요청 간격: 1.5~3초 랜덤 딜레이
- 연속 에러 3회 시 즉시 중단
- PanamaCompra OCDS API: 1초당 1~2회 제한 준수
- User-Agent 로테이션 + Residential Proxy(Arrocha/Metro Plus)

## Action Request
이해했으면 "파나마 1공정 지능형 아키텍처 설계를 시작합니다."라고 답하고, D1의 `src/seed_loaders/load_market_intel.ts`부터 순서대로 생성하라.

### ⚠ 신규 기법 3개 작업 원칙
- ⑧ html_preprocessor.ts: 5단계 파이프라인, cheerio 기반, StaticCrawler에서 선택적 호출 (세션 2 완성)
- ⑨ ebnf_schemas.ts: product/macro/tender 3종 EBNF 스키마, Anthropic SDK와 연동 (세션 4 작성)
- ⑩ Resource Blocking: stealth_setup.ts 내부 함수로, PlaywrightCrawler가 자동 적용