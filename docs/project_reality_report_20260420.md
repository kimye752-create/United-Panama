# United Panama 프로젝트 전체 현황 종합 리포트 (2026-04-20)

- 작성 시각(KST): 2026-04-20 16:22:51 +09:00
- 범위: 코드 수정 없이 `UI → API → DB/크롤러/LLM/캐시` 실제 동작 경로 + Supabase 실측 집계
- 기준 데이터 시점: Supabase 조회 결과 `generatedAt=2026-04-20T07:22:24.908Z`

---

## A. 3공정별 플로우 다이어그램 (텍스트)

## 1단계 · 시장조사

### 1-1) 사용자 인터랙션
- 버튼: `▶ 분석 실행`
- 컴포넌트: `components/main-preview/Phase1Section.tsx`
- 호출 API: `POST /api/panama/analyze` (`app/api/panama/analyze/route.ts`)
- PDF 버튼: 같은 컴포넌트 내부 `📄 PDF 보고서 다운로드` (API 재호출 없이 응답에 포함된 base64 다운로드)

### 1-2) API 내부 실행 순서(실행체인)
1. 요청 검증: `productId` 유효성 확인
2. `analyzePanamaProduct(productId)` 실행
3. 시작 즉시 실시간 환율 호출: `exchange_rate_exim` (`fetchExchangeRateUsdKrw` + DB upsert)
4. 백그라운드 병렬 트리거
   - `fetchAndInsertOcdsRecent(...)` (PanamaCompra 최근 7일 수집/적재)
   - `fetchPerplexityInsight(...)` (논문 인사이트 캐시 갱신)
5. 핵심 DB 조회(`src/logic/fetch_panama_data.ts`)
   - `panama`: macro/price/source aggregation
   - `panama_eml`: WHO/PAHO/MINSA EML 상태
   - `panama_distributors`: 유통사 목록
6. 판정 로직: `judgeCase(...)` (Case A/B/C)
7. 정제 로직: 이상치 제거(IQR), 유통사 매칭
8. 신선도 백그라운드 체크 트리거: `runFreshnessCheckInBackground`
9. LLM 입력 데이터 구성(rawDataDigest, prevalenceMetric, market stats, entry feasibility 등)
10. LLM 호출
    - `generateReport1V3` 또는 `generateReport1`
    - 모델군: Claude Haiku 계열 (`claude-haiku-4-5-20251001`)
11. 캐시 확인/저장
    - `panama_report_cache`에서 PDF base64 캐시 조회
    - 캐시 미스면 `@react-pdf/renderer`로 PDF 생성 후 저장 시도
12. JSON 응답 반환(판정, 데이터 테이블, LLM payload, sourceBreakdown, confidenceBreakdown, pdfBase64 등)

### 1-3) 결과 렌더링
- 웹 렌더링: `components/PanamaReportClient.tsx`
  - `Report1`/`Report1V3`, `AnalysisResultDashboard`로 웹 보고서 표시
- 형태: 웹 페이지 + 별도 PDF(둘 다 존재)
- PDF 생성/다운로드 경로:
  - 기본: `POST /api/panama/analyze` 응답의 `pdfBase64`로 즉시 다운로드
  - 별도 경로: `POST /api/panama/pdf` (`app/api/panama/pdf/route.ts`)

### 1-4) 데이터 출처 매핑
- 매크로 지표(GDP·인구·의약품시장): `panama` (`market_segment='macro'`, `pa_source=worldbank/worldbank_who_ghed/iqvia_sandoz_2024/...`)
- 시장 가격 데이터: `panama` (`product_id`, `pa_source`, `pa_price_local`, `pa_notes`)
- 경쟁사 분석: `panama` (`pa_source=datos_gov_co`, `panamacompra_v3`, `acodeco*`, `superxtra_vtex`)
- 규제 정보: `panama` (`market_segment='regulatory_milestone'`, `pa_source` 내 `minsa/dnfd/wla` 계열)
- 뉴스피드: `panama_news_cache` + API fallback (`/api/panama/dashboard-news`)
- 유통사: `panama_distributors`
- EML: `panama_eml`

### 1단계 다이어그램
[사용자 클릭: `Phase1Section ▶ 분석 실행`] → [`/api/panama/analyze`] → [DB 조회: `panama`, `panama_eml`, `panama_distributors`] → [백그라운드 크롤링: `panamacompra_recent` + 환율 EXIM] → [LLM Report1 생성] → [PDF/리포트 캐시 `panama_report_cache`] → [웹 보고서 + PDF 다운로드]

---

## 2단계 · 수출가격 책정

### 2-1) 사용자 인터랙션
- 버튼: `▶ AI 가격 분석 실행`
- 컴포넌트: `components/main-preview/Phase2Section.tsx`
- 호출 API: `POST /api/panama/phase2/analyze` (`app/api/panama/phase2/analyze/route.ts`)
- PDF 버튼: 같은 컴포넌트에서 응답 base64 다운로드

### 2-2) API 내부 실행 순서
1. 요청 검증(`productId` 또는 `reportId`)
2. `reportId` 전달 시 `panama_report_cache`에서 `product_id`, `case_grade` 조회
3. 제품 메타 조회
   - 우선 `products` 테이블 조회 시도
   - 실패 시 `findProductById`(코드 사전)로 폴백
4. 경쟁가격 조회: `fetchCompetitorPrices(productId)` (기준 데이터는 `panama` 출처별 집계)
5. 가격 시나리오 계산: `generatePriceScenarios`
   - Logic A/B 수식 구현 존재
   - 공공: `FOB = 낙찰가 × (1 - 마진 - 관세 - VAT)`
   - 민간: `FOB = 소매가 × (1 - 약국마진 - 도매마진 - VAT)`
6. LLM 호출: `generatePhase2Report` (Claude Haiku + 캐시 + fallback 템플릿)
   - 캐시: `panama_report_cache`(12시간 TTL)
7. PDF 생성: `Phase2Document` 렌더링 후 base64 반환

### 2-3) 결과 렌더링
- 렌더링 컴포넌트: `components/main-preview/Phase2Section.tsx`, `components/main-preview/Phase2ResultTabs.tsx`
- 형태: 웹 결과(시나리오 카드/표) + PDF 다운로드
- PDF 경로: `POST /api/panama/phase2/analyze` 응답 `pdfBase64` 사용

### 2-4) 데이터 출처 매핑
- 참조가격/경쟁 데이터: `panama` (`pa_source`별 공공·민간 출처)
- 보고서 선택 메타: `panama_report_cache`
- 제품 메타: `products` 우선, 실패 시 `src/utils/product-dictionary.ts`

### 2-5) Logic A/B 역산 구현 여부
- **구현되어 있음(명시적)**
  - `src/logic/phase2/price_scenario_generator.ts`
  - `src/logic/phase2/margin_policy_resolver.ts`
  - `app/api/panama/phase2/analyze/route.ts`에서 formula 문자열로도 명시

### 2-6) 환율 실시간 반영 여부
- **현재 2단계 API 자체는 실시간 환율 API를 호출하지 않음**
- 내부 상수 `KRW_PER_USD = 1473.1`로 KRW 표시값 계산
- 즉, “실시간 갱신”은 1단계/환율 카드 경로에서 별도로 수행

### 2단계 다이어그램
[사용자 클릭: `Phase2Section ▶ AI 가격 분석 실행`] → [`/api/panama/phase2/analyze`] → [DB/캐시 조회: `panama_report_cache` + 경쟁가격 데이터] → [크롤링 없음] → [LLM Phase2 리포트 생성] → [응답 내 PDF base64] → [웹 시나리오 렌더링 + PDF 다운로드]

---

## 3단계 · 파트너 조사(PSI)

### 3-1) 사용자 인터랙션
- 버튼: `▶ 파트너 매칭`
- 컴포넌트: `src/components/phase3/Phase3Container.tsx` + `Phase3ReportToolbar.tsx`
- 실제 데이터 로딩: `fetchPartnersForProduct(productId)` 호출
- **중요:** 현재 UI는 `/api/panama/phase3/analyze`를 쓰지 않고, 하드코딩 데이터 로더를 사용
- PDF 버튼: `📄 파트너 매칭 보고서 PDF` → `POST /api/panama/phase3/report/pdf`

### 3-2) 데이터 출처(하드코딩 vs DB)
- 실사용: `src/lib/phase3/partners-data.ts` (20개 하드코딩)
- 로더: `src/lib/phase3/partner-data-loader.ts` (`PARTNERS`를 map)
- 미사용/레거시 API:
  - `app/api/panama/phase3/analyze/route.ts` (DB `panama_partner_psi_precomputed` 조회형)
  - `app/api/panama/phase3/route.ts` (후보 DB + LLM enrichment형)

### 3-3) PSI 계산 로직
- 가중치 기본값: revenue 35%, pipeline 28%, manufacture 20%, import 12%, pharmacy 5%
- 구현: `src/logic/phase3/psi_calculator.ts`
  - 체크된 항목만 비례 재분배(normalize)
  - 5개 모두 체크 시 `psi_total_default` 그대로 사용(순위 왜곡 방지)
  - 정렬 후 Top N 반환

### 3-4) 모달·PDF 생성 경로
- 모달: `Phase3DetailModal` (동적 import, 클라이언트 렌더)
- PDF API: `app/api/panama/phase3/report/pdf/route.tsx`
- PDF 문서: `src/lib/phase3/report/Phase3ReportDocument.tsx`
  - 데이터 소스: `PARTNERS` 하드코딩 (DB 미조회)

### 3-5) 가중치 체크박스 동작
1. 체크박스 토글 시 `checked` 상태 변경
2. 300ms 디바운스로 `debouncedChecked` 반영
3. `rankPartnersForDisplay` 재계산
4. 최소 1개 항목 강제(모두 해제 불가)

### 3단계 다이어그램
[사용자 클릭: `Phase3 ▶ 파트너 매칭`] → [클라이언트 로더 `fetchPartnersForProduct`] → [DB 조회 없음(하드코딩)] → [크롤링 없음] → [LLM 없음(실행 경로 기준)] → [캐시 없음] → [Top10/랭크/모달 렌더링 + `/api/panama/phase3/report/pdf` PDF]

---

## B. 데이터 적재 현황 표

## B-1) Supabase 테이블별 실제 행수 + 최신 업데이트

| 테이블 | 용도 | 현재 행수 | 최근 업데이트 | 데이터 출처 |
|---|---:|---:|---|---|
| `panama` | 1단계 시장·가격·규제·환율 원천 | 178 | 2026-04-20T03:25:49.288+00:00 (`crawled_at`) | 크롤러/러너 적재 |
| `panama_eml` | WHO/PAHO/MINSA EML | 18 | 2026-04-10T12:00:00+00:00 | EML 수집 파이프 |
| `panama_distributors` | 유통사/도매사 | 12 | 2026-04-12T09:39:31.402+00:00 (`collected_at`) | 시드+수집 |
| `panama_news_cache` | 뉴스 캐시 | 8 | 2026-04-20T00:37:00.623+00:00 (`created_at`) | `/api/panama/dashboard-news` |
| `panama_report_cache` | 1·2단계 리포트/PDF 캐시 | 4 | 2026-04-20T02:15:04.649+00:00 (`generated_at`) | 분석 API 생성물 |
| `panama_partner_candidates` | 3단계 후보 원천(레거시/백업) | 64 | 2026-04-18T06:38:04.572+00:00 | 후보 수집 |
| `panama_partner_psi_precomputed` | 3단계 사전 PSI(레거시) | 스키마 캐시에서 미확인 | - | 현재 UI 미사용 |
| `products` | 제품 마스터 | 권한/노출 제약으로 집계 불가 | - | 제품 메타 |

## B-2) `panama` 테이블 `pa_source` 분포

| pa_source | 행수 | 최신 crawled_at |
|---|---:|---|
| `datos_gov_co` | 109 | 2026-04-15T04:37:43.649+00:00 |
| `panamacompra_v3` | 16 | 2026-04-15T07:26:15.142+00:00 |
| `superxtra_vtex` | 15 | 2026-04-15T04:36:07.947+00:00 |
| `gemini_prevalence` | 9 | 2026-04-15T01:23:50.754+00:00 |
| `exchange_rate_exim` | 3 | 2026-04-20T03:25:49.288+00:00 |
| `acodeco_cabamed_competitor` | 3 | 2026-04-14T16:28:13.36+00:00 |
| `motie` | 2 | 2026-04-10T15:45:00+00:00 |
| `ita` | 2 | 2026-04-10T15:35:00+00:00 |
| `kotra` | 2 | 2026-04-10T15:40:00+00:00 |
| `who_paho` | 2 | 2026-04-10T16:00:00+00:00 |
| `pubmed` | 2 | 2026-04-10T15:50:00+00:00 |
| `acodeco` | 2 | 2026-04-10T15:55:00+00:00 |
| `worldbank` | 2 | 2026-04-10T15:30:00+00:00 |
| `gaceta_oficial_direct` | 2 | 2026-04-16T07:10:12.178379+00:00 |
| `dnfd_procedure_meta` | 1 | 2026-04-13T11:14:18.531+00:00 |
| `iqvia_sandoz_2024` | 1 | 2024-06-15T12:00:00+00:00 |
| `currency_peg_meta` | 1 | 2026-04-13T14:52:51.127+00:00 |
| `worldbank_who_ghed` | 1 | 2026-04-10T15:30:00+00:00 |
| `minsa_official` | 1 | 2026-04-12T09:47:31.961517+00:00 |
| `kotra_2026` | 1 | 2026-04-12T09:47:31.961517+00:00 |
| `acodeco_cabamed_self` | 1 | 2026-04-14T16:28:13.36+00:00 |

---

## C. 크롤러 19개 매트릭스

| # | 크롤러 | 코드 | 실행방식 | 최근 성공(실데이터 기준) | 현재 DB 건수 |
|---:|---|---|---|---|---:|
| 1 | `pa_worldbank.ts` | 완성 | 수동 러너/워크플로우 | 2026-04-10 (`worldbank/worldbank_who_ghed`) | 3 |
| 2 | `pa_pubmed.ts` | 완성 | 수동 러너/워크플로우 | 2026-04-10 (`pubmed`) | 2 |
| 3 | `pa_ita.ts` | 완성(구조의존) | 수동 러너/워크플로우 | 2026-04-10 (`ita`) | 2 |
| 4 | `pa_kotra.ts` | 부분(TODO 존재) | 수동 러너/워크플로우 | 2026-04-10 (`kotra`) | 2 |
| 5 | `pa_motie.ts` | 부분(TODO 존재) | 수동 러너/워크플로우 | 2026-04-10 (`motie`) | 2 |
| 6 | `pa_panamacompra.ts` | 부분 | 수동 러너 중심 | `pa_source=panamacompra` 최근 적재 미확인 | 0 |
| 7 | `pa_panamacompra_atc4.ts` | 부분/단독 실행형 | 수동 러너 | `pa_source=panamacompra_atc4_competitor` 최근 적재 미확인 | 0 |
| 8 | `pa_panamacompra_v3.ts` | 완성(Playwright) | 수동 러너/큐레이션 | 2026-04-15 (`panamacompra_v3`) | 16 |
| 9 | `panamacompra_recent.ts` | 완성 | 1단계 API 백그라운드 트리거 | `pa_source=panamacompra_recent` 적재 미확인 | 0 |
| 10 | `pa_acodeco_fetch.ts` | 완성 | 월간 cron+수동 | 파일 수집 성공 로그 기준(테이블 직접 적재 없음) | 0* |
| 11 | `pa_acodeco_cabamed.ts` | 완성 | 월간 cron+수동 | 2026-04-14 (`acodeco*`) | 6 |
| 12 | `pa_acodeco.ts` | 부분/구형 | 수동 | `acodeco`와 소스 구분 어려움 | (위 6에 포함) |
| 13 | `pa_css.ts` | 부분(불안정) | 수동 | 전용 source 적재 미확인 | 0 |
| 14 | `pa_minsa.ts` | skeleton 성격 | 수동(미완) | 2026-04-12 (`minsa_official`) | 1 |
| 15 | `pa_dnfd_consulta.ts` | 조건부 동작 | 수동/Playwright | 2026-04-13 (`dnfd_procedure_meta`) | 1 |
| 16 | `pa_arrocha.ts` | skeleton | 수동(비활성) | 전용 source 적재 미확인 | 0 |
| 17 | `pa_arrocha_v2.ts` | 부분 | 수동 러너 | `arrocha_shopify_api` 적재 미확인 | 0 |
| 18 | `pa_metroplus.ts` | skeleton | 수동(비활성) | 전용 source 적재 미확인 | 0 |
| 19 | `exchange_rate_exim.ts` | 완성 | UI + 1단계 호출 + API 직접 | 2026-04-20 (`exchange_rate_exim`) | 3 |

\* `pa_acodeco_fetch.ts`는 다운로드 단계라 `panama` 직접 insert가 없고, 실제 적재 건수는 후속 파서(`pa_acodeco_cabamed.ts`)에서 발생.

---

## D. 실시간 크롤링 매트릭스

| 액션 | 실시간 크롤링 발생? | 대상 사이트/소스 | 비고 |
|---|---|---|---|
| 1단계 분석 버튼 | 예(부분) | EXIM 환율 API, PanamaCompra OCDS 최근 7일(백그라운드) | 분석 응답 자체는 기존 DB 조회 기반 + 백그라운드 적재 |
| 환율 새로고침 | 예 | 한국수출입은행 API (`exchange_rate_exim`) | 즉시 호출 후 DB upsert |
| 뉴스 새로고침 | 전통 크롤러 관점: 아니오 / LLM 웹검색 관점: 예 | Anthropic web_search + `panama_news_cache` | `dashboard-news` API 경로 |
| 2단계 실행 | 아니오 | - | DB 조회 + 계산 + LLM 보고서 |
| 3단계 실행 | 아니오 | - | 하드코딩 데이터 로딩 + PSI 재계산 |

---

## E. 8제품별 데이터 커버리지 (`panama` 기준)

| 제품 | ACODECO | SuperXtra | OCDS | Colombia | 기타 | 합계 |
|---|---:|---:|---:|---:|---:|---:|
| Sereterol Activair | 1 | 2 | 3 | 38 | 1 | 45 |
| Rosumeg Combigel | 1 | 7 | 5 | 23 | 1 | 37 |
| Gastiin CR | 0 | 2 | 0 | 21 | 1 | 24 |
| Atmeg Combigel | 0 | 2 | 2 | 14 | 1 | 19 |
| Ciloduo | 2 | 1 | 3 | 8 | 1 | 15 |
| Hydrine | 0 | 0 | 3 | 2 | 1 | 6 |
| Omethyl Cutielet | 0 | 1 | 0 | 2 | 1 | 4 |
| Gadvoa Inj. | 0 | 0 | 0 | 1 | 1 | 2 |

분류 기준:
- ACODECO: `acodeco`, `acodeco_cabamed_self`, `acodeco_cabamed_competitor`
- SuperXtra: `superxtra_vtex`
- OCDS: `panamacompra`, `panamacompra_v3`, `panamacompra_recent`, `panamacompra_atc4_competitor`
- Colombia: `datos_gov_co`
- 기타: 위 4분류 외 source

---

## F. 발표 관점 현실 진단

## 1) 실제로 자동 동작하는 기능
- 1단계 분석 시 환율 업데이트 + 분석 리포트 생성 + PDF 생성/캐시
- 뉴스 조회/새로고침(캐시 우선, 실패 fallback)
- 환율 카드 새로고침 버튼(API 실시간 호출)
- 3단계 PSI 가중치 체크에 따른 순위 즉시 재계산

## 2) 수동 실행이 필요한 기능
- 대부분 preload 크롤러(거시/공공/민간)는 워크플로우 수동 실행 중심
- PanamaCompra V3 상세 수집/큐레이션
- SuperXtra/Colombia 러너 실행

## 3) 코드는 있으나 현재 데이터 적재가 0인 기능(실측)
- `pa_panamacompra.ts` (`panamacompra`)
- `pa_panamacompra_atc4.ts` (`panamacompra_atc4_competitor`)
- `panamacompra_recent.ts` (`panamacompra_recent`)
- `pa_arrocha.ts`, `pa_arrocha_v2.ts`, `pa_metroplus.ts`, `pa_css.ts` 관련 전용 source

## 4) 코드/운영 모두 취약한 영역
- CAPTCHA/Cloudflare/세션 의존 구간(DNFD, CSS, MINSA, 일부 민간몰)
- 3단계 DB 기반 파이프는 API 파일이 있으나 현재 UI는 하드코딩 경로 사용

## 5) 발표 당일 시연 추천 시나리오
1. 1단계 `분석 실행` 클릭 → 결과 카드/보고서/PDF 즉시 확인
2. 환율 카드 `새로고침` 클릭 → 실시간 값/출처 라벨 변화 확인
3. 뉴스 `새로고침` 클릭 → 캐시/실시간 라우트 동작 확인
4. 2단계 실행 → Logic A/B 역산 결과 + 시나리오 PDF 확인
5. 3단계 실행 → 체크박스로 PSI 순위 재배치 + 파트너 PDF 다운로드

---

## 핵심 결론 (요약)

- “분석 버튼”은 단순 조회가 아니라 **DB 분석 + 일부 실시간 트리거 + LLM 보고서 생성 + PDF 캐시**까지 포함한 복합 파이프라인입니다.
- 1단계는 실제 운영 체인이 가장 완성도 높고, 2단계는 계산식 구현이 명확하며, 3단계는 현재 **하드코딩 데이터 기반**입니다.
- 크롤러 19개 중 실데이터가 최근까지 명확히 쌓이는 축은 `datos_gov_co`, `panamacompra_v3`, `superxtra_vtex`, `exchange_rate_exim`, `acodeco*`입니다.
- “코드 존재”와 “실적재”는 분리해서 봐야 하며, 발표에서는 실적재가 확인된 경로 위주로 데모 구성하는 것이 안전합니다.
