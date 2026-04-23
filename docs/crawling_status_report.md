# United Panama 크롤링 기능 현황 리포트

- 작성일: 2026-04-20
- 점검 범위: 코드베이스 전수 검색(`playwright`, `cheerio`, `puppeteer`, `scrapy`, `axios.get`, `fetch(`, `crawl`, `scrape`) + 워크플로우 + 신선도(TTL) + 저장소 스키마 + 실행 경로
- 제약 준수: 코드 수정/빌드/배포/복구 작업 없이 정적 조사만 수행

---

## A. 현황 요약 (한 줄씩)

- 총 크롤러 파일 수(핵심 수집 모듈): **19개** (`src/crawlers/preload` + `src/crawlers/realtime`, base/helper 제외)
- 동작 가능 (추정): **10개**
- 비활성화/중단: **6개**
- 미구현/검증 필요: **3개**
- 신선도 주기 검사: **있음** (`pa_refresh_cycle`, `pa_item_collected_at`, `pa_freshness_status`) / 주기: `immediate`, `7d`, `1m`, `3m`, `1y`, `immutable`
- 자동 실행 스케줄: **있음(제한적)** — 월 1회 cron 1개 + 나머지 수동 트리거 중심

> 비유로 보면, 현재 구조는 "완전 자동 세차장"이 아니라 **반자동 세차장**입니다. 물 뿌리는 장치는 자동(환율, 일부 재수집)인데, 차를 레일에 올리는 동작(민감 사이트 크롤링)은 아직 사람이 직접 해줘야 합니다.

---

## 1) 크롤링 관련 파일 전수 조사

## 1-1. 키워드 검색 결과 요약

- `playwright`: 다수 사용 (PanamaCompra V3, DNFD, MINSA 실험 러너)
- `cheerio`: 사용 (정적 HTML 파싱 계열)
- `puppeteer`: **미사용**
- `scrapy`: **미사용**
- `axios.get`: 사용 (ApiCrawler, StaticCrawler)
- `fetch(`: 사용 (OCDS, EXIM, 뉴스/외부 API)
- `crawl`, `scrape`: 함수/스크립트명 다수 존재

## 1-2. 발견 파일과 대상 사이트 (핵심)

| # | 파일 | 대상 사이트/데이터 |
|---|---|---|
| 1 | `src/crawlers/preload/pa_worldbank.ts` | World Bank API |
| 2 | `src/crawlers/preload/pa_pubmed.ts` | NCBI PubMed E-utilities |
| 3 | `src/crawlers/preload/pa_ita.ts` | trade.gov (ITA Panama Healthcare) |
| 4 | `src/crawlers/preload/pa_kotra.ts` | dream.kotra.or.kr (TODO 기반) |
| 5 | `src/crawlers/preload/pa_motie.ts` | fta.go.kr (TODO 기반) |
| 6 | `src/crawlers/preload/pa_panamacompra.ts` | PanamaCompra OCDS API |
| 7 | `src/crawlers/preload/pa_panamacompra_atc4.ts` | PanamaCompra OCDS(API, ATC4 경쟁품) |
| 8 | `src/crawlers/preload/pa_panamacompra_v3.ts` | PanamaCompra V3 웹(Playwright + PDF) |
| 9 | `src/crawlers/realtime/panamacompra_recent.ts` | PanamaCompra OCDS 최근 7일 |
| 10 | `src/crawlers/preload/pa_acodeco_fetch.ts` | ACODECO CABAMED XLSX 다운로드 |
| 11 | `src/crawlers/preload/pa_acodeco_cabamed.ts` | CABAMED XLSX 파싱/적재 |
| 12 | `src/crawlers/preload/pa_acodeco.ts` | ACODECO HTML 추정 파싱(구형) |
| 13 | `src/crawlers/preload/pa_css.ts` | css.gob.pa PDF 링크/파싱 |
| 14 | `src/crawlers/preload/pa_minsa.ts` | minsa.gob.pa (세션/CSRF 필요, skeleton) |
| 15 | `src/crawlers/preload/pa_dnfd_consulta.ts` | tramites-minsa.panamadigital.gob.pa (Playwright) |
| 16 | `src/crawlers/preload/pa_arrocha.ts` | arrocha.com (구형 skeleton) |
| 17 | `src/crawlers/preload/pa_arrocha_v2.ts` | arrocha.com Shopify Suggest API |
| 18 | `src/crawlers/preload/pa_metroplus.ts` | metroplus.com.pa (skeleton) |
| 19 | `src/crawlers/realtime/exchange_rate_exim.ts` | 한국수출입은행 환율 API |

추가 실행 러너(운영 체인 관점 중요):
- `scripts/runners/insert_superxtra_vtex_panama.ts` (superxtra.com VTEX)
- `scripts/runners/insert_colombia_socrata_panama.ts` (datos.gov.co Socrata)
- `scripts/runners/freshness_refresh_runner.ts` (stale 대상 재수집 오케스트레이션)
- `scripts/runners/preload_*` 계열 (macro/public/private/panamacompra/dnfd)

---

## 2) 신선도 주기(TTL) 검사 로직

구현됨.

- 기준 레지스트리: `src/constants/freshness_registry.ts`
  - 예: `exchange_rate_exim=immediate`, `arrocha=7d`, `acodeco_cabamed_competitor=1m`, `kotra=3m`, `worldbank=1y`
- 규칙 엔진: `src/logic/freshness_rules.ts`
  - 7d: 10일 초과 stale_likely, 14일 초과 stale_confirmed
  - 1m: 45/60일
  - 3m: 120/180일
  - 1y: 540/730일
- LLM 의미 판정: `src/logic/freshness_checker.ts`
- 백그라운드 반영: `src/logic/freshness_background.ts`
  - 최근 1시간 내 재판정 skip
  - immutable 소스는 판정 결과 있으면 skip
- stale 대상 VIEW: `scripts/sql/v_stale_items.sql`
  - `pa_freshness_status in ('stale_likely','stale_confirmed')`만 재수집 큐로 매핑

캐시 TTL 별도:
- 뉴스: `src/logic/fetch_panama_dashboard_news.ts` (`24h`)
- 보고서 캐시: `scripts/ddl/panama_report_cache.sql` (`expires_at`, 24h)
- Perplexity 인사이트: `src/logic/perplexity_insights.ts` (`7d`)

---

## 3) 실행 방식 (자동/수동/수동-UI)

## 3-1. GitHub Actions 워크플로우

| 파일 | 트리거 | 용도 |
|---|---|---|
| `.github/workflows/pa_static_macro.yml` | `workflow_dispatch` | 거시 수집 러너 실행 |
| `.github/workflows/pa_static_public.yml` | `workflow_dispatch` | 공공 preload dry-run |
| `.github/workflows/freshness_refresh.yml` | `workflow_dispatch` | stale 기반 선택 재수집 |
| `.github/workflows/acodeco_monthly.yml` | `schedule(cron: 0 3 1 * *)` + `workflow_dispatch` | CABAMED 월간 자동 갱신 |

판정:
- 자동 스케줄은 **ACODECO 월간 1개만 실자동**
- 나머지는 **운영자 수동 실행 중심**

## 3-2. UI에서 호출되는 갱신 버튼/API

- 환율 새로고침 버튼: `components/panama/ExchangeRateCard.tsx`
  - `GET /api/panama/exchange-rate` 호출
  - 서버에서 `exchange_rate_exim` 실행 + DB upsert
- 뉴스 새로고침 버튼:
  - `components/dashboard/main/MarketNewsCard.tsx`
  - `components/main-preview/MarketTrends.tsx`
  - `GET /api/panama/dashboard-news` 호출 (web_search + cache), 전통 크롤러는 아님
- 분석 API(`POST /api/panama/analyze`) 내부에서 백그라운드:
  - `fetchAndInsertOcdsRecent(...)` 실행 (최근 7일 OCDS)

---

## 4) 데이터 저장소 (Supabase 테이블)

## 4-1. 크롤링 결과 저장 테이블

| 테이블 | 크롤링 데이터 저장 여부 | 시각 컬럼 |
|---|---|---|
| `panama` | 예 (핵심) | `crawled_at`, `pa_item_collected_at`, `pa_freshness_checked_at` |
| `panama_eml` | 예 (EML 계열) | `crawled_at` |
| `panama_distributors` | 예(수집/시드 혼합) | `collected_at` |
| `panama_news_cache` | 캐시 | `created_at` |
| `panama_report_cache` | 보고서 캐시 | `generated_at`, `expires_at` |

`updated_at`/`last_crawled_at`:
- 코드/DDL 기준으로는 **핵심 크롤링 테이블에 범용 `updated_at`, `last_crawled_at`는 없음**
- 대신 `pa_item_collected_at`, `pa_freshness_*` 조합으로 신선도 관리

---

## 5) 외부 의존성 점검

## 5-1. 환경변수 키 (.env 계열, 마스킹)

확인된 크롤링/외부호출 관련 키:
- `SUPABASE_URL`, `SUPABASE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY` (또는 문서상 `CLAUDE_API_KEY`)
- `EXIM_API_KEY`
- `PERPLEXITY_API_KEY`
- `RESIDENTIAL_PROXY_URL`
- `ARROCHA_SESSION_COOKIE`
- `PANAMACOMPRA_*` 런타임 튜닝 변수들
- `DNFD_SKIP`

주의 사항:
- `.env.example`에는 `CLAUDE_API_KEY`, 실제 코드 다수는 `ANTHROPIC_API_KEY` 참조 → 환경 불일치 시 기능 비활성 가능
- 로컬 파일에서 키 이름 대소문자/표기 불일치(`Perplexity_API_key`) 흔적 존재 → 리눅스 배포에서 미인식 위험

## 5-2. package.json 크롤링 관련 의존성

- `playwright`, `playwright-extra`
- `cheerio`
- `axios`
- `xlsx`, `pdf-parse`

`puppeteer`/`scrapy` 의존성은 없음.

## 5-3. 프록시/VPN/헤드리스 설정

- 프록시: `RESIDENTIAL_PROXY_URL` (민간 약국 우회용 문서화)
- 헤드리스:
  - `pa_panamacompra_v3.ts`: 기본 headless, `PANAMACOMPRA_V3_HEADFUL=1` 지원
  - `playwright_minsa_consulta.ts`: headless false(탐사용)
- TLS 완화:
  - OCDS 호출에서 `rejectUnauthorized: false` 사용(서버 인증서 이슈 대응)

---

## 6) 중단·비활성화 이유 추적

핵심 원인 패턴:

1) **명시적 skeleton/중단 코드**
- `pa_arrocha.ts`, `pa_metroplus.ts`, `pa_minsa.ts`에서 실환경 실행 시 `throw new Error(...)`로 즉시 중단
- `preload_private.ts`는 `--dry-run` 없으면 실행 자체를 막음

2) **사이트 구조/차단 이슈**
- `pa_css.ts`: "manual inspection" 오류 경로 다수
- `pa_dnfd_consulta.ts`: CAPTCHA 감지 시 `MANUAL_INTERVENTION_REQUIRED`
- PanamaCompra 계열: TLS 인증서 이슈를 코드로 우회 중

3) **코드상 TODO/불완전 셀렉터**
- `pa_kotra.ts`, `pa_motie.ts`는 URL/셀렉터 TODO가 남아 있고 실패 시 `return []` 처리

4) **호출되지 않는(운영 경로 미연결) 기능**
- `crawlPanamaCompraAtc4`는 구현되어 있으나 워크플로우/메인 API 자동 경로에서 직접 호출되지 않음 (단독 실행형)
- `runArrochaShopifyV2`는 러너(`preload_arrocha_v2.ts`)는 있으나 정기 워크플로우 연결 확인 안 됨

5) **silent fail 성향**
- 일부 크롤러는 오류를 throw 대신 로그 후 `[]` 반환 (`pa_ita.ts`, `pa_kotra.ts`, `pa_motie.ts`)
- 분석 경로의 백그라운드 작업(`ocds_recent`, `perplexity`) 실패가 사용자 요청을 직접 실패시키지 않음

---

## 7) 각 크롤러별 상태 진단 (요약)

## 7-1. 기능별 상세 표

| # | 기능 | 파일 경로 | 구현 상태 | 마지막 커밋 | 중단 이유 (있다면) |
|---|---|---|---|---|---|
| 1 | 1단계 파나마 공공조달(OCDS) | `src/crawlers/preload/pa_panamacompra.ts` | 부분 동작(데이터 희소) | `bd31ba6` (2026-04-15) | 키워드 미매칭 가능성 높음 |
| 2 | 1단계 파나마 공공조달(ATC4 경쟁품) | `src/crawlers/preload/pa_panamacompra_atc4.ts` | 동작 가능(단독 실행형) | `f2c1b0d` (2026-04-15) | 운영 자동 경로 미연결 |
| 3 | PanamaCompra V3 웹+PDF | `src/crawlers/preload/pa_panamacompra_v3.ts` | 동작 가능(탐색/수집), 적재는 별도 | `bd31ba6` (2026-04-15) | 사이트 변동 시 셀렉터 리스크 |
| 4 | PanamaCompra 최근 7일 백그라운드 | `src/crawlers/realtime/panamacompra_recent.ts` | 동작 가능(분석 API 연동) | `f682b5b` 계열 연동 | TLS 우회 의존 |
| 5 | ACODECO 월간 XLSX 수집 | `src/crawlers/preload/pa_acodeco_fetch.ts` | 동작 가능 | `2d7a0ff` (2026-04-14) | 구조 바뀌면 링크 탐색 실패 |
| 6 | ACODECO CABAMED 적재 | `src/crawlers/preload/pa_acodeco_cabamed.ts` | 동작 가능 | `bd31ba6` (2026-04-15) | XLSX 칼럼 포맷 변동 시 실패 |
| 7 | ACODECO 구형 HTML 크롤러 | `src/crawlers/preload/pa_acodeco.ts` | 불안정/비권장 | `-` | `manual inspection` 전제 |
| 8 | Super Xtra VTEX 적재 | `scripts/runners/insert_superxtra_vtex_panama.ts` | 동작 가능 | `bd31ba6` (2026-04-15) | SKU/가격 필드 변동 가능 |
| 9 | Colombia Socrata 적재 | `scripts/runners/insert_colombia_socrata_panama.ts` | 동작 가능 | `bd31ba6` (2026-04-15) | API rate/스키마 변동 가능 |
| 10 | 환율 API 연동 | `src/crawlers/realtime/exchange_rate_exim.ts` | 동작 가능(실패 시 DB 폴백) | `f682b5b` (2026-04-16) | API 키/네트워크 오류 시 fallback |
| 11 | DNFD Playwright 조회 | `src/crawlers/preload/pa_dnfd_consulta.ts` | 조건부 동작 | `33f35ba` (2026-04-13) | CAPTCHA/봇차단 |
| 12 | MINSA 크롤러 | `src/crawlers/preload/pa_minsa.ts` | 중단(skeleton) | `-` | CSRF/세션 쿠키 미완 |
| 13 | CSS 크롤러 | `src/crawlers/preload/pa_css.ts` | 중단 위험 높음 | `-` | Cloudflare/PDF 구조 불확실 |
| 14 | Arrocha 구형 | `src/crawlers/preload/pa_arrocha.ts` | 비활성(skeleton) | `74837c0` (2026-04-12) | 프록시+우회 미구현 |
| 15 | Arrocha v2 Shopify | `src/crawlers/preload/pa_arrocha_v2.ts` | 부분 동작(결과 희소 가능) | `33f35ba` (2026-04-13) | 잠금/지역제한/빈 결과 |
| 16 | Metro Plus | `src/crawlers/preload/pa_metroplus.ts` | 비활성(skeleton) | `74837c0` (2026-04-12) | Turnstile/우회 미구현 |
| 17 | KOTRA 거시 수집 | `src/crawlers/preload/pa_kotra.ts` | 미구현/검증 필요 | `4812b2e` (2026-04-12) | TODO URL/셀렉터 |
| 18 | MOTIE 거시 수집 | `src/crawlers/preload/pa_motie.ts` | 미구현/검증 필요 | `4812b2e` (2026-04-12) | TODO URL/셀렉터 |
| 19 | ITA/WorldBank/PubMed 거시 | `pa_ita.ts`, `pa_worldbank.ts`, `pa_pubmed.ts` | 동작 가능(ITA는 구조 의존) | `4812b2e` (2026-04-12) | 사이트 구조 변경 시 파싱 저하 |

## 7-2. 예상 에러 시나리오

- 셀렉터 붕괴: KOTRA/MOTIE/파나마 V3 UI가 바뀌면 즉시 영향
- 접근 차단: DNFD(CAPTCHA), CSS(Cloudflare), 민간 약국(WAF/지역제한)
- 인증 이슈: CSRF/세션 쿠키 필요 경로(MINSA, 일부 민간몰)
- 키 이슈: `EXIM_API_KEY`, `ANTHROPIC_API_KEY` 누락 시 fallback 또는 기능 저하
- TLS 이슈: OCDS 인증서 정상화 전까지 우회 코드 의존

---

## C. 중단된 크롤러의 구체적 이유

체크리스트 매핑:

- [x] 대상 사이트 접근 차단 (IP 차단, 캡차, robots.txt)
  - DNFD CAPTCHA, CSS Cloudflare, 민간몰 차단
- [x] 대상 사이트 HTML 구조 변경으로 selector 깨짐
  - PanamaCompra V3/KOTRA/MOTIE는 구조 의존성이 큼
- [ ] 외부 API 키 만료·변경
  - 코드상 명시적 만료 흔적은 없음(잠재 리스크는 존재)
- [x] 코드 작성 중 중단 (미완성)
  - `pa_minsa.ts`, `pa_arrocha.ts`, `pa_metroplus.ts` skeleton
- [x] 명시적 의도로 비활성화
  - `preload_private.ts`가 non-dry-run 차단
- [x] 환경변수 누락
  - 프록시/쿠키/키 불일치 시 기능 미작동 가능
- [ ] 의존성 패키지 충돌
  - 정적 조사에서 직접 증거 없음
- [x] 기타
  - PanamaCompra TLS 인증서 이슈를 코드로 임시 우회

---

## D. 복구 난이도 평가

| 크롤러 | 현재 상태 | 복구 난이도 |
|---|---|---|
| `pa_kotra.ts`, `pa_motie.ts` | TODO URL/셀렉터 보강 필요 | ⭐⭐ (1~3시간) |
| `pa_arrocha.ts`, `pa_metroplus.ts` | skeleton + 차단 우회 필요 | ⭐⭐⭐⭐ (외부 제약 큼) |
| `pa_minsa.ts` | CSRF/세션 로직 미완 | ⭐⭐⭐ (1일+) |
| `pa_css.ts` | Cloudflare + PDF 패턴 불안정 | ⭐⭐⭐⭐ |
| `pa_dnfd_consulta.ts` | CAPTCHA 의존 | ⭐⭐⭐⭐ |
| `pa_panamacompra_v3` 자동적재 | 현재 dry-run/curated 중심 | ⭐⭐~⭐⭐⭐ |

---

## E. 발표 D-5 관점 권장 액션

- 크롤링 시연 가능 여부: **제한적 가능**
  - 추천 시연: `환율(EXIM)` + `PanamaCompra 최근 7일 백그라운드` + `ACODECO 월간 갱신 흐름`
- 시연 추천 크롤러(안정성 순):
  1) `exchange_rate_exim`
  2) `pa_acodeco_fetch` + `pa_acodeco_cabamed`
  3) `insert_colombia_socrata_panama` / `insert_superxtra_vtex_panama`
- 심사위원 예상 질문 대응:
  - Q: 왜 일부는 수동/반자동인가?
    - A: 보안 차단(CAPTCHA/WAF/Cloudflare) 구간은 데이터 품질 보장을 위해 반자동 전략 채택
  - Q: 데이터가 오래되면?
    - A: `pa_freshness_status` + `v_stale_items` + `freshness_refresh_runner`로 stale 항목만 선택 재수집
  - Q: 운영 자동화 수준?
    - A: 월간 cron 1개 + 수동 워크플로우(비용/차단 리스크 통제)

---

## 부록: 실행 방식 판정 기준

- **동작 가능**: 코드상 실동작 경로 + 재시도/오류처리/적재 로직 존재
- **비활성/중단**: 의도적 throw/skeleton 또는 차단 의존으로 실환경 성공 확률 낮음
- **미구현/검증 필요**: TODO/셀렉터 미확정으로 신뢰도 낮음
