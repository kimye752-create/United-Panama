# Vibe Coding Log

## [Unreleased] - 2026-04-12 (세션 7 · W4 Next.js 보고서 1장)

### Added
- Next.js 14 App Router (`app/`), Tailwind v3, Pretendard CDN(`app/globals.css`)
- `lib/supabase-server.ts`, `lib/supabase-browser.ts` — anon 전용
- `src/logic/case_judgment.ts`, `fetch_panama_data.ts`, `distributor_matcher.ts`, `macro_display.ts`, `inn_slug.ts`, `panama_analysis.ts`
- `app/panama/page.tsx`, `app/panama/report/[inn]/page.tsx`, `app/api/panama/analyze/route.ts`
- `components/ProductSelector.tsx`, `Report1.tsx`, `CaseBadge.tsx`, `SourceTable.tsx`, `ReasoningList.tsx`
- `types/css.d.ts`, `.env.local.example` (NEXT_PUBLIC_SUPABASE_*)

### Notes
- REPORT1_SPEC 5블록 순서 준수(블록 5 하단). Case 판정 규칙 기반(LLM 없음).
- `npm run dev` / `npm run build` 검증.

## [Unreleased] - 2026-04-12 (세션 7 · W2 민간 Skeleton + Phase B stub)

### Added
- `src/crawlers/preload/pa_arrocha.ts`, `pa_metroplus.ts` — Cloudflare WAF/Turnstile Skeleton, `--dry-run` mock만
- `src/utils/xgrammar_enforcer.ts` — 기법 ⑤ 포스트 파싱 검증(`validateJsonAgainstSchema`, `enforceXGrammar`)
- `src/agents/webwalker_core.ts`, `src/agents/wrapper_maintenance.ts`, `src/utils/atomic_factchecker.ts` — Phase B 연기 throw stub
- `scripts/runners/preload_private.ts` — Arrocha→MetroPlus 순차, 비 `--dry-run` 시 경고 후 exit 0

### Changed
- `TECHNIQUES_STATUS.md` — W2 매트릭스(🟢/🟡/🔴/✅) 동기화

## [Unreleased] - 2026-04-12 (문서 — REPORT1 / USER_FLOW 풀본문 복구)

### Changed
- `REPORT1_SPEC.md`, `USER_FLOW.md` — W1.5 최소 골격 제거, 달강 풀버전 SSOT로 덮어쓰기 (커밋 `e2acf2d`)

## [Unreleased] - 2026-04-12 (문서 — W4~W5 SSOT 링크)

### Added
- `REPORT1_SPEC.md`, `USER_FLOW.md` — W4~W5 Single Source of Truth(루트 배치; 기존에 디스크에 없어 최소 골격 생성 — PM 원문이 있으면 덮어쓰기)

### Changed
- `CURSOR_INSTRUCTIONS.md` — 「먼저 읽을 것」에 위 2문서 항목 추가
- `ARCHITECTURE.md` — 「관련 설계 문서」 링크 섹션 추가

## [Unreleased] - 2026-04-11 (세션 7 · W1 공공 크롤러 + SAND + ComEM + Polite)

### Added
- `src/crawler/stealth_setup.ts` — 기법 ⑦ 랜덤 딜레이·UA·`createPoliteFetch`, ⑩ `applyResourceBlocking(Page)` Skeleton
- `src/cleansing/sand_outlier.ts` — 기법 ③ IQR 이상치 (`detectOutliersIQR`, `detectOutliersByInn`)
- `src/cleansing/comem_matcher.ts` — 기법 ④ `normalizeSpanish`·Levenshtein·`matchProductByLocalName`
- `src/crawlers/preload/pa_acodeco.ts`, `pa_minsa.ts`(CSRF Skeleton), `pa_css.ts`(PDF·Skeleton 경로)
- `scripts/runners/preload_public.ts` — ACODECO→MINSA→CSS 순차·JSON 요약(`stdout`)
- `scripts/verify_public_crawl_counts.ts` — `pa_source` 공공 3종 COUNT + `fob_estimated_usd` NOT NULL 검증
- `.github/workflows/pa_static_public.yml` — Node 20, `npm ci`, `preload_public --dry-run`

### Changed
- `src/crawlers/base/BaseCrawler.ts` — `pa_source_type` INSERT 제거(정책 준수); `--dry-run` 시 적재 생략·건수만 반환
- `TECHNIQUES_STATUS.md` — ③④⑦ 반영 및 공공 3종 runner 명시

### Notes (미결)
- MINSA: CSRF·세션 쿠키 필요 — `pa_minsa` 비 dry-run은 세션 8 수동 쿠키 주입 예정(에러 메시지 고정)

## [Unreleased] - 2026-04-11 (세션 7 · W0 인프라 스프린트 킥오프)

### Added
- `TECHNIQUES_STATUS.md` — 10가지 크롤링 기법 적용 현황 매트릭스(실구현 5 / Skeleton 2 / Phase B 연기 3), `ARCHITECTURE.md`와 정합
- `.env.example` — Supabase·Claude·프록시·선택 키 플레이스홀더 템플릿(실제 `.env`는 `.gitignore` 유지)

### Notes
- GitHub CLI(`gh`) 미설치로 `gh repo create` 자동화 불가 → 원격 저장소는 github.com에서 private repo 수동 생성 후 `git remote add origin <url>` 필요
- Vercel CLI 전역 설치 완료(50.44.0); 로그인·프로젝트 생성은 W6 예정

## [Unreleased] - 2026-04-11 (세션 7 · OCDS PanamaCompra)

- [세션7] OCDS API 엔드포인트 실측 확정: `/api/v1/releases` (세션6 핸드오프의 `/api/v1/ocds/release`는 404, 오타 교정)

## [Unreleased] - 2026-04-11 (세션 6 · 3순위 정비)

### Added
- `src/utils/ebnf_schemas.ts` — 기법 ⑨ EBNF 상수 3종(`PRODUCT_SCHEMA_EBNF`, `MACRO_SCHEMA_EBNF`, `TENDER_SCHEMA_EBNF`) 및 `getEbnfSchema` (Anthropic constrained decoding 연동 예정)
- `src/utils/translate.ts` — Phase B 번역 stub(`translateToKorean` 미구현 시 throw)

### Changed
- `docs/handoffs/archive/` — `핸드오프_세션1.md`~`세션3.md` 루트에서 아카이브 이동 (세션 4·5는 루트 유지)

## [Unreleased] - 2026-04-11 (세션 5 · 1공정 아키텍처 재정립)

### Added (2026-04-11, seed_panama runner · macro 검증)
- `scripts/runners/seed_panama.ts` — `load_macro` → `load_eml` → `load_market_intel` 순차 호출, 단계별 `durationMs`·`StageResult`, 실패 시 즉시 `overallStatus: failed` 및 exit(1); 표준출력 JSON 1회 (`console.log` 없음). **재실행 시 중복 INSERT** — 주석 경고 준수.
- `package.json` — `seed:panama`, `seed:panama:dry` 스크립트.
- `scripts/verify_macro_seed_sql.ts` — Phase 1-5용 `macro`·`pa_source`·`fob` 조건 집계(REST).

### Changed (2026-04-11, load_macro)
- `src/seed_loaders/load_macro.ts` — `--dry-run`·`buildMacroRowsFromRound1File`·`readRound1Sites`·CLI(`process.stdout` JSON); 적재 전 `validatePanamaPhase1Common`; **`pa_source_type` 제거**(세션 정책과 동일); `siteToPanamaRow` 단독 export 유지.

### Added (2026-04-11, round3 market intel 로더)
- `src/seed_loaders/load_market_intel.ts` — `round3_market_intel.json` 6대 영역 파싱(명시 인터페이스, `any` 없음) → `panama`(거시·`MACRO_PRODUCT_ID`·`market_segment: macro`·`fob_estimated_usd: null`·`pa_source: gemini_seed`만 사용, `pa_source_type` 미사용) + `distributors[]`만 `panama_distributors` INSERT; `mapSpanishTargetToMarket`(복합 `Público y Privado`·`/` 표기 우선 후 단일 채널); `--dry-run` 시 `process.stdout`로 JSON 1회 요약; Supabase 적재는 try-catch + 한국어 오류 메시지.

### Changed (2026-04-11, load_eml 평탄화)
- `src/seed_loaders/load_eml.ts` — `PanamaEmlRow`에 `pa_inn_name`~`pa_source_url` 8컬럼 추가, `entriesToPanamaEmlRows`에서 `EmlSeedEntry` 평탄 매핑; `pa_raw_data`는 `emlSeedEntryToPaRawData(entry)`로 entry 필드 전부 직렬화; `paho_strategic_fund` 문자열은 `미포함` 우선·`포함` 판정으로 `pa_paho_procurable` 변환 (`mapPahoStrategicFundToProcurable`). DDL 파일은 미변경.

### Added
- `scripts/ddl/panama_eml.sql` — `panama_eml` 테이블 (market_segment: eml_who | eml_paho | eml_minsa, pa_raw_data JSONB, 1공정 fob NULL)
- `src/seed_loaders/load_eml.ts` — `round2_eml.json` → `panama_eml` 배치 INSERT (`entries[]` 신규 스키마 + 레거시 phase/data 자동 변환, `--dry-run`, `normalizeInn`·product-dictionary 매칭 실패 시 throw)
- `scripts/restructure_round1_macro.mjs` — `round1_macro.json` 배열(4요소)을 인덱스·키 검증만으로 `round1`/`round2`/`round3`에 재배치 (`arr[2]` 미완성 템플릿은 저장 안 함, 검증 실패 시 throw)
- `data/seed/panama/archive/gemini_round1_full_bundle_2026-04-10.json` — PM이 채팅으로 제공한 Gemini round1 전체 배열 JSON의 보관용 스냅샷 (`round1_macro.json`과 동일 내용 복제)
- `data/seed/panama/` — Gemini 사전 수집 JSON 보관소 (`round1_macro.json`, `round2_eml.json`, `round3_market_intel.json` — PM 채움 전 빈 객체 `{}`)
- `src/seed_loaders/load_macro.ts` — `round1_macro.json` → `panama` INSERT 베이스 (`insertRow`, `product_inn_en` 시 INN UUID·아니면 MACRO)
- `scripts/ddl/panama_distributors.sql` — `panama_distributors` 보조 테이블 (엔진⑥ AHP 입력, 3공정에서 점수·순위 UPDATE)
- `scripts/ddl/panama_add_pa_notes.sql` — `panama.pa_notes` 컬럼 추가 (Gemini 인용 저장, seed 적재 전 선택 실행)
- `src/crawlers/preload/README.md` — 보완 크롤러 역할·실행 순서

### Changed
- `data/seed/panama/round2_eml.json` — `entries[]` 신규 스키마로 정리, 8번째 INN **Levodropropizine**(레보틱스, ATC R05DB27, WHO/PAHO 불리언 false·MINSA null) PM 확정 반영
- `src/utils/product-dictionary.ts` — Levodropropizine 항목 정식화(한글명 레보틱스, 검색 키 `Levodropropizine`·`레보틱스` 추가), UUID 유지
- `src/seed_loaders/load_eml.ts` — `paho_strategic_fund`에 `boolean` 허용(PAHO 미조달 `false` 행 적재), 레거시 키 `levodropropizine` 매핑 추가; `PanamaEmlRow`에서 `pa_source_type` 제거(DDL 비대응·상수만 할당이던 잉여 필드)
- `data/seed/panama/round1_macro.json` — **재구조화**: 최상위가 배열(4객체)이던 것을 **`arr[1]` 단일 객체**만 남김 (거시 `sites` 7·`metadata` 등; 원본 전체 배열은 `archive/gemini_round1_full_bundle_2026-04-10.json`에 그대로 보존)
- `data/seed/panama/round2_eml.json` — **재구조화**: 소스 배열 **`arr[3]`** EML 실측본으로 교체 (`hidroxiurea` 불리언 `true` 등)
- `data/seed/panama/round3_market_intel.json` — **재구조화**: 소스 배열 **`arr[0]`** (6키: `pricing_data` … `epidemiology`)
- **폐기 확인**: `arr[2]` EML 미완성 템플릿(`who_eml_2023_inclusion.hidroxiurea === "true/false"` 문자열)은 파일로 저장하지 않음
- `ARCHITECTURE.md`: 정적 90% 흐름 재정립(Gemini JSON → seed_loader → 보완 크롤러), `pa_notes` 명시, `panama_distributors` 보조 테이블 정의
- 1공정: 기존 크롤러 직접 호출 중심 → **Gemini 사전 수집 JSON 우선**; `preload/` 크롤러는 폐기 없이 **보완용**으로 격하

---

## [Unreleased] - 2026-04-11 (세션 4 · D1 정리)

### Added
- `scripts/ddl/d1_panama_cleanup.sql` — TRUNCATE + `pa_price_local` ALTER + information_schema 검증 (SQL Editor 일괄 실행용)
- `scripts/ddl/panama_alter_pa_price_local.sql` — ALTER 단독 스크립트
- `scripts/d1_panama_maint.ts` — `DATABASE_URL` 또는 `SUPABASE_DB_PASSWORD` 시 pg로 TRUNCATE/ALTER, 없으면 REST 전체 DELETE 후 수동 안내
- `scripts/verify_panama_by_source.ts` — `pa_source`별 건수 집계 (REST)
- `package.json` — `db:d1-maint`, `verify:panama-sources` 스크립트
- devDependency: `pg`, `@types/pg`

### Changed
- `ARCHITECTURE.md`: panama 자유 컬럼 `pa_price_local` 타입 확장 (DECIMAL(12,4) → DECIMAL(20,4))
  - 사유: WorldBank GDP 등 거시 수치 + 공공 입찰가 일관 저장, DECIMAL(12,4) 정수부 한계로 GDP numeric overflow 방지 (헌법 변경 이력 본문에 명시)
- `scripts/ddl/panama_table.sql`: 신규 생성 시 `pa_price_local` DECIMAL(20,4) 반영
- `src/crawlers/preload/pa_worldbank.ts`: GDP ÷ 1,000,000 환산 제거 — API 원본값 그대로 `pa_price_local` 저장 (`pa_currency_unit`: `USD` 유지)
- **원격 DB 적용**: Cursor Supabase MCP 비가동 · `.env`에 DB 비밀번호 미설정으로 **TRUNCATE/ALTER는 로컬에서 pg 미실행**. 사용자는 Supabase SQL Editor에서 `scripts/ddl/d1_panama_cleanup.sql` 실행 후 `npm run preload:macro`로 검증할 것.
- `src/utils/db_connector.ts`: `SUPABASE_KEY` 앞뒤 괄호 `(…)` 자동 제거 — `.env`에 `(sb_secret_…)` 형태로 넣을 때 `Invalid API key` 나던 문제 완화

---

## [Unreleased] - 2026-04-11 (세션 3)

### Added
- `scripts/ddl/panama_table.sql` — panama 테이블 최종 DDL
  - ARCHITECTURE.md 기준 공통 6컬럼 + pa_* 12종 (Claude DDL 대비 보완)
  - product_id: TEXT → UUID 타입 (실제 UUID 발급 완료)
  - pa_ingredient_inn, pa_price_type, pa_package_unit, pa_decree_listed, pa_stock_status 추가 (Claude DDL 누락분)
  - RLS 정책: service_role 전체 / anon SELECT only
  - 인덱스 4종: product_id, pa_source, crawled_at DESC, market_segment
- `src/utils/product-dictionary.ts` — 8개 INN UUID 매핑 + MACRO UUID
  - crypto.randomUUID() v4 9개 발급 후 상수로 영구 고정
  - MACRO_PRODUCT_ID: `ba6cf610-9d7c-4fb9-9506-eabd7a5457b8`
  - 8번째(레보틱스 CR정/Levodropropizine): PM 확인 필요 주석 포함
  - 헬퍼: findProductByInn(), findProductById(), findProductByKeyword()
- `package.json` — preload:macro / preload:public / preload:private npm 스크립트 추가

### Changed
- product_id 정책 확정: crypto.randomUUID() v4 발급 후 상수 영구 고정 (런타임 생성 금지)
- D1 크롤러 5개 product_id 교체
  - pa_worldbank.ts, pa_ita.ts, pa_kotra.ts, pa_motie.ts → MACRO_PRODUCT_ID import
  - pa_pubmed.ts → TARGET_PRODUCTS 8개 INN별 UUID 매핑 (8행 적재 구조)
- `src/utils/db_connector.ts` — product_id 검증: 자리표시자 패턴 제거, UUID v4 형식만 허용
### Verified (2026-04-11)
- panama DDL 적용 후 `npm run preload:macro`: 5/5 크롤러 성공, **단일 실행 기준 13건** 적재 (WorldBank 3 + PubMed 8 + MOTIE 2; ITA·KOTRA 0건)
- Supabase REST로 `GROUP BY product_id, pa_source` 동일 집계 확인 (MCP 미구성 시 클라이언트 조회로 대체)

---

## [Unreleased] - 2026-04-11 (세션 2)

### Added
- `src/utils/html_preprocessor.ts` — HTML 5단계 전처리 파이프라인
  - 파싱 → 노이즈 제거 → DOM 단순화 → 텍스트 블록 추출(밀도 필터) → 구조화 토큰 변환
  - 출력: [TITLE] / [PARAGRAPH] / [LIST_ITEM] / [CELL] 토큰 형식
  - LLM 입력 토큰 70~80% 절감 목적 (실측: 76.3%)
  - 사용처: D2 pa_minsa.ts, D6 Phase B 실시간 보강
- `src/utils/pdf_parser.ts` — pdf-parse 래퍼 유틸
  - Buffer / URL 문자열 둘 다 입력 가능
  - URL 입력 시 내부 fetch → arrayBuffer → Buffer 변환
  - 추출 텍스트 공백 정규화 (스페인어·한국어 안전)
  - 실패 시 한국어 메시지로 Error throw
  - D2 작업 대상: pa_css.ts, pa_acodeco.ts에서 사용 예정

## 2026-04-11

### 변경 시각 (로컬)

- **오후 (구체 시각 미기록)** — `src/utils/db_connector.ts` 신규 추가 (D1)

### 변경 내용

- **파일:** `src/utils/db_connector.ts`
- **목적:** Phase A 거시 수집 파이프라인에서 Supabase `panama` 테이블에 안전하게 INSERT하기 위한 클라이언트 초기화 및 공통 6컬럼 검증 래퍼 제공.
- **세부 사항:**
  - `SUPABASE_URL`, `SUPABASE_KEY` 환경변수로 `createClient` 지연 싱글톤 초기화.
  - `insertRow()`에서 `id`, `product_id`, `market_segment`, `fob_estimated_usd`(1공정 강제 `null`), `confidence`(0~1), `crawled_at`(파싱 가능한 날짜 문자열) 검증 후 `.from('panama').insert()`.
  - Supabase/검증 오류 시 `try-catch` 및 `console.error`로 한국어 맥락 로그, 호출부용 `InsertRowResult` 반환.
  - `any` 미사용, `PanamaPhase1InsertRow`로 `pa_*` 확장 컬럼 허용.
- **DB 스키마 변경:** 없음 (테이블명 상수 `panama`만 참조).

---

### 변경 시각 (로컬)

- **오후 (구체 시각 미기록)** — `src/crawlers/base/BaseCrawler.ts` 신규 추가 (D1)

### 변경 내용

- **파일:** `src/crawlers/base/BaseCrawler.ts`
- **목적:** 모든 Phase A 크롤러의 추상 부모 클래스. 공통 흐름(수집→합성→적재)을 템플릿 메서드로 고정하고 하위 클래스는 `crawl()`만 구현.
- **세부 사항:**
  - 생성자 속성: `name`, `sourceType`(`PaSourceType`), `market_segment`(`MarketSegment`), `baseConfidence`.
  - `crawl()` — 하위 클래스가 구현하는 추상 메서드. `CrawlRowData[]` 반환.
  - `run()` — 템플릿 메서드. `crawl()` 호출 → 공통 6컬럼(`fob_estimated_usd: null`, `confidence`, `crawled_at`, `pa_source_type`) 합성 → `insertRow()` 순차 호출 → `CrawlRunResult`(`{ ok, inserted }`) 반환. `throw` 없음.
  - 개별 행 INSERT 실패 시 건너뜀 + 누적, 최종에 부분 실패 요약 반환.
  - `any` 미사용, `InsertRowResult` 패턴 일관성 유지.
- **DB 스키마 변경:** 없음.

---

### 변경 시각 (로컬)

- **오후 (구체 시각 미기록)** — `src/crawlers/preload/` 하위 5개 거시 크롤러 신규 추가 (D1)

### 변경 내용

- **파일:** `src/crawlers/preload/pa_worldbank.ts`
  - `ApiCrawler<WorldBankApiResponse>` 상속. 파나마 GDP(`NY.GDP.MKTP.CD`)·인구(`SP.POP.TOTL`)·보건지출(`SH.XPD.CHEX.GD.ZS`) 3개 지표 순차 수집 → 최대 3행 반환. `product_id="uuid-pa-000"`, confidence=0.92.

- **파일:** `src/crawlers/preload/pa_pubmed.ts`
  - `ApiCrawler<PubMedESearchResult>` 상속. 8종 INN 순회, esearch API로 `"INN Panama"` 논문 건수 수집 → 최대 8행 반환. NCBI 속도 제한 준수용 400ms 딜레이 내장. confidence=0.90.

- **파일:** `src/crawlers/preload/pa_ita.ts`
  - `StaticCrawler` 상속. `trade.gov/country-commercial-guides/panama-healthcare` 파싱. Overview·Key Buyers·Best Prospects 3개 섹션 제목+단락 추출 → 최대 3행. confidence=0.85.

- **파일:** `src/crawlers/preload/pa_kotra.ts`
  - `StaticCrawler` 상속. KOTRA dream 파나마 뉴스 목록 최신 3건 파싱. **TODO: 실제 URL 확인 필요.** confidence=0.82. 실패 시 `[]` 반환.

- **파일:** `src/crawlers/preload/pa_motie.ts`
  - `StaticCrawler` 상속. FTA 포털 한-중미 협정 페이지 파싱. 발효 정보·관세·의약품 조항 키워드 스니펫 추출 → 최대 3행. **TODO: 실제 URL 확인 필요.** confidence=0.83. 실패 시 `[]` 반환.

- **공통:** `market_segment: "macro"`, `fob_estimated_usd: null`(run() 강제), `pa_source_type: "static_pre_loaded"`. 개별 실패 시 빈 배열 반환 → run() `{ ok: true, inserted: 0 }` 정상 처리.
- **DB 스키마 변경:** 없음.

---

### 변경 시각 (로컬)

- **오후 (구체 시각 미기록)** — `scripts/runners/preload_macro.ts` / `.github/workflows/pa_static_macro.yml` 신규 추가 (D1 완료)

### 변경 내용

- **파일:** `scripts/runners/preload_macro.ts`
  - 5개 거시 크롤러를 순차 실행하는 진입점 스크립트.
  - 각 크롤러 `run()` 결과(`ok`, `inserted`, `elapsedMs`)를 배열로 누적.
  - 전체 완료 후 크롤러별 성공/실패·삽입 건수를 한국어 테이블로 `console.log` 출력.
  - 실패 크롤러 존재 시 `process.exit(1)`, 전부 성공 시 `process.exit(0)`.

- **파일:** `.github/workflows/pa_static_macro.yml`
  - `workflow_dispatch`만 트리거 사용. cron 금지 (ARCHITECTURE.md 절대 원칙).
  - `dry_run` input 옵션 제공 (false/true 선택).
  - Ubuntu latest + Node 22, `npm ci` 후 `npx tsx scripts/runners/preload_macro.ts` 실행.
  - `SUPABASE_URL`·`SUPABASE_KEY` secrets 주입 + 설정 여부 사전 검증 스텝.
  - `if: failure()` 조건으로 실패 시 로그 아티팩트 7일 보관.
  - `concurrency` 설정으로 동일 워크플로우 중복 실행 방지.
- **DB 스키마 변경:** 없음.

---

### 변경 시각 (로컬)

- **오후 (구체 시각 미기록)** — `src/crawlers/base/ApiCrawler.ts` / `StaticCrawler.ts` 신규 추가 (D1)

### 변경 내용

- **파일:** `src/crawlers/base/ApiCrawler.ts`
  - `BaseCrawler`를 제너릭(`<T>`)으로 상속. 생성자에서 `baseUrl`, `endpoint`, `headers` 주입.
  - `fetchJson(params?, overrideEndpoint?)` 보호 메서드 — axios GET, 타임아웃 10초, 지수 백오프 2회 재시도(500ms→1000ms). 소진 시 한국어 에러 throw.

- **파일:** `src/crawlers/base/StaticCrawler.ts`
  - `BaseCrawler`를 상속. `fetchHtml(url, extraHeaders?)` 보호 메서드 제공.
  - 요청 전 1,500~3,000ms 랜덤 딜레이 + 5종 User-Agent 랜덤 선택 (Polite Scraping 기법 ⑦ 기초).
  - axios GET → `cheerio.load()` → `CheerioAPI` 반환. 실패 시 한국어 에러 throw.

- **DB 스키마 변경:** 없음.
