# Vibe Coding Log

## [Unreleased] - 2026-04-15 18:03:24 (feat(report1): 양식 강화 잔여 패치 1/2/5 + 캐시 초기화 + 3개 품목 검증)

### Changed
- feat(llm): `src/llm/report1_schema.ts` 시스템 프롬프트 강화 — PanamaCompra V3 필수 항목 누락 시 무효 규칙과 블록4-3의 `유통 파트너 매트릭스` 명시 규칙 추가.
- feat(llm): `src/llm/report1_generator.ts` 사용자 프롬프트 강화 — V3 메타(총건수/핵심 proveedor/제조사/원산지/발주기관/발주일/대표단가) 직접 주입 및 블록4-2·4-3 강제 인용 규칙 추가, Fallback 경로에도 `panamacompraV3Top` 전달.
- feat(api): `app/api/panama/analyze/route.ts`에 `panamacompraV3Top` 계산 로직 추가 — `pa_notes` JSON에서 proveedor 빈도 상위 1개를 추출하고 제조사/원산지/발주기관/발주일/대표단가를 함께 생성.
- fix(fallback): `src/llm/report1_fallback_template.ts` V3 메타 스키마를 신규 `GeneratorInput` 구조에 맞춰 정렬하고, 블록4-2 본문에 V3 메타 + DGCP 출처가 노출되도록 보강.
- chore(cache): `panama_report_cache` 전체 삭제 실행으로 신규 프롬프트·양식 규칙 재생성 유도.
- test(report): Rosumeg/Hydrine/Sereterol 3개 보고서 캡처 및 API 기반 본문 검증 수행(`scripts/capture_report1_triplet.ts`, `scripts/runners/verify_report1_v3_meta.ts`) — 3건 모두 V3 출처/메타 노출 플래그 true 확인.

## [Unreleased] - 2026-04-16 (fix(report): PanamaCompra V3 공공조달 통계 반영 + ATC4 길이 통일)

### Changed
- fix(report): `market_stats.ts` — 공공 통계를 `panamacompra_atc4_competitor` + `panamacompra_v3` 합산으로 집계하고 `pa_price_local` 문자열도 숫자로 강제 파싱.
- fix(report): `panama_analysis.ts`/`fetch_panama_data.ts` — `panamacompraCount`를 `panamacompra`/`panamacompra_v3`/`panamacompra_atc4_competitor` 통합 카운트로 변경.
- fix(llm): `report1_generator.ts`/`report1_schema.ts` — 프롬프트 표기 출처를 V3 포함으로 갱신하고, PanamaCompra V3 인용 시 `PanamaCompra V3 - DGCP (Ley 419 de 2024)` 명시 규칙 추가.
- fix(data): `insert_panamacompra_v3_curated.ts`의 `self_inn_atc4` 생성 규칙을 ATC4 5자리(`C10AA`)로 통일, 기존 `panamacompra_v3` 16건 `pa_notes.self_inn_atc4`를 DB에서 일괄 보정.

## [Unreleased] - 2026-04-16 (feat(crawl): PanamaCompra V3 정형 데이터 INSERT — 19건 중 16건 자사 매칭)

### Changed
- 자사 매칭 16건: Rosumeg 5건 + Hydrine 3건 + Ciloduo 3건 + Atmeg 2건 + Sereterol 3건.
- BONUS SKIP 3건: Dacarbazina, Metotrexato, Triplixam (self_product_uuid=null, 참고용 박제).
- 출처: PanamaCompra V3 - DGCP (Ley 419 de 2024), 수집 방법: 사용자 수동 PDF 다운로드 + Claude 정형화 추출.
- PanamaCompra V3 Playwright 자동화는 보류, confidence=0.98 기준으로 정형 데이터 직접 INSERT.

## [Unreleased] - 2026-04-16 (feat(crawl): PanamaCompra V3 13건 정형 INSERT (PDF 사용자 수집 + Claude 추출))

### Added
- feat(crawl): `data/seed/panama/round6_panamacompra_v3_curated.json` 신규 추가(현재 전달받은 1건 스키마 반영).
- feat(crawl): `scripts/runners/insert_panamacompra_v3_curated.ts` 신규 추가. curated JSON을 `panama`에 직접 INSERT하고, `proceso_numero + inn` 기준 중복 SKIP, `panama_report_cache` 삭제 및 `pa_source`/`product_id` 집계 출력.

## [Unreleased] - 2026-04-16 (fix(crawl): PanamaCompra V3 Angular SPA 진입 경로 교정 (메인→팝업닫기→V3 검색페이지) + 단계별 스크린샷)

### Changed
- fix(crawl): `pa_panamacompra_v3.ts` — `PANAMACOMPRA_V3_HOME_URL`·`PANAMACOMPRA_V3_SEARCH_URL`(`#/busqueda-avanzada`)로 진입; `closePromoModalIfPresent`·`navigateToBusquedaAvanzadaV3`로 메인→모달 닫기→V3 검색·`input#descripcion` 대기; 레거시 `ambiente_publico` 라우트 패치 제거; `debug_01_home`~`debug_04_after_search` 단계 PNG.

## [Unreleased] - 2026-04-16 (fix(crawl): PanamaCompra V3 Angular SPA selector 교정 (input#descripcion + button[aria-label]))

### Changed
- fix(crawl): `pa_panamacompra_v3.ts` — Angular 우선(`input[name="descripcion"]`·`#descripcion`), 검색 `button[aria-label="찾아보세요"]`·`btn-blue-dark`; 날짜 `fechaDesde`/`fechaInicio`/`dateFrom` 등 추정 후 미존재 시 SKIP; `networkidle`·`input#descripcion` 대기 10초; 결과 `table tbody tr`·레코드 문구 대기; 디버그 `debug_{timestamp}_*.png/html`.
- fix(crawl): `pa_panamacompra_v3.ts` — `javascript/ambiente_publico.js`의 `location.replace(origin)` 패치로 레거시 Pliego 검색 폼 유지, `divFiltros` 표시·`txtNombreAdquisicion`·빈 `btnBuscar` 앵커 `force` 클릭·`txtFechaDesde/Hasta` 보강.
- chore: `npm run crawl:panamacompra-v3:dry` → Rosuvastatina 5건 `test_panamacompra_v3_dry_run.ts` 연결.

## [Unreleased] - 2026-04-16 (feat(crawl): PanamaCompra V3 Playwright dry-run - Rosumeg 5건 검증)

### Added
- feat(crawl): `src/utils/panamacompra_pdf_parser.ts` — ORDEN PDF `renglones[]`·`rawTextFirstPage`·파이프 표 형식 단가 파싱.
- feat(crawl): `scripts/runners/test_panamacompra_v3_dry_run.ts` — Rosuvastatina 상위 5건 검색→PDF→파싱→매칭 표(INSERT 없음).
- chore(crawl): `npm run test:panamacompra-v3:dry` 스크립트 추가.

### Changed
- feat(crawl): `pa_panamacompra_v3.ts` — `searchPanamaCompraV3(키워드만)` 기본 5건·날짜 env; `searchPanamaCompraV3WithDates` 분리; `fetchProcessDetail` → PDF 절대경로 `string | null`; 검색 실패 시 `debug_search.png`/`debug_search.html`; 재시도 간격 30초·PDF 후 3초 대기.
- feat(crawl): `resolvePanamaCompraProduct(descripcion, atc)` ATC4 우선·C10AA는 설명으로 Rosumeg/Atmeg 분기.

## [Unreleased] - 2026-04-16 (feat(crawl): PanamaCompra V3 운영 서버 Playwright 자동화 + 신 8제품 ATC 매칭 + N건 적재)

### Added
- feat(crawl): `src/crawlers/preload/pa_panamacompra_v3.ts` — 고급 검색(`searchPanamaCompraV3`/`searchPanamaCompraV3OnPage`), 상세 `fetchProcessDetail`, ORDEN PDF `extractPriceFromOrdenPDF`(pdf-parse `PDFParse`), PDF 저장 `data/raw/panamacompra_v3/`.
- feat(crawl): `resolvePanamaCompraProduct` — `src/utils/competitor_price_filters.ts`에 ATC5·키워드 우선순위 매칭.
- feat(crawl): `scripts/runners/insert_panamacompra_v3_panama.ts` — **dry-run 전용**(단계 7: INSERT 없음), 키워드별 집계 JSON.

### Notes
- 운영 포털 DOM·차단 여부에 따라 검색 입력란 선택자는 로컬에서 `page.pause()` 또는 스크린샷으로 보정 필요할 수 있음.
- 단계 8 INSERT·캐시 삭제는 Claude GO 후 별도 실행.

## [Unreleased] - 2026-04-16 (feat(crawl): Super Xtra N건 + Colombia Socrata N건 적재 완료)

### Added
- feat(crawl): `src/utils/competitor_price_filters.ts` — USD 단가 상한·Omethyl 건기식 블랙리스트(VTEX·Colombia 공통).
- feat(crawl): `src/utils/vtex_product_helpers.ts` — VTEX `commertialOffer`·slug·재고 추출.
- feat(crawl): `src/utils/colombia_socrata_blocks.ts` — Socrata 키워드 블록(드라이런·적재 공용).
- feat(crawl): `scripts/runners/insert_superxtra_vtex_panama.ts` — `resolveSuperXtraProduct` 후 가격·상한·중복(`pa_product_name_local`+`pa_ingredient_inn`+`pa_source`) 필터·`pa_source=superxtra_vtex` INSERT.
- feat(crawl): `scripts/runners/insert_colombia_socrata_panama.ts` — `resolveCompetitorProduct(principio+nombre)`·동일 상한·`pa_source=datos_gov_co` INSERT(COP÷4000→USD).
- feat(ops): `scripts/runners/panama_post_import_verify.ts` — `panama_report_cache` 전량 삭제·소스별·product_id별 집계 JSON.

### Changed
- feat(crawl): `src/utils/superxtra_product_matcher.ts` — `resolveCompetitorProduct(combinedText)` 추가(Colombia 텍스트 블롭용).
- chore(crawl): `scripts/runners/test_colombia_socrata_dry_run.ts` — `COLOMBIA_SOCRATA_BLOCKS` 재사용.

### Results (세션 실행)
- Super Xtra: 적재 **15건**(수집 84 SKU, 상한·가격≤0·미매칭으로 다수 SKIP).
- Colombia: 적재 **109건**(병합 208행, 동일 상품명+INN 중복 **84건** SKIP).
- `panama` 총 **159행**·`panama_report_cache` 비움.

## [Unreleased] - 2026-04-16 (feat(crawl): Super Xtra VTEX API 신 8제품 적재 N건 + 매칭 우선순위 교정)

### Added
- feat(crawl): `src/utils/superxtra_product_matcher.ts` — `resolveSuperXtraProduct(name, desc)` 우선순위(조합제 1~4 → 단일 5~14)로 SKU를 1개 product_id에만 귀속. `innUpperForSuperXtraProductId`는 INSERT 시 `pa_ingredient_inn`용.
- feat(crawl): `scripts/runners/test_superxtra_vtex_dry_run.ts` — `findProductByPanamaText`(교정 전) vs `resolveSuperXtraProduct`(교정 후) 동시 집계·`summary` 합계 출력.

### Notes
- Dry-run 합계: 교정 전 28 SKU 귀속 / 교정 후 57 SKU 귀속(Claude GO 후 `pa_source=superxtra_vtex` INSERT·캐시 삭제는 별도 단계).

## [Unreleased] - 2026-04-16 (feat(crawl): Colombia datos.gov.co 신 8제품 Socrata API dry-run)

### Added
- feat(research): `scripts/runners/test_colombia_socrata_dry_run.ts` — Socrata `3t73-n4q9` (`$q`·`$limit=50`) 키워드별 조회, ocid 유사 dedupe, INN 부분일치 필터, `precio_por_tableta` COP→USD(4000:1 근사). INSERT 없음.

## [Unreleased] - 2026-04-16 (feat(research): Super Xtra VTEX 카탈로그 API 8제품 dry-run)

### Added
- feat(research): `scripts/runners/test_superxtra_vtex_dry_run.ts` — Super Xtra VTEX `products/search` + `ocdsSearchTermsForProduct` 키워드로 `findProductByPanamaText` 매칭·가격 범위 JSON(INSERT 없음). 2초 간격·브라우저 UA.
- chore(crawl): `pa_panamacompra.ts` — `ocdsSearchTermsForProduct` export(타 모듈·스크립트 재사용).
- docs: `ARCHITECTURE.md` — Phase B 표·상세에 **Super Xtra (VTEX)** 추가(의약 ~2765 SKU, `commertialOffer`).

## [Unreleased] - 2026-04-16 (chore(research): ACODECO Decreto 3/2023 의약품 PDF 다운로드·텍스트 추출 검증)

### Added
- chore(research): `data/raw/acodeco/decreto3_2023_medicamentos.pdf` — La Prensa CDN `MEDICAMENTOS.pdf` (Decreto Ejecutivo 참조 상한가, ~4.2MB).
- chore(scripts): `scripts/runners/test_decreto3_pdf_extract.ts` — `pdf-parse`(PDFParse) 전체 텍스트·INN 키워드·가격 패턴 카운트·상위 30줄 샘플 JSON 출력(DB 미사용).

## [Unreleased] - 2026-04-16 (feat(crawl): PanamaCompra OCDS 신 8제품 키워드로 dry-run 재조사)

### Changed
- feat(crawl): `src/crawlers/preload/pa_panamacompra.ts` — `OCDS_SEARCH_KEYWORDS_BY_PRODUCT_ID`(신 8제품 스페인어·치료분야 키워드), `ocdsSearchTermsForProduct`로 OCDS 검색어 분리. 맵 사용 시 `findProductByKeyword` 교차 스킵 비활성화(공유 키워드 누락 방지).
- feat(crawl): `runOcdsDryRunDetailed()` — `--dry-run` 시 제품별 키워드 순회·ocid 합집합·품목 매칭 건수·PAB 범위·Korea United supplier 휴리스틱·샘플 설명 JSON 출력(INSERT 없음).
- chore(crawl): dry-run 시간·API 부하 조절용 환경변수 `PANAMACOMPRA_DRY_RUN_KEYWORDS_PER_PRODUCT`, `PANAMACOMPRA_OCDS_MAX_PAGES`(페이징 상한, 기본 12).
- fix(crawl): `productHasOcdsKeywordMap` 명명(ESLint react-hooks 오탐 방지), dry-run PAB·샘플 문자열 타입 안전 처리.

## [Unreleased] - 2026-04-16 (feat(crawl): CABAMED 경쟁품 키워드 8제품 확장 + dry-run 집계)

### Changed
- feat(crawl): `src/crawlers/preload/cabamed_match.ts` — `COMPETITOR_TOKENS_BY_PRODUCT_ID`를 신 8제품 ATC4 스페인어·영문 키워드로 확장(Hydrine·Ciloduo·Gastiin·Rosumeg·Atmeg·Sereterol·Omethyl·Gadvoa).
- feat(crawl): `src/crawlers/preload/pa_acodeco_cabamed.ts` — 경쟁품 `pa_notes`에 `premium_grade: "generic"` 박제, `--dry-run`으로 INSERT 없이 매칭 집계(`dryRunCabamedFromXlsx`).
- chore(seed): 루트 `CABAMED-Formato-Publicacion-Farmacias-Privadas.xlsx`를 `data/seed/panama/acodeco_cabamed.xlsx`로 복사(파서 기본 경로).

## [Unreleased] - 2026-04-15 (feat(report): Report1 웹 화면 A4 2페이지 시각 분리 + 인쇄용 page-break)

### Changed
- feat(ui): `components/Report1.tsx` — 단일 article를 A4 카드 2장(①~③ / ④+Perplexity+PDF)으로 분리, `min-h-[297mm]`, Page2 간소 헤더·`— 1/2 —` `— 2/2 —` 페이지 번호, 점선 구분 제거, 스택 영역 `bg-slate-100` 간격.
- chore(css): `app/globals.css` — `.report-a4-web-root > article` 인쇄용 `page-break-after` (마지막 카드는 auto).

## [Unreleased] - 2026-04-15 (feat(seed): round4_prevalence.json 신 8제품 기준 전체 교체 + 적재)

### Changed
- feat(seed): `data/seed/panama/round4_prevalence.json` — 구 INN 8엔트리 폐기, `product-dictionary.ts` 8제품 INN(Hydroxyurea·Cilostazol+Rosuvastatin·Mosapride·Rosuvastatin+Omega-3·Atorvastatin+Omega-3·Salmeterol+Fluticasone·Omega-3·Gadobutrol)+`macro_healthcare_infra`로 교체. 백업: `data/seed/panama/archive/round4_prevalence_backup_session20.json`.
- chore(scripts): `scripts/runners/reseed_prevalence.ts` — `--dry-run` 시 파싱만 수행(DB 미변경).
- chore(db): `npm run seed:prevalence` 실행 — 대상 9 `product_id`의 `gemini_seed`/`gemini_prevalence` 행 삭제 후 `gemini_prevalence` 9행 재적재.

## [Unreleased] - 2026-04-15 (chore(db): panama_eml 구 INN 30행 청소, 신 제품 18행 보존)

### Changed
- chore(db): Supabase 마이그레이션 `panama_eml_backup_session20` — `panama_eml_backup_session20 AS SELECT * FROM panama_eml`(48행 스냅샷).
- chore(db): Supabase `panama_eml` — `pa_inn_name IN (Aceclofenac, Itopride, Rabeprazole, Erdosteine, Levodropropizine)` 30행 DELETE. 잔존 18행(Hydroxyurea·Omega-3-acid ethyl esters·Cilostazol 각 6행). `panama_backup_session13`·`panama` 미변경.

## [Unreleased] - 2026-04-15 (chore(db): panama 구 INN gemini_seed 10행 삭제 + report_cache 비움)

### Changed
- chore(db): Supabase `panama` — `product_id != MACRO`·`pa_source = 'gemini_seed'`·지정 9종 INN 문자열 일치 10행 DELETE(구 시드). CABAMED 경쟁품 SIMVASTATINA·BECLOMETASONA·CLOPIDOGREL 행은 보존. `panama_backup_session13`·`panama_eml` 미변경.
- chore(db): Supabase `panama_report_cache` — 전량 DELETE(1건)로 보고서 재생성 시 신규 `panama` 기준 캐시 미스 유도.
- Notes(실측): `panama` 총 55→45행. 일부 UUID(Gastiin CR·Atmeg·Gadvoa)는 `panama` 잔존 0행(후속 시드/크롤 필요).

## [Unreleased] - 2026-04-15 (chore(llm): Report1 생성 모델 Haiku 단일화)

### Changed
- chore(llm): `src/llm/report1_generator.ts` — 보고서 생성을 `claude-haiku-4-5-20251001`만 호출(기존 Opus → Sonnet 체인 제거). 캐시·폴백 유지, `GeneratorResult.source`는 `cache` | `haiku` | `fallback`.
- chore(ui): `components/Report1.tsx`, `components/PanamaReportClient.tsx` — 소스 타입 정합; 레거시 API `opus`/`sonnet` 응답은 클라이언트에서 `haiku`로 정규화.
- chore(pdf): `lib/pdf/Report1Document.tsx` — 푸터를 Claude Haiku 명시.

## [Unreleased] - 2026-04-15 09:40 KST (docs: Supabase DB 스냅샷 리포트 — 세션20)

### Added
- docs: `docs/DB_SNAPSHOT_세션20.md` — Supabase `public` 스키마 전 테이블·`panama` 컬럼 스펙·`product_id` 분포·`pa_source` 분포·MACRO UUID(`ba6cf610-…`) 소스별 건수·최근 7일 `crawled_at` 추이·`panama_backup_session13` 전량 덤프·`src/utils/product-dictionary.ts` 전문·핸드오프(세션18/`docs/handoffs`) 존재 여부 기록. 실행은 Supabase MCP `execute_sql`(쿼리 9는 `pa_metric_name` 부재로 `market_segment` 집계로 대체).

## [Unreleased] - 2026-04-15 (chore(ui): 호재 섹션 + 최하단 배지 2개 제거 (랜딩 단순화))

### Changed
- chore(ui): `app/panama/page.tsx` — 「진출 호재 (Regulatory Milestones)」 섹션 전체 및 「한-중미 FTA 0%」「한국 위생선진국 지정 2023.6.28」 배지 제거. 거시 카드 + 진출 적합 분석 + 신약 분석만 유지.
- chore(ui): 과거 인라인 호재 마크업 참고용 `components/panama/RegulatoryMilestones.legacy.tsx` 추가(전체 블록 주석 보관).
- docs(logic): `src/logic/panama_landing.ts` — milestones 조회는 본 모듈에 없음을 명시하는 주석 추가(랜딩 단순화와 정합).

### Notes (실측)
- `npm run build` 통과(2026-04-15).

## [Unreleased] - 2026-04-15 02:35 KST (feat(ui): 파나마 랜딩 SG 레이아웃 반영)

### Changed
- feat(panama-ui): 랜딩 페이지를 SG 스크린샷 구조로 재배치 (`app/panama/page.tsx`) — 상단 헤더/AI 배지, 핑크톤 4카드, 분석 실행 박스, 신약 분석 박스 순서로 정렬.
- feat(panama-ui): 거시카드 4종 DB 실측 조회 로직 추가 (`src/logic/panama_landing.ts`) — GDP/인구/의약품시장규모/실질성장률을 `MACRO_PRODUCT_ID` 기준으로 개별 SELECT, 결측 시 `데이터 준비 중` 반환.
- feat(panama-ui): 품목 선택 UI를 SG 스타일로 변경 (`components/ProductSelector.tsx`) — `▶ 진출 적합 분석` 버튼, Rosumeg 기본 선택, 우선순위( Rosumeg > Sereterol > Omethyl > 나머지 ) 정렬.
- feat(panama-ui): 재사용 컴포넌트 추가 (`components/panama/LandingHeader.tsx`, `MacroCards.tsx`, `NewDrugAnalysis.tsx`) — 신약 분석은 현재 비활성 UI만 제공(추후 백엔드 연동 예정).

### Notes (실측)
- lint: `npm run lint` 통과(경고/오류 0).
- 기존 분석 API(`/api/panama/analyze`), Report1 렌더링, PDF 로직은 미수정.

## [Unreleased] - 2026-04-15 01:45 KST (feat(crawl): 8개 제품 경쟁품 가격 수집 — Gemini 키워드 반영)

### Changed
- feat(product-dict): 경쟁품 키워드 Gemini 교차검증 반영 (`src/utils/product-dictionary.ts` — Hydrine/Ciloduo/Gastiin CR/Rosumeg Combigel/Atmeg/Sereterol Activair/Omethyl Cutielet/Gadvoa Inj. `panama_search_keywords` 확장, Epanova·Ferumoxytol 제외 유지).
- fix(panama): CABAMED·OCDS 경쟁품 파이프라인 재실행 — `acodeco_cabamed_*` 실측 4행 적재, `panamacompra_atc4_competitor` 이번 실행 0행(OCDS 표본·필터 한계로 정직 보고).

### Notes (실측)
- Perplexity: 8제품 INN+파나마 키워드 쿼리로 `fetchPerplexityInsight` 일괄 호출(api_fresh), 캐시 갱신(Hydroxyurea·Atorvastatin+Omega-3 일부 논문 0건).
- 검증 API(`POST /api/panama/analyze`, 포트 3010): Rosumeg·Sereterol `block4_2`에 CABAMED 경쟁가(0.67·10.78 PAB) 문구 확인, Gastiin·Hydrine 등 CABAMED 미매칭 제품은 무가격 문구.

## [Unreleased] - 2026-04-14 (feat(realtime): Top 6 복구 — 환율 + OCDS 실시간 연결)

### Added
- feat(realtime): `src/crawlers/realtime/exchange_rate_exim.ts` — 한국수출입은행 `exchangeJSON(data=AP01)` USD/KRW 조회, 영업일 최대 5일 역추적, DB fallback, `exchange_rate_exim` upsert.
- feat(realtime): `src/crawlers/realtime/panamacompra_recent.ts` — PanamaCompra OCDS 최근 7일 실시간 적재(`panamacompra_recent`), 키워드 제한·키워드별 타임아웃·전체 타임아웃·중복 스킵.
- feat(analyze): `src/logic/panama_analysis.ts` — 분석 시작 시 환율 갱신(블로킹), OCDS 최근 7일 백그라운드(fire-and-forget) 연결.
- feat(insights): Perplexity Sonar Pro 모듈 신규 구현 (`src/logic/perplexity_insights.ts`).
- feat(insights): `panama_perplexity_cache` 7일 TTL 캐시 연동.
- feat(analyze): Perplexity 백그라운드 호출 연결 (보고서 출력 무영향).

### Notes
- 보고서 출력 로직(`report1_schema.ts`, rawDataDigest 빌더)은 미수정.

### Changed
- chore(cleanup): 긴급 중단 정리로 임시 테스트 산출물(`r_*.json`, `scripts/test_*.ts`) 제거 및 구조 개선 변경만 부분 커밋 준비.
- feat(product-dict): 8개 제품 정보를 실제 유나이티드 포트폴리오로 전면 교체(UUID 유지, 조합제 보조 ATC4/타깃 플래그 포함).
- feat(crawler): CABAMED 매칭 토큰 및 ATC4 매핑을 신규 포트폴리오 기준으로 재정렬(`cabamed_match`, `pa_acodeco_cabamed`, `pa_panamacompra_atc4`).
- chore(db): `panama` 경쟁품·prevalence·Perplexity 캐시 정리 쿼리 실행(실측 삭제 0건).
- fix(crawl): `pa_panamacompra_atc4`에 페이지별 timeout(30s) + retry(backoff) + 연속 timeout 스킵 + 전체 10분 제한 + 키워드별 fetch 통계 추가(장시간 hang 방지).
- fix(crawl): `cabamed_match` self 판정을 엄격화(브랜드/자사 INN 중심)하고 ATC4 기반 competitor 토큰 생성을 분리해 `acodeco_cabamed_competitor` 적재 복구.
- chore(gitignore): `r_*.json`, `test_report*.pdf` 무시 규칙 추가 및 기존 `r_*.json` 정리.
- fix(realtime): 환율 크롤러 환경변수 `KOREAEXIM_API_KEY` → `EXIM_API_KEY` 통일.
- chore(perplexity): Perplexity 모델 sonar-pro → sonar 다운그레이드 (비용 최적화)
- docs(handoff): 세션 19 핸드오프 실측 기반 전면 재작성 (유령 구현 복구 내역 반영)
- fix(pdf): Pretendard 한글 폰트 실제 적용 (깨짐 수정)
- feat(pdf): A4 2페이지 완전 분리 (파선 구분 → Page 태그 2개)
- feat(pdf): Perplexity 논문 섹션 2페이지 최하단 고정
- feat(report): 섹션 3 "사실 + ※ 인사이트" 2줄 구조로 재설계
- feat(analyze): 실거래 통계(panamacompra_atc4 + cabamed) 프롬프트 주입 강화
- fix(analyze): 0건 INN 처리 로직 추가 (유보 표현 금지)
- feat(product-dict): 8개 INN에 atc4_code 필드 추가 (M01AB, A02BC 등)
- feat(market_stats): getPanamacompraStats 유니크 낙찰 기준 중복 제거 로직 추가
- feat(report): 섹션 3 본문에 선택 INN/ATC4 동적 주입 (환각 방지)
- fix(report): judgment.reasoning 유보 표현 정리 (0건 → 데이터 없음)

### Fixed
- fix(realtime): PanamaCompra OCDS 서버 SSL 인증서 만료 대응 — `undici` Agent(`rejectUnauthorized: false`) 적용 (`panamacompra_recent.ts`).
- fix(preload): `pa_panamacompra.ts`, `pa_panamacompra_atc4.ts` 동일 SSL 우회 패치 적용.

## [Unreleased] - 2026-04-14 (feat(freshness): AI 게이트 백그라운드 점검 — DB 기록만)

### Added
- feat(db): Supabase `panama` — `pa_freshness_status`(TEXT), `pa_freshness_checked_at`(TIMESTAMPTZ), 인덱스·COMMENT (마이그레이션명 `add_panama_freshness_status_columns`, MCP `apply_migration`).
- feat(analysis): `src/logic/freshness_background.ts` — 분석 직후 `runFreshnessCheckInBackground`가 `batchCheckFreshness` 후 행별 UPDATE (응답 비블로킹).
- feat(perf): 1시간 내 재판정 skip, `immutable` 카테고리는 1회 판정 후 영구 skip.

### Notes
- `report1_digest`·`report1_schema`·rawDataDigest 빌더 미변경 — 보고서 출력 동일.

## [Unreleased] - 2026-04-14 (feat(freshness): panama 신선도 2컬럼 + 레지스트리 + 마이그레이션)

### Added
- feat(freshness): Supabase `panama` — `pa_refresh_cycle`(TEXT), `pa_item_collected_at`(TIMESTAMPTZ), 인덱스·COMMENT (마이그레이션명 `add_panama_freshness_columns`, MCP `apply_migration` 적용).
- feat(freshness): `src/types/freshness.ts` — `RefreshCycle` 유니온.
- feat(freshness): `src/constants/freshness_registry.ts` — `FRESHNESS_REGISTRY`(17+2종)·`getFreshnessMetadata`.
- feat(freshness): `src/utils/panama_freshness_attach.ts` — INSERT 직전 `pa_refresh_cycle`·`pa_item_collected_at`·폴백 시 `pa_notes.item_collected_at_fallback`.
- feat(freshness): `src/logic/freshness_rules.ts` — digest용 규칙 기반 신선도 상태.
- feat(freshness): `src/logic/freshness_checker.ts` — `FreshnessInput`에 `itemCollectedAt`·`refreshCycle`, 시스템 프롬프트에 주기별 허용 기준 블록.
- feat(llm): `src/logic/report1_digest.ts` — `rawDataDigest` 줄에 `[L1|L2|L3][fresh|stale_*]` 접두.
- feat(llm): `src/llm/report1_schema.ts` — `REPORT1_SYSTEM_PROMPT`에 rawDataDigest 신선도 접두 설명.
- chore(migration): `scripts/migrate_freshness_columns.ts` — 기존 행 일괄 UPDATE (실행 결과 `updatedRows`: 74).

### Changed
- feat(db): `src/utils/db_connector.ts` — `insertRow`가 `applyPanamaFreshnessToInsertRow` 경유; `PanamaPhase1InsertRow`에 `pa_refresh_cycle`·`pa_item_collected_at` 선택 필드.
- feat(seed): `src/seed_loaders/load_market_intel.ts` — bulk insert 전 행별 신선도 보강.
- fix(build): Next 번들 해석 호환 — 신선도 관련 모듈 import를 확장자 없음 형태로 정리 (`panama_freshness_attach` 체인).

## [Unreleased] - 2026-04-14 (ops+fix: Top 9 OCDS ATC4 실행 — lookback·전용 페이징)

### Added
- feat(logic): `src/logic/freshness_checker.ts` — Top 7 Haiku(`claude-haiku-4-5-20251001`) 신선도 `checkFreshness`·`batchCheckFreshness`(호출부 미연동).
- feat(crawler): `pa_acodeco_fetch.ts`·`pa_acodeco_cabamed.ts`·`cabamed_match.ts` — CABAMED XLSX 다운로드·파싱·`acodeco_cabamed_*` 적재, `acodeco_monthly.yml` fetch→load 복구.
- chore(ci): `.github/workflows/acodeco_monthly.yml` — CABAMED XLSX 월간 fetch·Supabase 적재·시드 커밋(cron `0 3 1 * *`, `permissions: contents: write`).
- docs(handoff): `docs/handoffs/핸드오프_세션_19.md` — 세션 19 맥락 통합 박제(0~7섹션, 데이터 레이어·CABAMED·Top9·코드 경로·폐기 채널).
- docs(freshness): `docs/freshness_analysis/pa_source_inventory.md` — Supabase `panama`의 `pa_source` 17종·건수·대표 샘플·`pa_notes` JSON/평문 구분·Gemini 갱신주기 검증용 표.
- chore(db): Supabase 마이그레이션 `create_panama_perplexity_cache` — `panama_perplexity_cache`(INN별 `papers` JSONB, `expires_at`, `idx_perplexity_cache_expires`) Top 7.5 Perplexity 캐시용.

### Changed / Fixed
- fix(ci): `acodeco_monthly.yml` — `pa_acodeco_fetch` → `pa_acodeco_cabamed` 이단 실행 복구; `pa_acodeco.ts`는 HTML 크롤 클래스 전용·CLI 제거.
- fix(crawler): `src/crawlers/preload/pa_panamacompra_atc4.ts` — `pa_panamacompra.ts` 미수정, ATC4 전용 OCDS 페이징·기본 lookback 900일·release/award 최신일 필터. 선택 env: `PANAMACOMPRA_ATC4_LOOKBACK_DAYS`, `PANAMACOMPRA_ATC4_RULE_OFFSET`, `PANAMACOMPRA_ATC4_MAX_RULES`, `PANAMACOMPRA_ATC4_MAX_KEYWORDS_PER_RULE`.
- feat(llm): `src/llm/report1_schema.ts` — 블록4-2 OCDS·CABAMED 분리, 0건 ATC4는 낙찰가 수치 인용 금지.

### Verification
- 실제 적재: inserted=8, skippedDuplicate=2, matchedCandidates=10, 약 48분, MAX 250 미도달.

## [Unreleased] - 2026-04-13 (feat(crawler): Arrocha v2 + DNFD — 세션17)

### Added
- feat(crawler): `pa_arrocha_v2` 신규 (Shopify Search `suggest.json` + `products/{handle}.json`, 세션16 후퇴 결정 번복) — `pa_source: arrocha_shopify_api`, `market_segment: private_retail`, 8 INN 경쟁사 가격·`pa_notes`에 단위 단가·총액·제형 메타. `npm run preload:arrocha-v2` (LLM 미사용, `MAX_LLM_CALLS_PER_RUN=0` 동일). 선택 env: `ARROCHA_SESSION_COOKIE`.
- feat(crawler): `pa_dnfd_consulta` 신규 (Playwright, `tramites-minsa.panamadigital.gob.pa`) — `pa_source: dnfd_consulta`, CAPTCHA 시 `MANUAL_INTERVENTION_REQUIRED`. `npm run preload:dnfd` (절차 JSON + 조회 일괄).
- feat(seed): `src/seed_data/round6_dnfd_procedure.json` + `load_dnfd_procedure.ts` — `pa_source: dnfd_procedure_meta`, `product_id: MACRO_PRODUCT_ID`, WLA 5단계 메타.
- feat(llm): `src/llm/system_context_panama.ts` — `PANAMA_DOMAIN_CONTEXT` (PAB=USD, 제형·티어·WLA).
- chore(ddl): `scripts/ddl/panama_alter_session17_market_segments.sql` — `market_segment`에 `private_retail`, `regulatory` CHECK 추가 (Supabase 수동 실행).
- chore(db): `db_connector` `MarketSegment`에 `private_retail`·`regulatory` 반영.

### Notes
- 사전 검증: `search/suggest.json` 은 **200·JSON**이나 `products[]`가 **빈 배열**일 수 있음(스토어 잠금·지역). 실측 INSERT는 0건일 수 있음 — `ARROCHA_SESSION_COOKIE` 또는 파나마 IP에서 재시도 권장.

## [Unreleased] - 2026-04-13 (feat(ux): 파나마 보고서 라우트 분리)

### Changed
- feat(ux): 분석 페이지 분리 (`/panama` → `/panama/report?inn=`)
- feat(ux): 단순 로딩 스피너 (20개국 공통 UX, `PanamaReportClient`)
- feat(ui): INN 탭·품목 선택 → `/panama/report?inn=` 직접 이동; `/panama`는 국가 개요만

## [Unreleased] - 2026-04-11 (fix(report): 세션16 마무리 — block3 항목별 maxLength + Aceclofenac scope footer)

### Fixed
- fix(report): `REPORT1_TOOL`·`parseReport1Payload` — `block3_reasoning` 5줄을 항목별 min/max로 검증(1번 최대 200자·5번 최대 250자·2~4번 100자). `block3_latam_scope_footnote` 선택 필드(빈 문자열 → null 정규화).
- fix(report): `report1_fallback_template` — `fitBlock3Line` 줄 인덱스별 상한(`BLOCK3_LINE_MAX`), Aceclofenac+`latam_average` 시 1번 본문에서 trailing `(…scope=latam_average…)` 제거·고정 각주(`report1_block3_utils.splitAceclofenacPrevalenceForBlock3`).
- fix(report): `buildUserPrompt` — 줄별 차등 길이·Aceclofenac 각주 지시 보강.
- ui(report): `Report1.tsx`·`Report1Document.tsx`·`pdf-styles` — 판정 근거 표 하단에 scope 각주(있을 때만) 표시.
- docs: `REPORT1_SPEC.md` 블록3 — 5줄·항목별 길이·Aceclofenac 각주 명세 갱신.

### Notes
- 세션 16 보고서 관련 버그 해소 완료(명세-구현 정합). Vercel·캐시 무효화는 사용자 측 진행.

## [Unreleased] - 2026-04-11 (feat(seed+report): 세션16 prevalence 8 INN 전체 seed + 조회 로직 완전 수정)

### Added
- feat(seed): `data/seed/panama/round4_prevalence.json` — `entries`(8 INN) + `macro_healthcare_infra`(1행), Gemini 수집 지표·출처 URL·`scope`(panama|latam_average) 반영.
- feat(seed): `src/logic/prevalence_seed_build.ts` — 시드 파싱·`pa_notes` 문자열 생성 공용.
- chore(scripts): `npm run seed:prevalence` — 기존 `gemini_seed`/`gemini_prevalence` prevalence 시드 행 삭제 후 `gemini_prevalence`로 9행 재적재(`scripts/runners/reseed_prevalence.ts`).

### Changed
- feat(seed): `load_prevalence.ts` — `pa_source: gemini_prevalence`, `pa_notes`에 지표·출처·연도·scope, `pa_source_url`·`pa_collected_at`(관측 연도 문자열) 매핑. `panama.pa_raw_data` 컬럼은 DDL 미존재로 미사용.
- fix(report): `resolvePrevalenceMetric` — 시드 파일 폴백 제거, `product_id` 일치 행만·키워드(유병률·발병률·감염률·prevalence·incidencia 등) 매칭, 없으면 빈 문자열.
- fix(report): `GeneratorInput.prevalenceMetric`·폴백·PDF 요청을 `string`으로 통일; 비어 있으면 판정근거 1번에서 거시만 1회 서술.
- docs(prompt): `REPORT1_SYSTEM_PROMPT` — prevalence 부재 시 질환 수치 미인용·타 INN 혼입 금지.

## [Unreleased] - 2026-04-11 (fix(report): 세션16 후속 — prevalence 8 INN 전역 + 버그 ① 완전 수정)

### Fixed
- fix(report): `extractPrevalenceMetric`가 `prevalence:` 단일 키워드만 인식해 DB 행 미매칭 시 null이 되던 문제 — 동일 `product_id`에 대해 GLOBOCAN·incidencia·epidemiolog 등 확장 매칭 후, 여전히 없으면 `round4_prevalence.json`과 동일 문자열 시드 폴백(`src/logic/prevalence_resolve.ts`, `report1_digest.ts`).
- fix(report): 폴백 템플릿 판정근거 1번에서 보건지출·CSS를 `prevLine`에 한 번 더 넣어 중복되던 문제 — 거시 한 줄 + `표적 역학` 절만 분리(`report1_fallback_template.ts`).

### Added
- chore(scripts): `npm run simulate:prevalence` — 8 INN에 대해 DB 행 없을 때 시드 폴백 결과 표 형식 출력(`scripts/simulate_prevalence_8inn.ts`).

## [Unreleased] - 2026-04-11 (fix(report): 세션16 데이터 매핑 버그 4종)

### Fixed
- fix(report): 역학 prevalence INN 교차오염 — `extractPrevalenceMetric`이 `product_id` 미필터로 첫 `prevalence:` 행만 쓰던 문제를 해당 품목 행만 순회하도록 수정 (`src/logic/report1_digest.ts`).
- fix(report): 유통 파트너 상호 반복 — `dedupeDistributorNames` + 시스템 프롬프트에 상호 1회 서술 규칙 (`report1_digest.ts`, `report1_schema.ts`).
- fix(report): PAHO Strategic Fund 권역 참조 단가 누락 — `getPahoRegionalReferenceLine`(Hydroxyurea 등)을 digest·`GeneratorInput`·폴백 가격 블록·PDF 라우트에 반영 (`paho_reference_prices.ts`, `analyze/route.ts`, `pdf/route.ts`, `report1_generator.ts`, `report1_fallback_template.ts`).
- fix(report): 보건지출 시드/문구 — `$1,547` → `$1,557.81`(World Bank/WHO GHED 2023) 정합 (`round4_prevalence.json` MACRO metric, `case_judgment.ts`, 폴백 템플릿, `REPORT1_SPEC.md` 예시).

## [Unreleased] - 2026-04-13 (ui — 랜딩 `/panama` + Report1 A4 문서형)

### Changed
- ui(nav): `/` → `/panama` 복구 — 첫 화면은 국가 요약·품목 토글, A4형 보고서는 토글 후 「분석 (A4 보고서)」로만 진입 (`app/page.tsx`, `ProductSelector.tsx`, `app/panama/page.tsx`)
- ui(report): `Report1`을 세로 ①②③ 나열형에서 **A4 문서형(회사 헤더·메타 배너·표 중심)** 으로 재구성 — `CaseBadge` 제거, 출처 표 `gemini_seed` → 「1차 시드」 라벨 (`Report1.tsx`, `SourceTable.tsx`)
- ui(report): 보고서 화면 상단에 「← 파나마 국가 개요」 링크 (`PanamaReportClient.tsx`)

## [Unreleased] - 2026-04-13 (feat — 세션16 PanamaCompra OCDS)

### Added
- feat(crawler): PanamaCompra OCDS — `awards[].items[]` 단위 행, `item.totalValue` 우선·`award.value` 폴백, `pa_currency_unit` PAB/USD 반영, UNSPSC 필터 제거로 키워드 검색 노출 확대, 페이징 조기종료 완화(`MAX_PAGES_WHEN_ZERO_MATCH` 3→8 등), 검색어에 `who_inn_en` 병행, `findProductByPanamaText`에 WHO INN(영문) 보조 매칭 (`product-dictionary.ts`, `pa_panamacompra.ts`)
- chore(scripts): `npm run preload:panamacompra` — `scripts/runners/preload_panamacompra.ts`

### Notes
- 실측: 공개 `releases` 대량 샘플에서 자사 8품목 INN/키워드가 품목 텍스트에 **등장하지 않아** 첫 실적재는 **0건**일 수 있음(코드 경로 검증은 완료). 필요 시 페이징 상한 추가 상향 또는 별도 검색 API 조사.

## [Unreleased] - 2026-04-12 / 세션13 / fix(panama): 성장률 카드 팩트체크 완료

### Changed
- fix(panama): 성장률 카드 팩트체크 완료. KOTRA 10%는 보건의료 전체 scope(의료기기 포함)로 확인되어 제거. Perplexity 제시 KOTRA CAGR 5% 주장은 PDF 원문 검증 실패로 채택 불가. IQVIA Sandoz 2024 YoY 3.4% 단일 표기 + scope 명시 footer 추가 (`macro_display.ts`, `app/panama/page.tsx` 스코프 줄 스타일).

## [Unreleased] - 2026-04-12 (ui — 거시 카드 타이포·footer)

### Changed
- ui(panama): 거시 4카드 — 상단은 수치만(`text-2xl`), 연도·출처는 footer(`·` 구분). 성장률은 IQVIA 출처 + 스코프 보조 줄 (`macro_display.ts`, `fetch_panama_data.ts`, `app/panama/page.tsx`)

## [Unreleased] - 2026-04-12 (fix — 거시 보건·성장률 카드 표시)

### Fixed
- fix(macro): Supabase `pa_price_local` DECIMAL가 문자열로 역직렬화될 때 `pharmaGrowthDisplayFromRows`가 건너뛰던 문제 — `coerceFiniteNumber` 적용, `pa_notes`에서 YoY 보조 파싱(`parsePharmaYoYPercentFromNotes`).
- fix(macro): `worldbank_who_ghed` 보건 — `pa_notes` 파싱 실패 시 `pa_price_local`(시드 `health_expenditure_per_capita_usd` 매핑) 폴백, `load_macro.ts`에서 보건 USD를 `pa_price_local`에 적재.
- fix(analysis): `toPriceRows`가 `coerceFiniteNumber`로 `PriceRow` 숫자 타입 유지.

## [Unreleased] - 2026-04-12 (fix — 거시 시드 pa_released_at)

### Fixed
- fix(seed): `round1_macro.json` 거시 4 site에 `pa_released_at` 추가, `load_macro.ts`에서 `panama.pa_released_at` 매핑

## [Unreleased] - 2026-04-12 (feat — 세션13 거시 4종 + 규제 마일스톤)

### Added
- feat(panama): World Bank 2024 GDP·인구 확정치 및 2023 보건지출 반영. IQVIA 2024 제약시장 YoY 3.4% + KOTRA 거시 10% 병기(국가 페이지 footer). `worldbank`·`worldbank_who_ghed`·`iqvia_sandoz_2024` 시드 행 분리 (`data/seed/panama/round1_macro.json`).
- feat(panama): `regulatory_milestone` 2건 시드 (`src/seed_loaders/load_regulatory_milestones.ts`)·국가 페이지 「진출 호재」 카드. DDL `scripts/ddl/panama_alter_session13_macro_milestone.sql` — CHECK `panama_market_segment_check`에 `default`·`regulatory_milestone` 반영 (실행 전 `SELECT DISTINCT market_segment FROM panama` 권장).

### Changed
- chore(seed): `npm run seed:panama`에 규제 마일스톤 단계 추가. `market_segment` 타입에 `regulatory_milestone` 허용 (`db_connector.ts`).

## [Unreleased] - 2026-04-12 (chore — 핸드오프 Git 제외)

### Changed
- chore(git): `핸드오프*.md`·`docs/handoffs/` 를 `.gitignore`에 추가하고, 기존 추적 파일은 `git rm --cached`로 인덱스에서만 제거(로컬 파일 유지)

## [Unreleased] - 2026-04-12 (fix — 거시 카드 인구·보건 라벨)

### Fixed
- fix(macro): `parsePopulation` 정규식이 `Most recent value. (2024)` 형태(마침표) 미매칭 → 인구가 항상 「데이터 수집 중」이던 문제 수정 (`lib/parse_macro_notes.ts`, `fetch_panama_data.ts` 연도·만명 표기)
- fix(ui): 파나마 국가 개요 보건 카드 라벨을 「1인당 보건지출 (연간)」으로 통일 (`app/panama/page.tsx`)

## [Unreleased] - 2026-04-12 (docs — session12 박제)

### Notes
- docs(session12): `ARCHITECTURE.md`·`TECHNIQUES_STATUS.md` 세션 12 박제, `핸드오프_세션12.md` 추가, PDF Phase 2 이월 정리

## [Unreleased] - 2026-04-11 (feat — beta: PDF Phase 2 이월)

### Added
- feat(beta): PDF Phase 2 이월, 웹 보고서 베타 배포. react-pdf v4.4.1 한글 폰트 호환 이슈 다음 세션 처리

### Changed
- feat(ui): `PdfDownloadButton` 비활성화 — 라벨 "PDF 다운로드 (Phase 2)", `handleDownload` 주석 보존
- chore(pdf): `lib/pdf/pdf-fonts.ts` — 진단 로그·`Font.register` 유지, Vercel 빌드 우선으로 예외 시 `try/catch`로 모듈 로드 지속
- chore(log): `src/logic/competitor_prices.ts` — 디버깅 `console.log` 제거(세션 12), 주석만 유지

## [Unreleased] - 2026-04-11 (research — @fontsource/nanum-gothic TTF 없음)

### Notes
- research(pdf): `node_modules/@fontsource/nanum-gothic/files/` 조사 — **`.ttf` 0개**, **`.woff` 279개**, **`.woff2` 279개**. `nanum-gothic-korean-*-normal.ttf` 경로로의 즉시 전환 **불가**(패키지에 미포함). 한국어 서브셋은 `korean-400.css` / `korean-700.css` 기준 `nanum-gothic-korean-400-normal.woff` · `nanum-gothic-korean-700-normal.woff` 등.

## [Unreleased] - 2026-04-11 (feat — W5 PDF 엔진⑦ + 웹 LLM 통합)

### Added
- feat(pdf): W5 엔진⑦ PDF 1페이지 생성 (호주 양식 + Pretendard + LLM payload)
- feat(report1): 웹 뷰와 PDF가 동일 LLM payload 공유 (Tool Use 강제 양식)

### Changed
- `app/api/panama/analyze`에 `generateReport1`·`rawDataDigest`·`llm` 응답, `panama_analysis`에 조달·소매 건수 필드 추가, `report1_generator` 로컬 import를 Next 번들 호환 형태로 정리

## [Unreleased] - 2026-04-11 (feat — W5 LLM 보고서)

### Added
- feat(llm): W5 보고서 생성 모듈 — Opus 4.6 → Sonnet 4.6 → 폴백 템플릿 3단 체인
- feat(llm): Tool Use JSON Schema 강제 + 시스템 프롬프트 양식 박제
- feat(db): panama_report_cache 캐시 테이블 추가 (24h TTL)

## [Unreleased] - 2026-04-11 (seed — Round4 prevalence + 거시 인프라)

### Added
- feat(seed): Round4 prevalence 데이터 8 INN 적재 (GLOBOCAN/PAHO/MINSA/WHO)
- feat(seed): Round4 파나마 의료 인프라 거시 행 1건 추가 (인구·보건지출·CSS)

## [Unreleased] - 2026-04-12 (fix — Report1 블록 5-3 · 거시 카드)

### Fixed
- fix(report1): 블록 5-3 freshness 표기 해법 C로 교체 (절대원칙 12)
- fix(macro-card): worldbank pa_notes에서 GDP/인구 정규식 파싱 추가 (이슈1)

## [Unreleased] - 2026-04-12 (문서 — freshness 2gate 안착)

### Notes
- 2026-04-12: docs/research/freshness_2gate_architecture.md 안착 (세션 8 박제 누락분 복구)

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
