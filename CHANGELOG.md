# Vibe Coding Log

## [Unreleased] - 2026-04-19 (data(phase3): 세션 28 2차 배치 11~15사 append)

### Added
- `data/phase3/partner_factsheets.md` — 3-11 Sanofi(PSI 55.4) ~ 3-15 Sequisa(PSI 36.6) 팩트시트 append, 하단 예정 문구 16~20번으로 갱신.
- `data/phase3/partner_psi_matrix.csv` — 5사×8제품 40행 append(데이터 행 총 120 + 헤더 1).
- `data/phase3/partner_psi_ranking.md` — 15사 확장 순위(10= 동점)·2차 배치 발견 블록 append(글로벌 5위 제약사 문구 인용 유지).
- `data/phase3/partner_candidate_pool.md` — Sanofi·MSD·Bagó·PISA·Sequisa 5개 `- [x]` 및 2차 배치 PSI 부기.

### Notes
- Bagó Rosumeg·Atmeg upgrade 인사이트, PISA 14-16 플랜트, MSD Keytruda 수치, Sanofi Plavix €230M 등 지시서 수치·문구 원문 유지.

## [Unreleased] - 2026-04-19 (data(phase3): 세션 28 1차 배치 6~10사 append)

### Added
- `data/phase3/partner_factsheets.md` — 세션 28 블록: 3-6 Roche(PSI 63.8) ~ 3-10 Novartis Logistics(PSI 56.1) 팩트시트 append, 하단 예정 문구 11~20번으로 갱신.
- `data/phase3/partner_psi_matrix.csv` — 5사×8제품 40행 append(총 데이터 80행 + 헤더 1행).
- `data/phase3/partner_psi_ranking.md` — 10사 확장 순위표 + PSI 로직 설계 철학(글로벌 5위 제약사 문구 박제) append.
- `data/phase3/partner_candidate_pool.md` — Roche·GSK·Novartis·Pfizer Free Zone·BAYER 5개 `- [x]` 및 PSI 부기, 제 추천 Roche 줄 동기화.

### Notes
- Sereterol(GSK)·Gadvoa(Bayer) direct_competition 인사이트 및 순위표 인용 문구는 지시서 원문 유지.

## [Unreleased] - 2026-04-19 12:15:00 (docs(phase3): 세션 27 매칭 데이터 data/phase3 분리)

### Added
- `data/phase3/partner_factsheets.md` — 핸드오프 세션 27 섹션 3(1~5사 팩트시트 전문) 이관, 세션 28 6~20사 append 예정 메모.
- `data/phase3/partner_psi_matrix.csv` — 섹션 4 CSV 40행(헤더+데이터), UTF-8 BOM 없음, DB INSERT 복붙용.
- `data/phase3/partner_psi_ranking.md` — 섹션 5 PSI 순위표·스펙트럼 문구 이관.
- `data/phase3/partner_candidate_pool.md` — 섹션 7 후보 풀(7-1~7-4 + 6번째 추천), 기업별 `- [ ]` 체크박스로 진행 추적 가능.

### Notes
- `핸드오프27_3공정로직_.md` 원본은 수정하지 않음(이력 보존). 원본에 “data 이관됨” 한 줄 메모는 달강 확인 후 선택 작업.

## [Session 27 - Phase 3 기초 공사 + 경쟁/기회 플래그]

### Added
- 신규: `scripts/ddl/panama_partner_psi_precomputed.sql` — 테이블 DDL (`conflict_level` / `conflict_insight` 포함), Supabase에서 수동 실행 예정.
- 신규: `src/logic/phase3/types.ts`, `tier_quantizer.ts`, `psi_calculator.ts`, `default_psi_compute.ts`, `conflict_detector.ts` — PSI 가중치·동적 재정렬·경쟁/기회 이원 플래그(3단계 트리).
- 신규: `scripts/runners/compute_partner_psi.ts` — 사전 계산 스크립트 뼈대(CSV 파싱 TODO).
- 신규: `app/api/panama/phase3/analyze/route.ts` — `product_id`별 Top 20 PSI 행 + `panama_partner_candidates` 조인, `maxDuration=15`.
- 변경: `components/main-preview/Phase3Section.tsx` — 세션 `reports` 기반 1공정 보고서 선택, 체크박스 동적 PSI Top10, 경쟁/기회 블록; `MainPreviewSections`에 `reports` 전달.

### Notes
- 핵심: 경쟁사를 `upgrade_opportunity`로 태깅하는 로직(`conflict_detector`).
- 미완: 수기 매칭 CSV 파싱·실제 INSERT, LLM 평판(세션 28), Phase3 PDF(세션 28).

## [Unreleased] - 2026-04-19 (docs: 파트너 도시어 템플릿)

### Added
- docs: `docs/partner_dossier_template.md` — DNB/Pharmchoices 기업별 서술형 평가(매출 Tier, 제조소, 수입, 약국체인, 8제품 매칭) 복사용 템플릿.

## [Unreleased] - 2026-04-19 02:00:00 (refactor(phase1): 품목 드롭다운 라벨 최종 포맷)

### Changed
- refactor(phase1-labels): `src/utils/product_option_labels.ts` — `ProductOptionMeta`(therapeutic_group, 선택 drug_type, inn_display, dosage_form, strength_display)로 8개 제품 고정. `[제품군 · 유형] 브랜드 (INN, 제형, 함량)` 형식으로 통일.

## [Unreleased] - 2026-04-19 01:10:00 (style(ui): 매크로 카드 세로 높이 추가 축소)

### Changed
- style(macro-cards): `components/main-preview/MacroCards.tsx` — `min-h` 제거, 카드·그리드 패딩·본문/출처 글자 크기 축소로 상단 4지표 카드 세로 길이 추가 단축.

## [Unreleased] - 2026-04-19 00:40:00 (세션26: 1·2공정 UI·문구 — 품목 라벨·Logic A/B 제거·가격 책정 명칭)

### Changed
- feat(phase1-ui): `src/utils/product_option_labels.ts` — 품목 드롭다운을 `[품목군 · 개량신약|일반제] 브랜드 (INN·제형·함량)` 형식으로 표시, 복합제는 성분별 함량을 `+`로 연결. `MacroCards` 카드 `min-h`/패딩 축소로 상단 4지표 세로 높이 완화.
- refactor(phase2-copy): Logic A/B 표기를 공공조달·민간소매 용어로 통일(`Phase2Section`·`Phase2ResultTabs`·`Phase2Document`·`phase2/analyze`·`calculate`·폴백 템플릿).
- feat(phase2-download): 다운로드 버튼·PDF 파일명(`UPharma_Panama_PriceStrategy_…`)·2공정 섹션 제목을 「가격 책정 전략」으로 정렬.

## [Unreleased] - 2026-04-18 23:55:00 (fix(phase2): 보고서 드롭다운 세션 전용·라벨·동기화·product_not_found)

### Changed
- fix(phase2-dropdown): `Phase2Section` 드롭다운을 `/api/panama/phase2/report`(panama_report_cache) 대신 `sessionStorage`의 `getStoredReports()`만 사용. 시크릿 창에서 이전 세션 UUID 목록이 보이던 문제 수정.
- feat(phase2-label): `StoredReportItem`에 `productBrandName`·`analyzedAt` 저장, 드롭다운 라벨을 `1공정 보고서 · 브랜드 · YYYY-MM-DD HH:mm` 형식으로 표시. `Phase1Section`/`PanamaReportClient`의 `upsertStoredReport`에 동일 필드 반영.
- feat(phase2-sync): `MainPreviewSections`에서 `reports` state를 끌어올리고 `Phase1Section` `onReportGenerated`로 1공정 완료 시 목록 갱신, `Phase2Section`은 `reports` props만 사용.
- fix(phase2-product): `removeStoredReport` 추가, `/api/panama/phase2/analyze`에서 `products` 조회 후 폴백 `findProductById`, 미존재 시 `error: product_not_found` JSON. 클라이언트에서 404 시 세션 항목 제거·에러 문구 표시.

## [Unreleased] - 2026-04-18 22:30:00 (feat(phase2): 수출가격 전략 UI·API·PDF 대개편)

### Added
- feat(phase2-api): `app/api/panama/phase2/analyze/route.ts` — `fetchCompetitorPrices`(공공 `panamacompra_v3`, 민간 `acodeco_cabamed%`), `generatePriceScenarios`, `generatePhase2Report`(Haiku), `Phase2Document` PDF 렌더 후 `pdfBase64`/`pdfFilename`/`competitorPrices` 응답.
- feat(pdf-phase2): `lib/pdf/Phase2Document.tsx` — NotoSansKR, 단일 `Page`, 원가격·경쟁사 표·공식·3시나리오.
- feat(phase2-logic): `src/logic/phase2/competitor_prices.ts` — 경쟁사 가격 집계 순수 로직.

### Changed
- feat(phase2-ui): `components/main-preview/Phase2Section.tsx` — 분석 전 단계 UI·다운로드 숨김, 3s/6s 타이머 후 `/api/panama/phase2/analyze` 호출, 완료 후 Blob PDF 다운로드, 경쟁사 가격 테이블 표시.
- feat(phase2-prompt): `src/llm/phase2/phase2_system_context.ts` — USD 기준·block2 서술·Case 포지셔닝 규칙 보강.

## [Unreleased] - 2026-04-18 21:25:00 (fix(ui): 매크로 카드 값 중앙·출처 우하단·GDP 한 줄)

### Changed
- fix(macro-cards): `components/main-preview/MacroCards.tsx`에서 지표 값을 카드 가운데 정렬, 본문 굵기를 `font-semibold` 수준으로 완화, 출처를 우측 하단 정렬. GDP 카드는 `whitespace-nowrap`과 `clamp` 폰트로 한 줄 표기.
- chore(landing): `src/logic/panama_landing.ts`의 GDP 표기 문자열을 `$19,445` 형태로 정리.

## [Unreleased] - 2026-04-18 21:10:00 (fix(pdf): V3 레이아웃 단일 Page 연속 흐름)

### Changed
- fix(pdf-v3-layout): `lib/pdf/Report1DocumentV3.tsx`에서 `<Page>`를 3개에서 1개로 통합하고, 블록 ①~④를 `sectionBlock`/`sectionBlockFirst`로 감싸 `marginTop`만으로 구분해 공백 페이지·강제 분리를 제거.

## [Unreleased] - 2026-04-18 20:45:30 (fix(phase1): 4단계 진행 간격을 API 소요 시간에 맞춤)

### Fixed
- fix(phase1-ui): `components/main-preview/Phase1Section.tsx`에서 진행 표시용 `setInterval`을 900ms에서 15000ms로 변경해 약 60~70초 분석을 단계당 약 15초로 시각적으로 분할.

## [Unreleased] - 2026-04-18 20:45:06 (fix(pdf): V3 PDF 폰트를 NotoSansKR로 통일)

### Fixed
- fix(pdf-v3): `lib/pdf/Report1DocumentV3.tsx`의 페이지 기본 `fontFamily`를 V1(`pdf-styles`)과 동일한 `NotoSansKR`로 변경해 Vercel 등 환경에서 Pretendard 로드 실패 시 한글 깨짐을 방지.

## [Unreleased] - 2026-04-18 19:47:46 (fix(pdf): V1 payload 타입 캐스팅으로 V3 유니온 빌드 오류 수정)

### Fixed
- fix(type): `app/api/panama/pdf/route.ts`에서 `llmResult.payload` 유니온(`Report1Payload | Report1PayloadV3`)을 V1 PDF props에 주입할 때 `Report1Payload`로 명시 캐스팅해 Next 빌드 타입 오류를 해결.

## [Unreleased] - 2026-04-18 19:45:45 (feat(reports): sessionStorage 이주 + DB bootstrap 비활성화)

### Changed
- feat(reports-storage): `src/lib/dashboard/reports_store.ts` 저장 키를 `pa_upharma_reports_v2`로 변경하고 저장소를 `localStorage`에서 `sessionStorage`로 이주.
- feat(reports-cleanup): `purgeLegacyStoredReports()`를 추가해 레거시 `pa_upharma_reports_v1` 키를 마운트 시 정리.
- feat(reports-policy): `components/dashboard/reports/GeneratedReportsList.tsx`에서 `storage` 이벤트 의존을 제거하고 `focus` 기반 동기화만 유지(동일 탭 세션 정책).
- feat(reports-bootstrap): 과거 DB 레코드를 클라이언트로 다시 밀어넣던 `/api/panama/phase2/report` bootstrap 로직을 주석 처리로 비활성화.

## [Unreleased] - 2026-04-18 19:44:19 (feat(phase1): 탭 전환 시 step/ready 상태 sessionStorage 유지)

### Changed
- feat(phase1-state): `components/main-preview/Phase1Section.tsx`에서 `step`, `readyProductId`, `pdfFilename` 초기값을 sessionStorage 기반으로 복원.
- feat(phase1-pdf-restore): 마운트 시 `pdfBase64`를 Blob URL로 재생성해 탭 전환 후에도 즉시 PDF 미리보기/다운로드가 가능하도록 개선.
- feat(phase1-storage-sync): 분석 시작/성공/실패 흐름에서 `PDF_BASE64_KEY`, `PDF_FILENAME_KEY`를 동기화해 오래된 PDF 포인터가 남지 않도록 정리.
- feat(main-preview-state): `components/main-preview/MainPreviewSections.tsx`의 `phase1Done`, `phase2Done`을 sessionStorage에 저장해 섹션 활성 상태를 탭 내 이동에서 유지.

## [Unreleased] - 2026-04-18 19:39:31 (feat(reports): 보고서 탭에서 1공정 PDF Base64 재사용)

### Changed
- feat(report-store): `src/lib/dashboard/reports_store.ts`의 `StoredReportItem`에 `pdfBase64`, `pdfFilename`, `reportVersion` 필드를 추가해 1공정 완료 시점의 PDF를 목록 메타에 함께 저장.
- feat(phase1-save): `components/main-preview/Phase1Section.tsx`에서 `/api/panama/analyze` 응답의 `pdfBase64/pdfFilename/reportVersion`을 `upsertStoredReport`에 함께 전달하도록 저장 로직 확장.
- feat(reports-viewer): `components/dashboard/reports/GeneratedReportsList.tsx`의 PDF 획득 우선순위를 (1) 저장된 Base64 → (2) 메모리 캐시 → (3) `/api/panama/pdf` 호출로 변경해 탭 전환 시 즉시 미리보기/다운로드를 우선 보장.
- chore(report-client): `components/PanamaReportClient.tsx`에서 확장된 저장 스키마에 맞춰 기본값(`pdfBase64=null`, `pdfFilename=null`, `reportVersion`)을 함께 기록.

## [Unreleased] - 2026-04-18 19:38:57 (fix(pdf): /api/panama/pdf V1/V3 분기 및 버전 캐시 분리)

### Changed
- fix(pdf-route): `app/api/panama/pdf/route.ts`에 `USE_REPORT1_V3` 분기를 추가해 V3에서는 `generateReport1V3` + `Report1DocumentV3`, V1에서는 기존 `generateReport1` + `Report1Document`를 유지하도록 분기.
- fix(pdf-cache): fast-cache 조회 시 `report_version`(`v1`/`v3`) 필터를 우선 적용하고, V3 payload는 `parseReport1PayloadV3`로 검증하도록 보강.
- fix(pdf-header): `/api/panama/pdf` 응답 헤더에 `X-Report-Version`을 추가하고 `X-LLM-Source`를 경로별로 일관 노출.
- fix(pdf-cache-write): PDF 경로에서도 `panama_report_cache` upsert 시 `report_version`을 함께 저장(컬럼 미존재 시 레거시 upsert로 폴백).

## [Unreleased] - 2026-04-18 19:09:01 (chore(branding): 유나이티드 심볼 파비콘 복원)

### Changed
- feat(favicon): 사용자 제공 유나이티드 심볼 이미지를 `public/images/united-favicon.png`로 반영.
- feat(layout): `app/layout.tsx`의 `metadata.icons`를 설정해 기본/shortcut/apple 파비콘이 모두 유나이티드 심볼로 노출되도록 구성.

## [Unreleased] - 2026-04-18 18:21:13 (feat(report1-v3-stage3): analyze V1/V3 스위치 + 클라이언트 렌더 분기)

### Changed
- feat(api-switch): `app/api/panama/analyze/route.ts`에 `USE_REPORT1_V3` 환경변수 분기를 추가해 `generateReport1V3`/`generateReport1`을 선택 실행하도록 변경.
- feat(api-switch): 동일 파일의 PDF 렌더링 경로를 분기해 V3는 `Report1DocumentV3`, V1은 기존 `Report1Document`를 사용하도록 구성.
- feat(api-header): 분석 응답에 `X-Report-Version` 헤더(`v1`/`v3`)와 `reportVersion` 본문 필드를 추가해 프런트가 명시적으로 버전을 판별하도록 보강.
- fix(api-cache-guard): `panama_report_cache` PDF 조회/저장 로직에 `report_version` 조건을 우선 적용하고, 컬럼 미존재 환경에서는 파일명 토큰(`_v1`/`_v3`) 기반 안전 폴백을 사용해 V1/V3 오염을 방지.
- feat(client-switch): `components/PanamaReportClient.tsx`에 V1/V3 통합 파서(`parseUnifiedLlmBundle`)를 추가하고, 헤더 버전+payload 구조 기반으로 `Report1V3` 또는 `Report1`을 분기 렌더링.
- refactor(client-compat): V3 payload를 대시보드용 V1 형태로 변환하는 어댑터를 추가해 기존 `AnalysisResultDashboard`를 변경 없이 재사용.
- chore(env): `.env.local`에 `USE_REPORT1_V3=true`를 추가해 로컬 기본 검증 모드를 V3로 설정.

### Verified
- test(build-v3): `USE_REPORT1_V3=true` 상태에서 `npm run build` 통과.
- test(build-v1): 쉘 환경변수 `USE_REPORT1_V3=false` 강제 후 `npm run build` 통과.
- test(api-v3): `POST /api/panama/analyze` 호출 결과 `X-Report-Version=v3`, `X-LLM-Source=haiku`, `block2_*` 5개 카테고리 필드 존재, `block4_papers=2`, `block4_databases=5` 확인.
- test(api-v1): `POST /api/panama/analyze` 호출 결과 `X-Report-Version=v1`, `hasV1=true`, `hasV3=false`, `X-LLM-Source=cache` 확인.

## [Unreleased] - 2026-04-18 18:02:43 (feat(report1-v3-stage2): V3 fallback + 웹/PDF 렌더링 컴포넌트 추가)

### Added
- feat(report1-v3-fallback): `src/llm/report1_fallback_template.ts`에 `buildFallbackReportV3`, `detectDataGapsV3`, `fitV3`, V3 논문/DB 행 빌더를 추가해 Stage 1 임시 fallback을 규칙 기반 V3 payload 생성으로 교체 가능한 상태로 확장.
- feat(report1-v3-fallback): `FallbackInput`에 `perplexityPapers?: PerplexityPaper[]`를 추가해 V3 fallback 경로에서도 입력 논문 리스트를 `block4_papers`로 우선 반영하도록 구성.
- feat(report1-v3-web): 신규 `components/Report1V3.tsx` 추가. 기존 `Report1.tsx`를 건드리지 않고 V3 전용 UI(블록2 카테고리 분리, 블록3 데이터갭 배너, 블록4 논문/DB 표)를 독립 렌더링.
- feat(report1-v3-pdf): 신규 `lib/pdf/Report1DocumentV3.tsx` 추가. 기존 `Report1Document.tsx` 유지한 채 Pretendard 폰트 경로(`./pdf-fonts`)를 재사용하고 3페이지 구조(판정/근거, 전략, 표 근거)로 분리 렌더링.

### Changed
- refactor(report1-v3-generator): `src/llm/report1_generator.ts`에서 `generateReport1V3`의 fallback 경로를 `temporaryFallbackV3` 대신 `buildFallbackReportV3(fallbackInput)`로 변경.
- refactor(report1-v3-generator): Stage 1 임시 함수는 삭제 대신 주석 보존해 원복 가능성을 남김.
- chore(report1-v3-debug): `scripts/debug/test_report1_v3.ts`를 확장해 (1) Haiku V3 생성 (2) 의도적 data gap fallback 샘플 생성 (3) `Report1DocumentV3` PDF 렌더링(`tmp/report1_v3_test.pdf`)을 한 번에 검증.

### Verified
- test(v3-script): `npx tsx scripts/debug/test_report1_v3.ts` 실행 성공. `source=haiku`, payload 14개 필드 출력, fallback payload 키/갭 노트 출력, PDF 생성 확인.
- test(v3-pdf): 생성 파일 `tmp/report1_v3_test.pdf`, 크기 `30,570 bytes`, 페이지 수 `3` 확인.
- test(build): `npm run build` 성공(타입체크 포함). 외부 환율 API 인증서 경고 로그는 기존 네트워크 이슈이며 빌드 실패와 무관.

## [Unreleased] - 2026-04-18 17:49:04 (feat(report1-v3-stage1): V3 스키마/툴/프롬프트/제너레이터 병행 추가)

### Added
- feat(report1-v3-schema): `src/llm/report1_schema.ts`에 `Report1PayloadV3`, `REPORT1_PAYLOAD_V3_SCHEMA`, `parseReport1PayloadV3`를 추가해 블록2 카테고리 분리, 블록3 data_gaps, 블록4 표 구조(papers/databases)를 길이 제약(최대 250자 중심)과 함께 검증 가능하도록 확장.
- feat(report1-v3-tool): 기존 `REPORT1_TOOL`을 유지한 채 `REPORT1_TOOL_V3`(`generate_report1_v3`)를 병행 정의해 V3 입력 스키마(14개 필수 필드, 배열 min/max, 중첩 객체 required)를 별도 강제.
- feat(report1-v3-prompt): 기존 `REPORT1_SYSTEM_PROMPT`를 유지한 채 `REPORT1_SYSTEM_PROMPT_V3`를 추가해 블록2/3/4 작성 규칙, data_gaps 판정 기준, 금지 표현을 V3 전용으로 분리.
- feat(report1-v3-generator): `src/llm/report1_generator.ts`에 `GeneratorResultV3`, `buildUserPromptV3`, `callLLMV3`, `generateReport1V3`, `temporaryFallbackV3`를 추가해 V1 경로와 충돌 없이 V3 생성 경로를 독립 구현.
- feat(report1-v3-debug): `scripts/debug/test_report1_v3.ts`를 신규 추가해 V3 생성 함수 단독 호출과 payload 14개 필드 존재 여부를 즉시 점검할 수 있도록 구성.

### Verified
- test(v3-script): `npx tsx scripts/debug/test_report1_v3.ts` 실행 결과 `source: haiku` 확인, payload key 14개 출력, `block4_papers`/`block4_databases` 카운트 정상 출력.
- test(build): `npm run build` 성공(타입 체크 포함). 빌드 중 환율 수집 API 인증서 검증 실패 로그(`unable to verify the first certificate`)는 기존 외부 연동 이슈이며, Stage 1 코드 변경으로 인한 빌드 실패는 없음.

## [Unreleased] - 2026-04-18 17:32:06 (feat(phase1-ux): 분석 1회로 보고서+PDF 완료 통합)

### Changed
- feat(api-analyze): `app/api/panama/analyze/route.ts`에서 LLM 본문 생성 직후 `Report1Document` PDF를 렌더링하고 `pdfBase64`, `pdfFilename`을 응답에 포함하도록 확장.
- fix(api-analyze): PDF Base64 응답 크기 방어를 위해 원본 버퍼가 4.5MB를 넘으면 Base64 변환을 생략하는 안전 로직을 추가.
- feat(api-analyze-cache): `panama_report_cache`의 `pdf_base64`, `pdf_filename` 컬럼을 활용해 PDF 캐시 조회/저장을 연동하여 재호출 시 즉시 반환 가능하도록 구성.
- feat(phase1-ui): `components/main-preview/Phase1Section.tsx`에서 `/api/panama/analyze` 응답의 `pdfBase64`를 즉시 Blob URL로 변환해 저장하고 다운로드 버튼을 즉시 활성화하도록 변경.
- refactor(phase1-ui): `pdfLoading` 기반 별도 `/api/panama/pdf` 호출 경로를 제거하고, 준비된 Blob URL을 직접 다운로드하는 단일 클릭 UX로 전환.
- fix(phase1-ui): 분석 성공 시 `setStep(5)`를 사용해 4단계 `PDF 생성` 체크가 완료 상태로 확실히 표시되도록 조정.
- note(db): Supabase `public.panama_report_cache` 테이블에 `pdf_base64 TEXT`, `pdf_filename TEXT` 컬럼을 마이그레이션으로 추가.

## [Unreleased] - 2026-04-18 16:47:45 (fix(report1-length): 모든 필드 250자 상한 재조정)

### Changed
- fix(report1-schema): `src/llm/report1_schema.ts`에서 `block3_reasoning`을 항목당 `30~250자`로 축소하고 `block3_latam_scope_footnote`를 `max 250`으로 조정.
- fix(report1-schema): `block4_1~5` 제약을 공통 `60~250자`로 통일해 긴 앞 필드로 인한 뒤 필드 누락 위험을 낮춤.
- fix(report1-tool): `REPORT1_TOOL.input_schema`의 `maxLength`를 전 필드 250자로 일치시키고 설명 문구를 간결 출력 정책으로 갱신.
- fix(report1-prompt): `REPORT1_SYSTEM_PROMPT`에 `7개 필드 전부 생성`과 `250자 초과 시 거부` 규칙을 명시하고 block3/block4 길이 가이드를 `150~250자`로 재정의.
- fix(report1-generator): `src/llm/report1_generator.ts`의 `MAX_TOKENS`를 `4000 -> 4096`으로 상향하고 사용자 프롬프트 길이 가이드를 250자 정책으로 동기화.
- fix(report1-fallback): `src/llm/report1_fallback_template.ts`의 block4 보정 길이를 모두 `60~250`으로 통일해 fallback 경로도 동일 제약을 보장.

## [Unreleased] - 2026-04-18 16:30:28 (fix(report1-schema): 멀티페이지 대응 길이 제약 완화 및 파싱 진단 강화)

### Changed
- fix(report1-schema): `src/llm/report1_schema.ts`에서 `block3_reasoning`을 `5~8개`, 각 항목 `30~600자`로 완화하고 `block3_latam_scope_footnote` 상한을 `500자`로 상향.
- fix(report1-schema): `block4_1~5`를 공통 `100~2000자` 제약으로 완화해 상세 전략 본문(멀티문단) 생성을 허용.
- refactor(report1-parse): `parseReport1Payload`를 `REPORT1_PAYLOAD_SCHEMA` 기반 검증으로 통합해 Tool 스키마와 런타임 파서의 길이 규칙을 일치.
- fix(report1-prompt): `src/llm/report1_generator.ts` 사용자 프롬프트 길이 가이드를 `block3 5~8개/200~500자 권장`, `block4 400~1500자 권장`으로 갱신.
- fix(report1-debug): 파싱 실패 시 `Zod issues`(필드 경로·코드·메시지·수신 길이)를 구조화해 `stderr`에 기록하도록 보강하고 raw output 로그는 유지.
- fix(pdf-layout): `lib/pdf/Report1Document.tsx`의 `Page wrap={false}`를 제거해 긴 본문이 자연스럽게 페이지 분할되도록 조정.

## [Unreleased] - 2026-04-18 16:15:36 (chore(debug): Haiku Tool output 파싱 실패 로그 강화)

### Changed
- fix(report1-llm-debug): `src/llm/report1_generator.ts`에서 `parseReport1Payload` 실패 시 `Tool output parse FAILED`, 파싱 에러 메시지, Tool raw output(최대 3000자)를 `stderr`로 출력하도록 보강.
- fix(report1-llm-debug): 파싱 실패 예외 메시지를 `Schema mismatch: ...` 형식으로 통일해 실패 분류를 명확화.
- fix(report1-llm-retry): `canRetryHaiku`에 `schema mismatch`, `parse` 키워드를 추가해 구조 불일치도 1회 재시도 대상으로 포함.

## [Unreleased] - 2026-04-18 15:56:53 (fix(llm-timeout): Haiku 58초 + 재시도 + Vercel 실행시간 상향)

### Changed
- fix(report1-llm): `src/llm/report1_generator.ts`의 모델 선택을 환경변수 우선(`ANTHROPIC_MODEL`)으로 일원화하고, 기본 타임아웃을 `LLM_TIMEOUT_MS`(기본 58초)로 상향.
- fix(report1-llm): 1차 Haiku 실패 시(타임아웃/네트워크 계열) 30초 1회 재시도 후 fallback으로 내려가는 보호 로직을 추가하고, `ATTEMPT/FAILED/RETRY SUCCESS/RETRY FAILED` 단계 로그를 보강.
- fix(api-runtime): `app/api/panama/pdf/route.ts`에 `export const maxDuration = 120`을 추가해 Vercel 함수 실행시간 여유를 명시.
- chore(env): `.env.local`에 `LLM_TIMEOUT_MS=58000`을 추가해 로컬 실행 시 동일 타임아웃 정책을 적용.

## [Unreleased] - 2026-04-18 15:53:20 (chore(debug): Haiku 직접 호출 점검 스크립트 추가)

### Added
- chore(debug): `scripts/debug/test_haiku.ts` 신규 추가. Anthropic SDK로 Haiku 모델에 `hello` 단건 호출을 수행하고 성공/실패(JSON)만 출력해, 보고서 생성 경로 외부에서 API 키·모델·네트워크 상태를 분리 진단할 수 있도록 구성.

## [Unreleased] - 2026-04-18 15:41:14 (fix(product-dictionary): 이중 사전 제거 및 Hydroxyurea 자동 폴백 차단)

### Fixed
- fix(dict): 사용되지 않던 구버전 사전 파일 `src/config/product-dictionary.ts`를 삭제해, UUID 체계가 다른 레거시 사전 참조로 인한 매핑 혼선 가능성을 제거.
- fix(report-route): `app/panama/report/PanamaReportRoute.tsx`에서 `DEFAULT_INN=Hydroxyurea` 폴백을 제거하고, `inn` 누락/미매핑 시 명시적 오류 메시지를 노출하도록 변경.
- fix(report-route): `app/panama/report/[inn]/page.tsx` 레거시 슬러그 미매핑 시 `Hydroxyurea`로 강제 리다이렉트하지 않고 `?inn=UNKNOWN`으로 이동시켜 잘못된 제품 자동 대체를 차단.
- fix(process1-selector): `components/dashboard/process1/ProductSelectorCard.tsx`의 `PRODUCTS[0]` 폴백 선택 로직을 제거하고, 매핑 실패 시 `제품 매핑 오류` 상태를 노출하도록 보강.

### Changed
- note(ui): 변경되는 시각 요소는 매핑 실패 시 링크 버튼 대신 `제품 매핑 오류` 배지가 보이는 점이며, 카드 레이아웃·폰트·간격은 유지.

## [Unreleased] - 2026-04-18 15:36:46 (fix(reports-preview): 보고서 전환 race condition 및 무한 로딩 방지)

### Fixed
- fix(reports-ui): `components/dashboard/reports/GeneratedReportsList.tsx`에서 `보고서 보기` 연속 클릭 시 이전 요청 응답이 늦게 도착하며 파일명/미리보기가 다른 품목으로 덮어쓰이는 race condition을 요청 시퀀스 가드로 차단.
- fix(reports-ui): 보고서 전환 시 이전 `fetch('/api/panama/pdf')`를 즉시 abort하도록 변경해, 선택 변경 이후 오래 걸린 이전 응답이 현재 선택 상태를 오염시키지 않도록 보정.
- fix(reports-ui): A4 미리보기 요청 45초 타임아웃을 추가해 `PDF 생성 중...` 무한 대기를 방지하고, 시간 초과 시 원인(서버 생성 지연)과 해결 방법(재시도/1공정 재실행)을 함께 노출.

## [Unreleased] - 2026-04-18 15:31:33 (fix(reports-pdf): 1공정 캐시 기반 즉시 열람/다운로드 경로 추가)

### Fixed
- fix(api-pdf): `app/api/panama/pdf/route.ts`에서 `productId` 최소 요청(보고서 탭 기본 경로) 시 `panama_report_cache`를 우선 조회해 PDF를 즉시 렌더하는 fast-cache 경로를 추가하고, 캐시 미스일 때만 기존 전체 분석 경로로 폴백되도록 분기.
- fix(api-pdf): 기존에는 최소 요청도 `analyzePanamaProduct` 재실행으로 이어져 1분+ 지연이 발생했으나, 이제 1공정에서 이미 생성된 LLM 캐시를 재사용해 보고서 탭 `보고서 보기` 초기 대기 시간을 크게 단축.
- fix(reports-ui): `components/dashboard/reports/GeneratedReportsList.tsx`에 항목별 PDF Blob 메모리 캐시를 추가해, 같은 보고서에서 `보기 → 다운로드` 전환 시 중복 API 호출 없이 즉시 재사용되도록 개선.
- fix(reports-ui): cleanup 훅에서 `ref.current` 직접 참조로 발생하던 안정성 경고를 제거하기 위해 ref 참조를 지역 변수로 고정.

### Changed
- note(ui): 시각적 레이아웃/폰트/간격은 유지하고, 사용자 체감 변경점은 `A4 미리보기` 및 `↓ PDF` 버튼의 응답 속도 단축에 한정.

## [Unreleased] - 2026-04-18 15:26:32 (fix(macro-ui): GDP 카드 표기를 한 줄 포맷으로 강제 정규화)

### Fixed
- fix(main-preview-macro): `components/main-preview/MacroCards.tsx`에 GDP 카드 정규화(`normalizeGdpCard`)를 추가해, 카드 데이터가 예전 `detailLines` 형태로 들어와도 화면에서는 항상 `국가GDP/1인당GDP` + `US$ 87.6 Billion / $ 19,445` 한 줄 형식으로 표시되도록 보정.
- note(ui): 변경되는 시각 요소는 GDP 카드의 제목/본문 표기 방식(2줄 상세 → 1줄 요약)이며, 카드 간격·폰트 계층·그리드 배치는 유지.

## [Unreleased] - 2026-04-18 15:17:39 (fix(main-preview): 1공정 완료 상태를 레퍼런스 UI와 일치화)

### Fixed
- fix(phase1-ui): `components/main-preview/Phase1Section.tsx` 완료 토스트를 연녹색 톤으로 조정하고 문구를 `상세 결과는 보고서 탭` 안내 형식으로 맞춰, 분석 완료 피드백이 레퍼런스 화면과 동일한 인지 흐름으로 보이도록 보정.
- fix(phase1-ui): 분석 단계 라벨을 `DB 조회 / Claude 분석 / 논문 검색 / PDF 생성`으로 정리해 레퍼런스 표기와 용어를 통일.

### Added
- feat(phase1-ui): 1공정 카드 하단에 `PDF 보고서` 블록과 `PDF 보고서 다운로드` 버튼을 추가하고, 분석 완료 후에만 활성화되도록 상태 연동.
- feat(phase1-ui): 1공정에서 `/api/panama/pdf` 최소 요청(`productId`) 기반 다운로드를 직접 수행하도록 연결해 보고서 탭 이동 없이도 즉시 PDF 저장 가능하게 개선.
- note(ui): 변경되는 시각 요소는 완료 알림 박스 색상/문구, 하단 PDF 버튼 영역 추가이며 기존 입력 폼 레이아웃·폰트 크기·간격 구조는 유지.
- fix(phase1-ui): `2026-04-18 15:23:40` 기준으로 분석 성공 시 `readyProductId`를 즉시 세팅하도록 보강해, 완료 직후 PDF 버튼이 정상 활성화되도록 수정.

## [Unreleased] - 2026-04-18 15:11:30 (style(macro): GDP 카드 요약 표기 한 줄화)

### Changed
- style(main-preview-macro): `src/logic/panama_landing.ts`의 GDP 카드를 `국가GDP/1인당GDP` 제목으로 조정하고, 값 표기를 `US$ 87.6 Billion / $ 19,445` 한 줄 요약으로 변경.
- note(ui): 출처는 기존과 동일하게 카드 하단 소형 텍스트(`출처: IMF (2024)`)로 유지.

## [Unreleased] - 2026-04-18 15:00:08 (fix(reports-tab): PDF 다운로드 복구 + 하단 A4 미리보기 확장)

### Fixed
- fix(reports-ui): `components/dashboard/reports/GeneratedReportsList.tsx`의 `↓ PDF` 버튼에 실제 다운로드 핸들러를 연결해 `/api/panama/pdf` 호출 후 파일이 저장되도록 복구.
- fix(reports-ui): 다운로드 실패 시 원인 메시지와 재시도 안내를 포함한 경고를 노출해 사용자 복구 동선을 명확화.

### Added
- feat(reports-ui): 보고서 탭에서 항목 선택 시 하단에 A4 PDF 미리보기 `iframe`가 펼쳐지도록 추가.
- feat(reports-ui): 탭 진입 후 보고서 목록이 있으면 첫 항목을 자동 선택해 미리보기를 바로 로드하도록 개선.
- feat(reports-ui): 항목별 `보고서 보기` 버튼을 추가해 원하는 보고서를 즉시 하단 미리보기로 전환 가능.

## [Unreleased] - 2026-04-18 13:16:15 (feat(main-preview): 세션25 1·2·3공정 통합 리디자인 1차 구현)

### Changed (1공정)
- `components/main-preview/Phase1Section.tsx` 완료 토스트 문구를 `✅ {제품명} 시장조사 분석 완료 — 판정: {등급}. 상세 보고서는 [보고서] 탭에서 확인하세요.` 형식으로 교체.
- `EntryFeasibility.grade` 매핑(`A_immediate`~`unknown`)을 추가해 판정 라벨을 `즉시 진입 가능/단기 진입 가능/중기 진입(WLA 트랙)/장기 진입(시장 교육 필요)/진출 불가/판정 보류`로 표준화.

### Changed (2공정)
- `app/api/panama/phase2/calculate/route.ts`를 단일 실행 기반으로 개편해 `public_market` + `private_market`를 동시 반환하도록 변경.
- `components/main-preview/Phase2Section.tsx`에서 공공/민간 택1 버튼을 제거하고 단일 `▶ AI 가격 분석 실행` 버튼 + 4단계 체크포인트(UI) 구조로 전환.
- `components/main-preview/Phase2ResultTabs.tsx` 신규 추가로 공공/민간 탭 전환 및 3시나리오 카드 렌더링을 분리.
- `lib/phase2_pdf_template.ts` 신규 추가로 공공+민간 이원 결과를 보고서 텍스트로 내보내는 템플릿 구현.

### Added (3공정)
- `app/api/panama/phase3/route.ts` 신규 추가: 후보 조회 → (옵션) LLM 심층 보강 → 5항목 점수화 → Top10 응답 파이프라인 구성.
- `src/types/phase3_partner.ts`, `src/logic/partner_scorer.ts`, `src/logic/partner_search.ts`, `src/llm/partner_enrichment.ts` 신규 추가.
- `components/main-preview/Phase3Section.tsx`를 실행형 UI로 개편하고 `Phase3PartnerDiscovery`, `PartnerCard`, `CriterionCheckbox`, `ScoreCell` 신규 컴포넌트 연결.
- `scripts/sql/panama_partner_candidates.sql` 신규 추가(파트너 후보 통합 스키마).
- `scripts/runners/seed_partners_pharmchoices.ts`, `seed_partners_cphi.ts`, `seed_partners_dnb.ts` 신규 추가(소스별 사전 적재 러너).

## [Unreleased] - 2026-04-18 12:42:13 (style(main-preview): 지도 타이틀 및 GDP 카드 표기 방식 변경)

### Changed
- style(map-title): `components/main-preview/PanamaMap.tsx` 카드 제목을 `파나마 주요 거점 위치`에서 `파나마 위치`로 변경.
- style(macro): `src/logic/panama_landing.ts` GDP 카드를 단일 `1인당 GDP` 값에서 `국가 총 GDP / 1인당 GDP` 2줄 표기로 전환하고, 요청 값(`US$ 87.6 Billion`, `US$ 19,445`) 및 출처(`IMF 2024`)를 반영.
- style(macro-ui): `components/main-preview/MacroCards.tsx`에 다중 라인 지표 렌더링 분기를 추가해 GDP 카드에서 2개 지표를 본문으로, 출처를 하단 소형 텍스트로 표시.
- note(ui): 변경되는 시각 요소는 지도 제목 텍스트와 GDP 카드 본문/출처 레이아웃이며, 나머지 카드의 폰트·간격·배치는 유지.

## [Unreleased] - 2026-04-18 12:32:29 (style(map): 초기 지도 배율 추가 축소)

### Changed
- style(main-preview-map): `components/main-preview/PanamaMap.tsx` 기본 줌을 `7 → 6`으로 추가 조정해, 첫 진입 시 파나마 단일 도시 확대 화면이 아닌 중미-북남미 사이 위치 맥락이 더 잘 보이도록 보정.
- note(ui): 변경되는 시각 요소는 초기 지도 표시 범위(한 단계 더 넓어짐)이며, 카드 레이아웃/폰트/간격/마커 스타일은 유지.

## [Unreleased] - 2026-04-18 12:30:17 (feat(news): 네이버 원문 언론사 표기 + KOTRA 2026 링크 고정 노출)

### Changed
- feat(news-logic): `src/logic/fetch_panama_dashboard_news.ts`에서 Haiku 프롬프트에 `news.naver.com` 2건 이상 수집 조건을 추가하고, 네이버 항목은 원문 언론사명을 `original_press`로 반환하도록 지시.
- feat(news-logic): `news.naver.com` URL 전용 파서를 추가해 snippet/title/meta에서 `언론사 · 날짜` 패턴을 추출하고, 국가명/일반 라벨(예: 대한민국) 같은 비언론사 값은 source에서 제외.
- feat(news-logic): 최종 뉴스 합성 시 `KOTRA 2026 파나마 진출전략` 링크를 항상 포함하도록 `ensureKotra2026Included` 보강.
- feat(news-ui): `components/dashboard/main/MarketNewsCard.tsx`에서 headline을 URL 앵커로 렌더링하도록 변경해 카드에서 원문 링크를 직접 열 수 있게 개선.
- note(ui): 시각적으로 바뀌는 요소는 뉴스 제목의 링크 스타일(hover 시 밑줄)이며, 카드 레이아웃/폰트 크기/간격은 유지.

## [Unreleased] - 2026-04-18 12:24:57 (style(map): 파나마 지도 기본 배율 축소)

### Changed
- style(main-preview-map): `components/main-preview/PanamaMap.tsx`의 기본 줌을 `10 → 7`로 조정해, 파나마 단일 도시 중심 화면이 아니라 중미/북남미 인접 맥락이 함께 보이는 초기 지도로 설정.
- note(ui): 변경되는 시각 요소는 지도 표시 범위(더 넓은 지역 노출)이며, 카드 레이아웃/폰트/간격/마커 스타일은 유지.

## [Unreleased] - 2026-04-18 12:21:45 (fix(news): Haiku source/date 강제 추출 및 카드 노출 필터링)

### Fixed
- fix(news-logic): `src/logic/fetch_panama_dashboard_news.ts`에 도메인 기반 출처 추론 규칙을 추가해 `dream.kotra.or.kr`/`kita.net`/`statista.com`/`gabionline.net`/`pharmtech.com` 매핑과 기타 도메인 fallback을 일관 적용.
- fix(news-logic): Haiku 프롬프트를 강화해 `web_search`의 URL·제목·snippet에서 `source/date`를 반드시 파싱하도록 명시하고, `source` 또는 `date`가 빈 항목은 결과에서 제외하도록 강제.
- fix(news-logic): 날짜 파서를 추가해 `YYYY-MM-DD`, `YYYY/MM/DD`, `YYYY.MM.DD`, `YYYY년 M월 D일`, 영문 월 표기 및 연도형(`YYYY`)을 정규화하고, `날짜 미상` 문자열은 빈값으로 처리.
- fix(news-logic): `source` 또는 `date`가 비어 있는 뉴스를 `normalizeNewsItem` 단계에서 스킵하도록 변경해 카드에 `출처 미상 · 날짜 미상`이 노출되지 않도록 보강.

## [Unreleased] - 2026-04-17 23:18:05 (fix(haiku)+feat(news): Haiku 진단 강화 + 뉴스 캐시 수집 전환)

### Fixed
- fix(macro-card): `src/logic/panama_landing.ts` 의약품 시장 규모 대표값 표기를 `$0.50B`에서 `$496.00M`으로 변경해 단위 체감을 개선.
- fix(llm): `src/llm/report1_generator.ts`, `src/llm/phase2/phase2_generator.ts`에 Haiku 실패 상세 로깅(status/type/error payload)을 추가해 fallback 원인 추적을 강화.
- fix(ops): `scripts/runners/test_haiku_direct.ts` 직접 호출 스모크 테스트를 추가하고 `package.json`에 `test:haiku-direct` 스크립트를 등록해 `anthropic-version=2023-06-01` 헤더 경로를 즉시 검증 가능하게 구성.

### Added
- feat(news): `src/logic/fetch_panama_dashboard_news.ts`를 Haiku(`claude-haiku-4-5-20251001`) + `web_search_20250305` 기반 뉴스 수집으로 전환.
- feat(news): `panama_news_cache` 24시간 캐시 읽기/저장 로직을 추가해 불필요한 재호출을 줄이고 안정적으로 6개 뉴스를 반환하도록 개선.
- feat(news): `scripts/sql/panama_news_cache.sql` 신규 추가(테이블 + created_at 인덱스).
- feat(ui): `components/main-preview/MarketTrends.tsx` 뉴스 항목을 URL 앵커로 렌더링해 원문 클릭 이동을 지원.

## [Unreleased] - 2026-04-17 22:53:52 (fix(main-preview): 지도 깨짐 보정 + 내부 비율 경고 노출 제거)

### Fixed
- fix(map): `components/main-preview/PanamaMap.tsx`에 `ResizeObserver` 기반 `map.invalidateSize()` 재계산을 추가해 카드 높이/레이아웃 변동 시 Leaflet 하단 타일이 비거나 깨져 보이던 현상을 완화.
- fix(map): 초기 렌더 직후뿐 아니라 지연 시점(180ms)에도 추가 재계산을 수행해 첫 로드 시 간헐적 타일 영역 미정렬을 보정.

### Changed
- refactor(news-ui): `components/main-preview/MarketTrends.tsx`에서 warning 배너 노출을 제거해 내부 수집 정책 메시지(예: 4:2 비율 관련 문구)가 사용자 화면에 표시되지 않도록 정리.
- refactor(news-logic): `src/logic/fetch_panama_dashboard_news.ts`의 보강 문구 패딩(`추가 뉴스 수집 중입니다...`)을 제거하고, 부족 건수는 Perplexity 추가 질의로 채우는 방식으로 전환.
- refactor(news-logic): 4:2 내부 비율 미충족 시 warning 문자열을 응답에 노출하지 않도록 조정해 운영 내부 설정이 UI로 새지 않게 개선.

## [Unreleased] - 2026-04-17 22:32:04 (style(main-preview): 중단 카드 높이/문구/뉴스 비율 정렬)

### Changed
- style(main-preview): `components/main-preview/PanamaMap.tsx`의 카드 최소 높이를 `420px → 372px`, 지도 최소 높이를 `360px → 312px`로 줄여 중단 2열 카드 총 높이를 소폭 압축하고, 하단 `1공정 · 시장조사` 섹션이 화면에서 더 빨리 보이도록 조정.
- style(main-preview): 지도 제목을 `신규조달 위치`에서 `파나마 주요 거점 위치`로 교체해 실제 표시 데이터(파나마 시티 중심)와 의미를 일치.
- style(main-preview): `components/main-preview/MarketTrends.tsx` 제목을 `파나마 의약품 시장 주요 동향`으로 변경하고 카드 패딩/글자 크기를 미세 축소해 리스트 밀도를 개선.
- style(main-preview): `components/main-preview/MacroCards.tsx` 상단 4개 카드의 라벨/값/푸터 폰트를 한 단계 축소해 레퍼런스의 더 컴팩트한 타이포 톤에 맞춤.

### Added
- feat(news): `src/logic/fetch_panama_dashboard_news.ts`를 단일 혼합 질의 방식에서 `한국-파나마 관점 4건 + 파나마 현지 2건` 분리 수집 방식으로 개편하고, Perplexity 응답을 6건 고정 배열로 합성하도록 개선.
- feat(news): 뉴스 메타 라인에 `한국-파나마`/`파나마 현지` 접두를 부여해 사용자가 항목 출처 맥락을 즉시 구분할 수 있도록 보강.

## [Unreleased] - 2026-04-17 22:14:18 (fix(map-layout): 지도 카드 하단 빈 영역 제거)

### Fixed
- fix(main-preview-map): `components/main-preview/PanamaMap.tsx`를 `flex + h-full` 구조로 전환하고 지도 영역을 `flex-1`로 확장해, 2열 카드 높이 차로 발생하던 하단 공백을 제거.
- fix(main-preview-map): 지도 초기 렌더 직후 `invalidateSize()`를 호출해 컨테이너 크기 반영 지연으로 인한 빈 캔버스/잘림 현상을 완화.

## [Unreleased] - 2026-04-17 22:07:15 (style(phase3): 바이어 발굴 비활성 테이블 시안 정렬)

### Changed
- style(phase3-ui): `components/main-preview/Phase3Section.tsx`의 3공정 헤더 서브문구를 시안 문구(`시장조사·수출가격전략 완료 후 활성화`)로 교정.
- style(phase3-ui): 비활성 상태에서 오버레이를 제거하고, 테이블 내부 중앙 메시지(`바이어 데이터 준비 중`)로 단순화해 시안과 동일한 차분한 비활성 표현으로 조정.
- style(phase3-ui): 안내문/테이블 헤더/다운로드 버튼 색상 톤을 연회색 중심으로 보정해 현재 시안 밀도에 맞춤.

## [Unreleased] - 2026-04-17 22:02:07 (fix(main-preview): 파나마 지도 배율/시장규모 대표값 반영)

### Changed
- fix(map): `components/main-preview/PanamaMap.tsx` 기본 줌을 `10`으로 조정하고 마커 팝업 문구를 `Panama City (Panama)`로 보정해, 요청한 파나마 중심 초기 화면 배율로 통일.
- fix(macro): `src/logic/panama_landing.ts` 의약품 시장 규모 카드를 Statista 2024 대표값(`US$ 496.00m`) 기반으로 고정하고 카드 표기를 `$0.50B`(영문 단위)로 변경.
- fix(report1): `src/llm/report1_fallback_template.ts`와 `src/llm/report1_generator.ts`에 시장규모 대표 수치를 명시해 보고서 본문 생성 시 동일 기준을 우선 인용하도록 보강.

## [Unreleased] - 2026-04-17 21:40:24 (style(layout): 메인 본문 가로폭 축소)

### Changed
- style(layout): `components/dashboard/DashboardShell.tsx`의 메인 컨테이너 최대폭을 `1410px`에서 `1240px`로 축소해, 본문이 좌우로 과도하게 퍼지지 않고 1번 레퍼런스처럼 집중도 높은 레이아웃으로 보정.

## [Unreleased] - 2026-04-17 21:32:45 (fix(build): Leaflet SSR window 참조 오류 수정)

### Fixed
- fix(main-preview-map): `components/main-preview/PanamaMap.tsx`에서 Leaflet 상단 정적 import를 제거하고 `useEffect` 내부 동적 import로 전환해, 서버 프리렌더 시 `window is not defined` 오류를 해소.
- fix(build): `/` 페이지 prerender 실패 원인을 제거해 `npm run build`가 정상 완료되도록 복구.

## [Unreleased] - 2026-04-17 21:18:59 (refactor(ui): 메인 프리뷰 중심 2탭 구조 전환)

### Added
- feat(main-preview): `components/main-preview/MacroCards.tsx` 추가 — GDP/인구/의약품 시장 규모/실질 성장률 4카드를 상단 고정 레이아웃으로 렌더.
- feat(main-preview): `components/main-preview/PanamaMap.tsx` 추가 — Leaflet 기반 OpenStreetMap(파나마 시티 마커/팝업) 지도 섹션 구현.
- feat(main-preview): `components/main-preview/MarketTrends.tsx` 추가 — `/api/panama/dashboard-news` 연동 시장 동향 리스트 + 새로고침 버튼 구현.
- feat(main-preview): `components/main-preview/Phase1Section.tsx`, `Phase2Section.tsx`, `Phase3Section.tsx` 추가 — 01/02/03 공정 축약 섹션(접기/펼치기 포함) 구현.
- feat(main-preview): `components/main-preview/MainPreviewSections.tsx` 추가 — 1/2공정 완료 상태를 연결하고 3공정 잠금 해제 조건(AND)을 관리.

### Changed
- refactor(navigation): `components/dashboard/TabNavigation.tsx`를 5탭에서 2탭(`메인 프리뷰`, `보고서`)으로 축소.
- refactor(main-page): `app/page.tsx`를 매크로 카드 + 지도/시장동향 + 01/02/03 공정 축약 섹션 구조로 전면 재구성.
- refactor(report-tab): `components/dashboard/reports/GeneratedReportsList.tsx`에 `모두 지우기`, 개별 삭제, 조건부/가능 뱃지, 카드형 목록 레이아웃을 적용해 보고서 탭 가독성을 개선.
- refactor(route): `app/process-1/page.tsx`, `app/process-2/page.tsx`, `app/process-3/page.tsx`를 메인 프리뷰(`/`) 리다이렉트로 전환해 독립 공정 탭 접근을 비활성화.
- chore(deps): `leaflet`, `react-leaflet@4.2.1`, `@types/leaflet`을 추가해 지도 렌더링 기반을 확보.

## [Unreleased] - 2026-04-17 10:13:42 (style(process1): 제품 선택 문구 가독성 개선)

### Changed
- style(process1-ui): `components/dashboard/process1/Process1Workbench.tsx`의 선택 라벨 포맷을 `| 역할: | 성분: | 제형: | HS:` 구간 라벨 구조로 재정렬해 긴 문자열에서도 정보 경계를 즉시 인지할 수 있도록 개선.
- style(process1-ui): 동일 선택창에 `tracking-[-0.018em]`를 적용해 자간을 미세 축소하고, 모든 문자를 유지하면서 한 줄 가독성을 보정.

## [Unreleased] - 2026-04-17 09:30:14 (fix(report1-ui): PDF 보고서 중복 렌더 제거)

### Fixed
- fix(report1-ui): `components/PanamaReportClient.tsx`에서 하단 A4 HTML `Report1` 직접 렌더를 제거해, 동일 보고서가 임베디드 PDF 박스와 하단에 2번 보이던 문제를 해소.
- fix(report1-ui): 결과 화면은 `AnalysisResultDashboard`(상단 분석 카드/배너 내용 유지) + `PdfReportViewer`(임베디드 PDF 1개) 구조로 정리.
- refactor(report1-ui): 중복 렌더 제거에 맞춰 `PanamaReportClient`의 `digest` 상태 의존 조건을 단순화.

## [Unreleased] - 2026-04-17 09:18:53 (fix(process1): 분석 시작 시 단계 게이지바 가시성 보정)

### Fixed
- fix(process1-ui): `components/dashboard/process1/Process1Workbench.tsx`에서 분석 버튼 클릭 시 자동 스크롤 기준을 결과 섹션(`reportAnchorRef`)에서 단계 진행 영역(`progressAnchorRef`)으로 변경해, 로딩 중에도 단계 게이지바가 화면에 유지되도록 수정.
- fix(process1-ui): 스크롤 정렬 기준을 `start`에서 `center`로 조정해 단계 라벨/게이지바가 중앙에 안정적으로 보이도록 개선.

## [Unreleased] - 2026-04-17 09:16:22 (fix(process1): Rosumeg 성분명 정밀 표기 보정)

### Changed
- fix(process1-ui): `components/dashboard/process1/Process1Workbench.tsx` 드롭다운 목록에서 `Rosumeg Combigel` 성분 표기를 `rosuvastatin 5mg + omega-3-acid ethyl esters 90 1g`로 교정.
- fix(process1-ui): 동일 계열인 `Atmeg Combigel`도 `atorvastatin 10mg + omega-3-acid ethyl esters 90 1g`로 함께 교정해 목록 표기 일관성을 유지.
- fix(dictionary): `src/lib/dashboard/product_dictionary.ts`의 `Rosumeg/Atmeg` INN 표기를 동일 기준으로 동기화해 1차 공정 목록 카드와 구형 선택 카드 간 표기 불일치 방지.

## [Unreleased] - 2026-04-17 07:50:19 (feat(phase2): 역산/순산 Waterfall 3단 블록 구현)

### Added
- feat(phase2-ui): `components/phase2/Phase2WaterfallBlocks.tsx` 신규 추가 — `역산 Waterfall`, `전략 조정 배너`, `순산 Waterfall` 3단 구조를 구현하고, 각 단계의 금액/증감/비율 포지셔닝을 시각화.

### Changed
- feat(phase2-ui): `components/phase2/Phase2AiPipeline.tsx` 결과 영역에 `Phase2WaterfallBlocks`를 연결해 AI 파이프라인 탭에서도 산식 흐름을 즉시 확인 가능하도록 확장.
- feat(phase2-ui): `components/phase2/Phase2ManualInput.tsx` 결과 영역에 `Phase2WaterfallBlocks`를 연결하고, 설명 문구를 `저가진입/기준가/프리미엄` 기준으로 정렬.

## [Unreleased] - 2026-04-17 03:08:37 (feat(phase2): FOB 전략 배수 기반 산식으로 1차 착수)

### Added
- feat(logic): `src/logic/phase2/pricing_strategy_presets.ts` 신규 추가 — 파나마 공공/민간 고정 마진, 전략 배수(저가진입/기준가/프리미엄), 시나리오-전략 매핑 상수 정의.

### Changed
- refactor(logic): `src/logic/phase2/margin_policy_resolver.ts`를 시나리오별 가변 마진 구조에서 시장 고정 마진 구조로 전환하고, 리스크/물류 마진을 명시적으로 분리.
- refactor(logic): `src/logic/phase2/fob_back_calculator.ts`를 `FOB 천장 역산 → 전략 배수 적용 → 포지셔닝가 순산` 흐름으로 개편하고, `fobCeilingUsd`, `strategyMultiplier`, `positioningPricePab`를 결과에 추가.
- refactor(logic): `src/logic/phase2/price_scenario_generator.ts` 시나리오 라벨을 `저가진입/기준가/프리미엄`으로 교정.
- refactor(llm): `src/llm/phase2/phase2_generator.ts` 프롬프트 입력에 `FOB천장`과 `전략 배수`를 포함해 보고서 생성 근거를 강화.
- style(phase2-ui): `components/phase2/Phase2ScenarioCards.tsx` 시나리오 색상(파랑/노랑/빨강)과 표기 항목(FOB천장, 배수, 포지셔닝가)을 새 산식 기준으로 확장.
- fix(phase2-ui): `components/phase2/Phase2AiPipeline.tsx` 시장 안내 문구를 파나마 기준으로 교정하고, 산식 설명 문구를 전략 배수 모델에 맞게 정리.

## [Unreleased] - 2026-04-17 02:47:09 (feat(process1): 제품 선택 목록에 약품 역할 정보 추가)

### Changed
- feat(process1-ui): `components/dashboard/process1/Process1Workbench.tsx`의 드롭다운 라벨을 `분류 → 브랜드 → 역할 → 성분/강도 → 제형 → HS` 순서로 재정렬.
- feat(process1-ui): 8개 제품에 대해 역할 매핑을 추가(`항암제`, `혈전+지질 복합제`, `소화제`, `고지혈증 복합제`, `천식 흡입기 DPI`, `중성지방 낮춤 오메가3`, `MRI 조영제`)해 목록에서 즉시 확인 가능하도록 개선.
- note(ui): 백엔드 연동 키(`product_id`)와 선택 로직은 유지하고 표시 문자열만 확장.

## [Unreleased] - 2026-04-17 02:30:40 (style(layout): 메인 폭 중간값 확장 + 공정 탭 세로 중앙 정렬)

### Changed
- style(layout): `components/dashboard/DashboardShell.tsx` 본문 컨테이너 최대폭을 `1340px`에서 `1410px`로 조정해, 현재 버전의 좁은 느낌과 확장 버전 사이 중간 밀도로 카드 분포를 보정.
- style(navigation): `components/dashboard/TabNavigation.tsx` 탭 바를 `h-[52px]` + `border-y` 구조로 재정렬하고 탭 텍스트를 `h-full items-center leading-none`로 맞춰 상·하 구분선의 정중앙 높이에 오도록 조정.
- style(navigation): 활성 밑줄 위치를 `-bottom`에서 `bottom-0`으로 맞춰 텍스트가 아래로 쏠려 보이던 시각 오차를 완화.

## [Unreleased] - 2026-04-17 02:20:16 (style(layout): 메인 본문 분포 중간값 폭으로 조정)

### Changed
- style(layout): `components/dashboard/DashboardShell.tsx` 본문 컨테이너 최대폭을 `1180px`에서 `1340px`로 조정해, 과도하게 중앙에 모이던 3열 카드 분포를 완화.
- note(ui): 글자 크기/폰트는 유지하고 본문 카드 가로 분포만 중간값 톤으로 보정.

## [Unreleased] - 2026-04-17 02:17:41 (chore(process1): 1단계 스테퍼 문구 명확화)

### Changed
- chore(process1-ui): `components/dashboard/process1/Process1Workbench.tsx` 분석 단계 첫 라벨을 `크롤링 실행`에서 `DB조회 및 크롤링`으로 변경해 실제 실행 의미를 명확히 표기.

## [Unreleased] - 2026-04-17 02:14:10 (feat(exchange-rate): 메인 프리뷰 환율 위젯 추가)

### Added
- feat(ui): `components/panama/ExchangeRateCard.tsx` 추가 — KRW/USD 실시간 표시, USD/KRW 보조 카드, USD/PAB 1.00 고정 카드, PAB 1:1 페깅 안내 문구, 30초 쿨다운 새로고침 버튼 구현.
- feat(api): `app/api/panama/exchange-rate/route.ts` 추가 — 기존 `exchange_rate_exim.ts` 로직 재사용(`fetchExchangeRateUsdKrw + upsertExchangeRateToDb`)으로 `api_success`/`db_fallback` 소스를 반환.

### Changed
- style(main-preview): `app/page.tsx`의 메인 프리뷰 첫 카드 컴포넌트를 정적 `TariffExchangeCard`에서 실시간 `ExchangeRateCard`로 교체.

## [Unreleased] - 2026-04-17 01:56:54 (feat(report1-dashboard): 세션24 1공정 카드형 대시보드 결과 레이어 추가)

### Added
- feat(ui): `components/panama/`에 `CrawlingResultCard`, `JudgmentBanner`, `FeasibilityResult`, `MarketStrategyGrid`, `PerplexityPapers`, `PdfReportViewer`, `AnalysisResultDashboard`, `types` 신규 추가.
- feat(ui): `PanamaReportClient`에서 기존 A4 `Report1` 렌더 앞에 카드형 대시보드 섹션을 먼저 노출하고, 하단에 기존 보고서를 유지하는 2단 레이어 구조로 확장.
- feat(pdf): `PdfReportViewer`에서 `/api/panama/pdf` POST 응답을 blob URL로 렌더해 임베디드 PDF 뷰어 + 다운로드 버튼 + 파일명 표시를 제공.

### Changed
- feat(api): `app/api/panama/analyze/route.ts` 응답에 `sourceBreakdown`, `confidenceBreakdown` 필드를 추가해 대시보드 카드가 직접 소비할 수 있도록 확장(기존 필드 하위호환 유지).
- feat(client): `PanamaReportClient`에 `sourceBreakdown/confidenceBreakdown` 파서를 추가하고, LLM payload + 퍼플렉시티 캐시 데이터와 함께 통합 대시보드 번들로 조합하도록 변경.

## [Unreleased] - 2026-04-17 01:23:22 (fix(process1-typography): 1공정 타이틀 과대 스타일 완화)

### Fixed
- fix(process1-ui): `components/dashboard/process1/Process1Workbench.tsx`의 상단 카드 타이틀 크기를 과대 설정(`31px`, `24px`)에서 `16px` 기반으로 축소해 4번 시안과 유사한 밀도로 조정.
- note(ui): 입력칸 색상/단계 게이지/버튼 구조는 유지하고 타이틀 타이포만 완화해 과한 강조를 제거.

## [Unreleased] - 2026-04-17 01:04:57 (style(phase2): 2공정 AI 탭 표준 시안 기반 폼/색상 정밀 보정)

### Changed
- style(phase2): `components/phase2/Phase2Workbench.tsx` 상단 탭 컨테이너를 기준 시안 톤에 맞춰 연한 블루-그레이 카드(`border + bg`)와 문구 색상으로 조정.
- style(phase2): `components/phase2/Phase2AiPipeline.tsx`의 두 카드 타이틀/간격/버튼/설명문 색상을 시안에 맞춰 재정렬하고, `보고서 선택`, `시장 선택 및 분석 실행` 헤더를 굵고 큰 스타일로 통일.
- style(phase2): 구분선(`또는 PDF 직접 업로드`)의 선 색·텍스트 색·간격을 보정해 시각적 분리감을 강화.
- style(phase2): 시장 선택 안내 문구를 `공공 시장: PBS 공급금여 채널 · 주별 병원조달단(HealthShare NSW 등) 기준`으로 교정.
- style(phase2): `Phase2ReportSelector`, `Phase2UploadArea`, `Phase2MarketSegment`의 선택 박스/업로드 박스/토글 버튼을 시안과 유사한 톤(연한 배경 + 미세 보더 + 네이비 액션 버튼)으로 보정.

## [Unreleased] - 2026-04-17 00:45:02 (style(main-news): 새로고침 버튼 한 줄 고정)

### Changed
- style(main-news): `components/dashboard/main/MarketNewsCard.tsx`의 `↺ 새로고침` 버튼에 `whitespace-nowrap`와 최소폭(`min-w-[92px]`)을 적용해 텍스트 줄바꿈 없이 한 줄로 표시되도록 조정.
- note(ui): 버튼 색상/두께/높이는 유지하고 텍스트 래핑만 제어해 기존 톤을 유지.

## [Unreleased] - 2026-04-17 00:42:06 (style(topbar): 국가 표시 박스 경계선 미세 강조)

### Changed
- style(topbar): `components/dashboard/Topbar.tsx` 우측 국가 배지(`Panama`)에 옅은 테두리(`border-[#d9e2ef]`)를 추가해 박스 구분선을 조금 더 뚜렷하게 조정.
- note(ui): 그림자/크기/폰트는 유지하고 테두리만 보강해 과도하게 튀지 않도록 반영.

## [Unreleased] - 2026-04-17 00:37:48 (style(topbar): 회사명/대시보드 2줄 위계로 헤더 가독성 개선)

### Changed
- style(topbar): `components/dashboard/Topbar.tsx` 상단 타이틀을 한 줄 문장에서 2줄 구조로 변경.
- style(topbar): 상단 `한국유나이티드제약(주)`는 작은 보조 텍스트로, 하단 `해외 영업·마케팅 대시보드`는 기존보다 강조된 본문 타이틀로 배치해 시선 집중도를 개선.
- note(ui): 로고/국기/국가 표시/기능 로직은 변경 없이 텍스트 위계와 타이포만 조정.

## [Unreleased] - 2026-04-17 00:33:49 (feat(process1-step-ui): 분석 단계 파동/체크 진행 UI 및 멘트 정렬)

### Changed
- feat(process1-ui): `components/dashboard/process1/Process1Workbench.tsx`에 분석 단계 상태(`analysisStep`, `isAnalyzing`)를 추가해 버튼 클릭 시 단계 진행 UI를 표시.
- feat(process1-ui): 단계 라벨을 `크롤링 실행`, `클로드 분석`, `논문 검색`, `PDF 보고서 생성`으로 변경하고, 활성 단계 원형 배지에 파동(`animate-ping`) 효과를 적용.
- feat(process1-ui): 단계 완료 시 숫자 대신 체크(`✓`) 아이콘이 표시되도록 변경하고, 하단 게이지바가 단계 진행률(0~100%)에 맞춰 확장되도록 반영.
- feat(process1-sync): `components/PanamaReportClient.tsx`에 `onLoadingChange` 콜백을 추가해 실제 분석 로딩 상태와 단계 UI가 동기화되도록 연결.

## [Unreleased] - 2026-04-17 00:27:01 (fix(layout): Ctrl+휠 확대/축소 시 본문 고정폭 비율 유지)

### Fixed
- fix(layout): `components/dashboard/DashboardShell.tsx` 본문 영역을 `max-w-[1180px]` 중심 컨테이너로 변경해, 브라우저 확대/축소 시 콘텐츠가 화면 전체를 항상 꽉 채우지 않도록 조정.
- fix(layout): `Ctrl+휠` 확대/축소를 차단하던 `BrowserZoomGuard`를 제거(`app/layout.tsx` 참조 삭제 + 파일 삭제)하여 확대 시 표가 자연스럽게 커지고 축소 시 작아지도록 복원.
- note(ui): 본문 레이아웃 폭/정렬만 조정했으며, 1공정 분석 데이터 바인딩(`product_id` 기반)과 카드 기능 로직은 변경하지 않음.

## [Unreleased] - 2026-04-17 00:18:36 (style(process1): 1공정 초기 입력 구간 가독성 복원 + 옅은 파랑 입력 박스 적용)

### Changed
- style(process1-ui): `components/dashboard/process1/Process1Workbench.tsx`의 상단 2개 카드 타이틀 가독성을 초기 버전 톤에 맞게 강화(굵기/크기/자간 조정).
- style(process1-ui): 제품 선택 select 및 신약 분석 3개 입력칸 배경을 아주 옅은 파랑(`bg-[#f3f7ff]`)으로 통일하고, 테두리/텍스트 대비를 부드럽게 조정.
- safety: 드롭다운 value는 기존 `product_id`를 유지하여 백엔드 분석 연동 경로는 변경 없이 보존.
- refactor(ui-shared): `components/dashboard/shared/Card.tsx`에 `titleClassName`/`subtitleClassName` 옵션을 추가해 특정 카드만 스타일 오버라이드 가능하도록 확장.

## [Unreleased] - 2026-04-17 00:15:08 (fix(ui-zoom): Ctrl/Cmd 줌 입력 차단으로 본문 레이아웃 붕괴 방지)

### Fixed
- fix(layout): `components/common/BrowserZoomGuard.tsx` 신규 추가. `Ctrl/Cmd + wheel`, `Ctrl/Cmd + (+/-/0)` 브라우저 줌 입력을 차단해 본문 UI가 화면폭 재계산으로 깨지는 현상을 방지.
- fix(layout): `app/layout.tsx`에 `BrowserZoomGuard`를 전역 삽입해 `/process-1` 포함 전체 앱에서 동일 동작 유지.
- note(ui): 카드/폰트/간격/색상 등 시각 스타일은 변경하지 않고, 입력 이벤트 처리만 수정.

## [Session 23 종합] - 2026-04-16 (D-8)

### 중간안 D-1 + D-2 도입 — 보고서 생성 로직 박제

**핵심 결정**: 현재 코드에 존재하지만 실행되지 않던 크롤러들을 실제 작동 상태로 복원·연결하는 "중간안" 진행. 달강님 요구 3조건(크롤링 로직 포함 + 신선도 다한 항목만 + URL 핀포인팅 없이)을 만족하는 구조 확정.

### 보고서 생성 전체 로직 박제 (ARCHITECTURE.md / USER_FLOW.md / TECHNIQUES_STATUS.md 최상단)

- 사전 단계: GitHub Actions 수동 workflow_dispatch로 주 1회 트리거 → v_stale_items VIEW 경유 → Colombia SECOP / SuperXtra VTEX / ACODECO CABAMED 3종 조건부 재크롤링 → UPSERT + pa_freshness_status = 'fresh' 복원
- PanamaCompra V3는 봇 차단 → 달강님 수동 PDF + 별도 Claude 세션 LLM 정형화 + 수동 INSERT 경로 유지
- 런타임: Supabase 조회 80% + 환율 EXIM API 5% + Haiku Judge 신선도 5% → pa_freshness_status 마킹으로 다음 GitHub Actions 실행 시 자동 재크롤링 대상에 포함됨 (런타임 → 크롤링 루프 가교)

### 산출물

- `docs/ARCHITECTURE.md` 최상단에 "⭐ 보고서 생성 전체 로직" 섹션 신규 삽입
- `docs/USER_FLOW.md` 최상단에 동일 섹션 삽입 + 세션 히스토리에 19·20·22·23 추가
- `docs/TECHNIQUES_STATUS.md` 최상단에 동일 섹션 삽입 + 변경 이력에 19·20·22·23 추가
- 절대 원칙 20·21·22번 신규 (로컬 vs Vercel 분리, Rx/OTC 엄격 분리, 신선도 가교 구조)

### 병행 작업 (별건)

- 1공정 Haiku 실호출 실패 장기 디버깅 (세션 20~23 연속 미해결) → Anthropic 크레딧 소진 가설 유력, 달강님 팀원 계정 권한 문제로 이월
- 2공정 UI/API 완성 (Phase2 LLM Generator + 5블록 스키마 + 3-tier 체인)
- Rosumeg Tier 재라벨링 SQL 생성 (`세션23_tier_relabel.sql`) — `competitor_public_procurement` → `competitor_single_component` 정정

---

## [Unreleased] - 2026-04-17 00:11:55 (feat(process1-ui): 1공정 제품 선택 목록 표기 포맷 정렬)

### Changed
- feat(process1-ui): `components/dashboard/process1/Process1Workbench.tsx` 드롭다운 옵션을 `[분류] 브랜드 · 성분/강도 · 제형 · HS 코드` 포맷으로 표기하도록 변경.
- feat(process1-ui): 옵션 표시용 `PRODUCT_UI_META_BY_ID`와 HS 코드 축약(`3004.90.1000`→`3004.90`) 헬퍼를 추가해 스크린샷 기준 표기와 동일 톤으로 정렬.
- safety: select value는 기존과 동일하게 `product_id`를 유지하여 분석 버튼 클릭 시 백엔드 연동 경로(`product_id` 기반 분석 API 호출)가 그대로 동작하도록 보존.

## [Unreleased] - 2026-04-16 23:39:53 (fix(session23-final): A-1 환율 재시도/원인 로깅 + A-2 freshness 후처리 UPDATE 연결)

### Fixed
- fix(d1-exim): `src/crawlers/realtime/exchange_rate_exim.ts`에 3회 재시도 + 지수 백오프 + 10초 timeout + 빈 응답/파싱 실패/USD 누락 분기 로그를 추가해 간헐 성공 가능성을 보강.
- fix(d1-exim): `fetch failed` 계열 진단 강화를 위해 에러 메시지에 `err.cause` 세부 내용을 함께 기록하도록 `stringifyUnknown` 헬퍼 추가.
- fix(d1-exim): API 성공 시 source를 `api_success`로 통일하고, `API SUCCESS`/`RESOLVED` 로그를 남겨 런타임 판독성을 강화.
- fix(d2-refresh): `scripts/runners/freshness_refresh_runner.ts`에 task 성공 후 `panama` 테이블 freshness 후처리 UPDATE 로직 추가(`pa_freshness_status='fresh'`, `pa_freshness_checked_at`, `pa_item_collected_at`).
- fix(d2-refresh): dry-run 모드에서는 기존대로 UPDATE를 건너뛰고, 실행 모드에서만 source별 UPDATE를 수행하도록 분기 유지.

## [Unreleased] - 2026-04-16 21:04:52 (feat(freshness): stale VIEW + refresh runner/workflow + 환율 진단 로그 보강)

### Changed
- fix(realtime): `src/crawlers/realtime/exchange_rate_exim.ts`에 `[exchange_rate_exim]` 진단 로그 추가(START/API_HIT/API_MISS/API_ERROR/DB_FALLBACK/DB_FALLBACK_FAILED)로 db_fallback 진입 원인 추적 강화.
- feat(sql): `scripts/sql/v_stale_items.sql` 추가. `stale_likely`/`stale_confirmed` 행을 `refresh_runner_key`(`datos_gov_co`/`superxtra_vtex`/`pa_acodeco_cabamed`)로 매핑하는 VIEW 정의.
- feat(runner): `scripts/runners/freshness_refresh_runner.ts` 추가. `v_stale_items` 조회 후 source별 재수집 태스크를 dry-run/실행 모드로 오케스트레이션.
- feat(ci): `.github/workflows/freshness_refresh.yml` 추가(`workflow_dispatch`, dry_run 입력, `SUPABASE_KEY` 기반 실행).
- fix(ci): GitHub Secrets 정책에 맞춰 기존 서비스 롤 키 참조를 `SUPABASE_KEY`로 치환.
- chore(scripts): `package.json`에 `freshness:refresh` 스크립트 추가.
- verify: 로컬 dry-run(`npx tsx scripts/runners/freshness_refresh_runner.ts --dry-run=true`) 정상, 현재 stale 대상 0건 확인.

## [Unreleased] - 2026-04-16 19:46:21 (chore(policy): Perplexity 제외 LLM 경로 Haiku 단일 정책 문서 정합)

### Changed
- chore(docs): `ARCHITECTURE.md`의 구 `claude-sonnet-4-5` 표기를 `claude-haiku-4-5-20251001`로 갱신하고, 논문 도출(Perplexity) 예외 정책을 명시.
- verify(policy): `src/` 기준 모델 문자열 재점검 결과 Anthropic 호출 경로(`report1_generator`, `phase2_generator`, `freshness_checker`)는 모두 Haiku 단일 사용 상태 확인.

## [Unreleased] - 2026-04-16 19:44:08 (chore(phase2-llm): 2공정 모델 체인 Haiku 단일화)

### Changed
- chore(phase2-llm): `src/llm/phase2/phase2_generator.ts`에서 Opus/Sonnet 호출 경로를 제거하고, 2공정 보고서 생성 경로를 `Haiku 단일 호출 + fallback`으로 단순화.
- chore(phase2-llm): `Phase2GeneratorResult.source` 타입에서 `opus`/`sonnet`을 제거해 런타임 분기와 타입 정의를 정합화.
- verify: `npx tsc --noEmit` 통과, phase2_generator linter 오류 0건.

## [Unreleased] - 2026-04-16 19:29:37 (chore(report1-logging): console.log 제거 및 stderr 통일)

### Changed
- chore(report1-logging): `src/llm/report1_generator.ts`의 USER_PROMPT/DEBUG 로그를 `console.log`에서 `process.stderr.write`로 전환해 서버 로그 정책 일관성 유지.

## [Unreleased] - 2026-04-16 19:27:43 (fix(phase2+report1): 2공정 AI탭 레이아웃 정렬 + 1공정 Haiku 실패 추적 로그 강화)

### Changed
- style(phase2-ui): `components/phase2/Phase2AiPipeline.tsx`를 목표 화면 구조로 재정렬(상단 탭 카드 이후 `STEP 1` 카드와 `STEP 2` 카드를 분리, 진행 도트 노출 제거, 실행 버튼 우측 정렬).
- style(phase2-ui): `components/phase2/Phase2Workbench.tsx` 안내 문구를 스크린샷 톤에 맞춰 간결화.
- fix(report1-llm): `src/llm/report1_generator.ts` Haiku 성공/실패 로그를 `process.stderr.write` 기반으로 강화하고, 실패 시 stack + `ANTHROPIC_API_KEY` 존재 여부/길이 출력.
- verify(report1): 모델 ID `claude-haiku-4-5-20251001` 사용 확인, `@anthropic-ai/sdk` 버전 `^0.88.0` 확인, `npx tsc --noEmit` 통과.

## [Unreleased] - 2026-04-16 18:17:22 (fix(phase2-report): block2/5 필수 문구 하드보강 + Haiku 진단 로그 강화)

### Changed
- fix(phase2-llm): `phase2_system_context.ts`에 block2 강제 문구(FTA 0%·ITBMS 0%·약국 33%·도매 23~25%)와 block5 강제 문구(3단계 마진 전략 현재 단계·2단계 진입 중) 규칙을 명시적으로 추가.
- fix(phase2-fallback): `phase2_fallback_template.ts` block2/5를 하드코드 강화해 Haiku 실패 시에도 결함 3건이 재발하지 않도록 수정.
- fix(phase2-fallback): block2·block5 최소 길이 기준을 80자로 상향(스키마 maxLength는 기존 300 유지).
- fix(phase2-generator): `phase2_generator.ts`에 Haiku 경로(`claude-haiku-4-5-20251001`) 추가 및 Opus/Sonnet/Haiku 실패 사유를 `process.stderr.write`로 출력하도록 강화.
- verify(db): phase2 캐시 삭제 후 Rosumeg 민간 24.50 시나리오 재생성, 최신 row에서 `block2`/`block5` 필수 문구 포함 확인.

## [Unreleased] - 2026-04-16 16:38:46 (feat(phase2): 보고서 생성 LLM 4종 + generate-report API + 5블록 렌더)

### Changed
- feat(phase2-llm): `src/llm/phase2/` 4종 추가
  - `phase2_schema.ts`: 5블록 Tool Use 스키마/런타임 파서(maxLength 150/300/450/200/300)
  - `phase2_system_context.ts`: Logic A/B 강제, FTA 0%·ITBMS 0%, Rosumeg·Omethyl 우선 규칙
  - `phase2_fallback_template.ts`: 계산 결과만으로 5블록 완성되는 독립 폴백 템플릿
  - `phase2_generator.ts`: Opus → Sonnet → fallback 3단 체인 + 12h 캐시 저장
- feat(phase2-api): `app/api/panama/phase2/generate-report/route.ts` 신규 추가. 계산 결과 입력을 받아 2공정 자연어 5블록 보고서 생성.
- feat(phase2-ui): `components/phase2/Phase2ManualInput.tsx`에 제품 선택(Rosumeg/Omethyl) + `2공정 보고서 생성` 버튼 + 생성된 5블록 렌더 섹션 추가.
- note(cache): `panama_report_cache` 스키마 변경 없이 `report_payload.market_segment='phase2_report'` 메타로 2공정 캐시를 분리했고, 1공정 캐시 충돌 방지를 위해 `product_id+market` 기반 합성 UUID 키를 사용.
- verify: `npx tsc --noEmit` 통과, linter 오류 0건, `npx tsx` 스모크에서 `source=fallback` 및 5블록 생성 확인.

## [Unreleased] - 2026-04-16 16:26:58 (feat(phase2): 2공정 FOB 역산 코어 + UI 뼈대 이식 1차)

### Changed
- feat(phase2-ui): `app/process-2/page.tsx`를 준비중 화면에서 `Phase2Workbench` 기반 실제 2공정 화면으로 교체하고, 별도 진입점 `app/phase2/page.tsx` 추가.
- feat(phase2-ui): `components/phase2/*` 신규 추가 (`Phase2TabSelector`, `Phase2AiPipeline`, `Phase2ManualInput`, `Phase2MarketSegment`, `Phase2ProgressSteps`, `Phase2ScenarioCards`, `Phase2FormulaBlock`, `Phase2FinalPriceBlock`, `Phase2UploadArea`, `report_selector/Phase2ReportSelector`, `Phase2Workbench`).
- feat(phase2-logic): `src/logic/phase2/*` 신규 추가 (`margin_policy_resolver`, `fob_back_calculator`, `price_scenario_generator`, `incoterms_forward_calculator`)로 공공/민간 분기 + 공격/기준/보수 3시나리오 계산 뼈대 구현.
- feat(phase2-api): `app/api/panama/phase2/calculate/route.ts` 신규 추가(FOB 역산 실행), `report/route.ts` 신규 추가(기존 `panama_report_cache` 목록 조회), `extract-from-pdf/route.ts` 신규 추가(텍스트 기반 가격 후보 추출 스텁).
- verify: `npx tsc --noEmit` 통과, 신규 파일 범위 linter 오류 0건.

## [Unreleased] - 2026-04-17 (db(regulatory): 세션 22 WLA 확증실패 격하 + Ley419/Decreto27 공식 INSERT)

### Changed
- feat(db): `panama_ingredient_eligibility` UPDATE 4건 (Hydroxyurea·Gadobutrol·Mosapride·Omega-3-acid ethyl esters), 4채널 교차검증 메타 기준으로 `evidence_notes.session=22` 박제.
- feat(db): `panama` 테이블 `regulatory_milestone` 2행 격하.
  - `f0d4b694-b6f1-4d9e-b9be-8249189379d7`(`dnfd_procedure_meta`): `pa_notes` JSONB 내 `session_22_verification` 키 추가, `confidence=0.30`
  - `9424d349-3b0d-41e0-a463-03620cdfe254`(`minsa_official`): `pa_notes` 접두어 추가, `confidence=0.30`, `pa_freshness_status='gemini_only_not_displayable'`
- feat(db): `panama` 테이블 `gaceta_oficial_direct` 2행 신규 INSERT.
  - Ley 419 de 2024 (Gaceta 29962-A)
  - Decreto 27 de 2024 (Gaceta 30028-C, 836조)
- ops(db): `panama_report_cache` 전체 삭제로 격하/신규 규제 정보 반영 강제.
- verify(db): `evidence_notes->>'session'='22'` 4행, `regulatory_milestone` 5행(기존 3행 + 신규 2행) 확인.

## [Unreleased] - 2026-04-16 15:52:04 (style(ui): 우측 상단 국가 라벨에 파나마 국기 아이콘 고정 렌더링)

### Changed
- style(ui): `components/dashboard/Topbar.tsx` 국가 배지의 이모지 국기 텍스트를 SVG 아이콘 이미지(`public/images/flags/panama_round.svg`)로 교체해 OS/폰트 의존 없이 항상 동일하게 보이도록 수정.
- assets(ui): `public/images/flags/panama_round.svg` 추가(원형 크롭 형태 파나마 국기).

## [Unreleased] - 2026-04-16 15:00:27 (ops(session22): T6·T7 재실행 + Ley419 로컬 경로 폴백 지원)

### Changed
- feat(ops): `scripts/runners/fetch_ley_419_2024.ts`에 `LEY419_PDF_PATH` 우선 로딩 로직 추가. 없을 때만 `LEY419_PDF_URL` 다운로드를 시도하도록 분기하고, 실패 사유를 `data/raw/minsa_laws/ley_419_2024_error.txt`에 기록.
- feat(ops): `scripts/runners/crawl_kotra_panama_wla.ts` URL 목록을 세션22 재지시안 기준으로 교체(`pRptNo=14109`, `dataIdx=226530`)하고, DB 조회 결과(`https://dream.kotra.or.kr/`, `https://www.kotra.or.kr/bigdata/visualization/country/PA`)를 추가.
- run(ops): T7 옵션 A 실행(`LEY419_PDF_URL=https://www.gacetaoficial.gob.pa/pdfTemp/29966-A.pdf`) 결과 비 PDF 응답으로 실패.
- run(ops): T7 옵션 B 실행(`LEY419_PDF_PATH=data/raw/minsa_laws/ley_419_2024.pdf`) 결과 로컬 파일 미존재(ENOENT)로 실패.
- run(ops): T6 재실행 완료, `data/raw/kotra_panama/wla_evidence.json` 갱신(4 URL 처리, 일부 URL은 리다이렉션/500 안내 페이지 수집).

## [Unreleased] - 2026-04-17 (feat(ops): 세션22 1차 출처 확증 파이프라인 — 가이드·Jina·VTEX·Ley419)

### Changed
- docs(runners): `guide_dnfd_manual_check_gadobutrol.md` / `mosapride.md` / `omega3.md` — consultamedicamentos 수동 조회 절차·JSON 스키마(0건=high 사실 박제).
- data(raw): `data/raw/panama_consulta/*_manual.json`·template 정렬(omega3 `inn`= `omega_3_acid_ethyl_esters`).
- feat(ops): `crawl_bayer_panama.ts` — `readWithJina`(`jina_minsa_shared`)로 Bayer·radiologyinfo 텍스트 수집 → `data/raw/bayer_panama/gadobutrol_evidence.json`.
- feat(ops): `crawl_kotra_panama_wla.ts` — KOTRA URL 2건, `korea_wla_designation_mentions` → `data/raw/kotra_panama/wla_evidence.json`(일부 URL Jina 422 시 error 필드).
- feat(ops): `fetch_ley_419_2024.ts` — `PDFParse`로 본문·`ley_419_2024_keyword_hits.json`(기본 Gaceta URL 비 PDF 시 `ley_419_2024_error.txt` + 중단).
- feat(ops): `pa_superxtra_round2.ts` — VTEX 검색만, 최대 50 SKU → `data/raw/panama_superxtra/round2_gemini_verified.json`.
- chore(runners): `jina_minsa_shared.ts`에 `readWithJina` 별칭 export(`fetchViaJina` 동일).
- verify: T7 기본 PDF URL HTML 응답(비 PDF). T6 URL 1건 Jina 422. T4·T5 실행 완료.

## [Unreleased] - 2026-04-17 (feat(ops): Gemini 단독 근거 1차 출처 재검증 스크립트 + 채널 fetch)

### Changed
- feat(ops): `scripts/runners/verify_gemini_claims.ts` 추가. KOTRA·Gaceta·PanamaCompra·MINSA·MFDS·KPBMA 등 다중 채널 Jina fetch → 키워드 매칭 → `data/raw/verify_gemini/_verification_results.json` 저장.
- feat(ops): 매칭 시 `evidence_notes.gemini_claim_verification` 병합, 성분·지정 제품은 `match_total>0`일 때만 `primary_source_strength=high`·`report_displayable=true` 승격; `wla_korea_fast` 전 제품에는 WLA 클레임 매칭 시 `wla_verification_hint`만 추가.
- run(ops): 재검증 SQL 대상 4건(Gadobutrol, Mosapride, Gadvoa Inj., Gastiin CR). Gadobutrol/Mosapride 채널 키워드 0건 → 승격 없음. WLA 클레임 다수 매칭(일부 UI 푸터 등 노이즈 가능) → 수동 문맥 확인 권장.

## [Unreleased] - 2026-04-17 (chore(repo): 중첩 `United_Panama` 폴더 정리)

### Changed
- ops: 루트 하위에 잘못 생성된 `United_Panama/` 중첩 폴더 삭제(중복 복제본 제거).
- chore(git): `.gitignore`에 `United_Panama/` 추가로 동일 실수 재발 방지.

## [Unreleased] - 2026-04-17 (feat(report1): nombre_comercial 보고서 노출 + Gemini 추론 1차출처 분리 플래그 + WLA 출처 추출)

### Changed
- ops: `extract_wla_from_dnfd.ts` / `panamacompra_v3_additional_search.ts` 재실행. WLA 키워드 0건, `_wla_evidence.json` 갱신.
- ops: B-3 `evidence_notes` 플래그 SQL 재적용, `panama_report_cache` 전체 삭제, 성분·제품 단위 SELECT로 `requires_primary_source` / `report_displayable` 검증.

## [Unreleased] - 2026-04-16 (feat(dashboard): 메인 뉴스·체크리스트 위치 교체 + Perplexity 파나마 뉴스)

### Changed
- feat(ui): `app/page.tsx`에서 `MarketNewsCard`를 `ProgressChecklistCard` 앞열(중앙 컬럼)로 이동해 뉴스·Todolist 위치 교체.
- feat(api): `app/api/panama/dashboard-news/route.ts` GET 추가. `src/logic/fetch_panama_dashboard_news.ts`에서 Perplexity `sonar`로 파나마 의약·MINSA·DNFD·조달 관련 헤드라인 JSON 파싱.
- feat(ui): `components/dashboard/main/MarketNewsCard.tsx`를 클라이언트 컴포넌트로 전환, 로드·새로고침·경고 표시.
- chore(env): `.env.example`에 `PERPLEXITY_API_KEY` 안내 추가.

## [Unreleased] - 2026-04-16 15:45:00 (feat(report1): nombre_comercial 보고서 노출 + Gemini 추론 1차출처 분리 플래그 + WLA 출처 추출)

### Changed
- feat(ops): `scripts/runners/extract_wla_from_dnfd.ts` 추가. Jina 원문(`data/raw/jina_minsa` 3파일)에서 WLA·패스트트랙 키워드 스캔 후 `data/raw/jina_minsa/_wla_evidence.json` 저장.
- feat(ops): `scripts/runners/panamacompra_v3_additional_search.ts` 추가. Gadvoa/Gastiin/Omethyl PanamaCompra V3 수동 검색 가이드 콘솔 출력.
- feat(db): `panama_ingredient_eligibility`·`panama_product_registration`의 `evidence_notes`에 `requires_primary_source` / `report_displayable` / `display_note`(해당 시) 병합 업데이트(Gadobutrol, Mosapride, Omega-3, Gadvoa, Gastiin, Omethyl).
- ops: `panama_report_cache` 전체 삭제로 리포트 재생성 유도.
- run(ops): WLA 키워드 매칭 0건(정적 Jina 텍스트 내 해당 문구 없음). 추가 검색 가이드 스크립트 출력 확인.
- fix(script): `panamacompra_v3_additional_search.ts`·`verify_report1_v3_meta.ts`에 `export {}` 추가로 전역 `main` 중복(TS2393) 제거.

## [Unreleased] - 2026-04-16 14:30:00 (feat(registration): 자사 8제품 파나마 등록 가능성 DB 적재 (PanamaCompra V3 + Gemini 조사 기반))

### Changed
- feat(db): Supabase 마이그레이션 `panama_registration_tables_round7` 적용. `panama_ingredient_eligibility`(INN 차원), `panama_product_registration`(자사 제품 차원) 테이블 및 인덱스 생성. 동일 내용 SQL 사본: `sql/panama_registration_tables_round7.sql`.
- feat(seed): `data/seed/panama/round7_registration_eligibility.json` 추가. 성분 9건 + 자사 제품 8건, 근거 출처 강도(`primary_source_strength` 등)를 `evidence_notes` JSONB에 박제.
- feat(ops): `scripts/runners/insert_panama_registration.ts` 추가. 시드 JSON을 읽어 `inn` / `product_id` 기준 upsert.
- verify: `npx tsx scripts/runners/insert_panama_registration.ts` 성공(성분 9, 제품 8). SQL 검증 쿼리 2종으로 행·우선순위·카테고리 확인.

## [Unreleased] - 2026-04-16 00:25:28 (feat(registration): Jina Reader 우회 MINSA 데이터 수집 파이프라인 + DB 적재)

### Changed
- feat(crawl): `scripts/runners/jina_minsa_shared.ts` 공통 유틸(타깃 URL, Jina fetch, 출력 경로, 키워드, 8개 INN 목록) 추가.
- feat(crawl): `scripts/runners/jina_minsa_phase1.ts`~`jina_minsa_phase5.ts` 신규 추가. 수집→URL 식별→8개 INN 조회→등록번호 추출→DB upsert 단계 자동화.
- feat(crawl): `scripts/runners/jina_minsa_full_pipeline.ts` 신규 추가. Phase 1~5를 순차 실행하고 통합 요약 JSON(`_full_pipeline_summary.json`) 생성.
- fix(crawl): Phase 모듈 import 시 `main()`이 중복 실행되던 사이드이펙트를 엔트리 가드로 제거.
- run(crawl): 실제 파이프라인 실행 결과 `phase1 3/4 성공`, `phase3 8/8 성공`, `phase4 등록번호 0건`, `phase5 upsert 0건(대상 테이블 미존재)` 확인.

## [Unreleased] - 2026-04-16 00:25:28 (feat(crawl): Playwright MINSA consulta API 캡처 (시간 제한 30분))

### Changed
- feat(crawl): `scripts/runners/playwright_minsa_consulta.ts` 신규 추가. headful 접속, input/button 탐색, 검색 시도, XHR/fetch·JSON 응답 캡처 및 HTML/PNG/JSON 저장.
- run(crawl): `consultamedicamentos.minsa.gob.pa` 접속 시 `networkidle` 대기 타임아웃 발생(봇 차단 문구는 미확인), 대신 `_blazor` 협상/회선 요청 엔드포인트 캡처 성공.
- fallback(crawl): robots 확인 결과 `consultamedicamentos.minsa.gob.pa/robots.txt`는 404, `dnfd.minsa.gob.pa/robots.txt`는 200 응답 확인.

## [Unreleased] - 2026-04-15 21:54:31 (feat(report1): 파나마 진출 가능성 자동 판정 로직 및 4-5 블록 연동)

### Changed
- feat(llm-logic): `src/llm/logic/panama_entry_feasibility.ts` 신규 추가. `panama_product_registration`/`panama_ingredient_eligibility` 기반 A~F 자동 판정 + 보고서용 텍스트 변환 유틸 구현.
- fix(api): `app/api/panama/analyze/route.ts`에서 자동 판정(`entryFeasibility`, `entryFeasibilityText`)을 계산해 LLM 입력과 API 응답에 포함.
- fix(api): `app/api/panama/pdf/route.ts`도 동일 자동 판정 필드를 생성/파싱하여 PDF 경로와 웹 경로의 본문 생성 입력을 일치시킴.
- feat(llm): `src/llm/report1_generator.ts` `GeneratorInput` 확장 및 프롬프트에 `[진출 가능성 자동 판정 - 블록 4-5]` 섹션 추가.
- feat(schema): `src/llm/report1_schema.ts`에 `block4_5_entry_feasibility` 필드(스키마/required/파서/시스템 프롬프트 규칙) 추가.
- feat(fallback): `src/llm/report1_fallback_template.ts` `FallbackInput` 확장 및 `block4_5_entry_feasibility` 생성 로직 추가.
- feat(ui): `components/Report1.tsx`, `lib/pdf/Report1Document.tsx`에 4-5 진출 가능성 표시 영역 추가.
- ops: `panama_report_cache` 전체 삭제 수행.
- verify: `npx tsc --noEmit` 통과, Rosumeg 로컬 스모크 테스트에서 `block4_5_entry_feasibility` 노출 확인(LLM timeout 시 폴백 본문 포함 확인).

## [Unreleased] - 2026-04-15 21:19:25 (fix(report1): PanamaCompra V3 경쟁사 제품명(nombre_comercial) 본문 노출 추가)

### Changed
- fix(api): `app/api/panama/analyze/route.ts`의 PanamaCompra V3 대표 메타 추출에 `pa_product_name_local` 기반 `nombreComercial`과 낙찰 건수 `count`를 추가.
- fix(api): `app/api/panama/pdf/route.ts`에도 동일한 `nombreComercial`/`count` 추출 로직을 반영해 PDF 생성 경로와 웹 분석 경로의 메타 일관성 확보.
- fix(llm): `src/llm/report1_generator.ts`의 `GeneratorInput.panamacompraV3Top` 타입을 확장하고, V3 메타 라인에 `nombre_comercial`을 포함해 프롬프트 근거 강화.
- fix(llm): `src/llm/report1_fallback_template.ts`의 `FallbackInput` 타입을 확장하고 가격 문구에 경쟁사 제품명 + 건수 + 유통사 연결 문장을 반영.
- chore(prompt): `src/llm/report1_schema.ts`의 pa_notes 메타정보 활용 규칙에 `nombre_comercial` 항목을 추가.
- verify: `npx tsc --noEmit` 통과.

## [Unreleased] - 2026-04-15 21:11:44 (fix(front): PDF 한글 깨짐 완화 + 체크리스트 Enter 중복 생성 방지)

### Changed
- fix(pdf): `public/fonts/NotoSansCJKkr-Regular.otf`, `public/fonts/NotoSansCJKkr-Bold.otf` 추가로 PDF 한글 글리프 폰트 자산을 프로젝트에 포함.
- fix(pdf): `lib/pdf/pdf-fonts.ts`에서 `NotoSansKR` 폰트 패밀리를 조건부 등록하도록 확장.
- fix(pdf): `lib/pdf/pdf-styles.ts` 기본 `fontFamily`를 `NotoSansKR`로 전환하고 line-height를 `1.55`로 상향해 한글 겹침 현상 완화.
- fix(front): `components/dashboard/main/ProgressChecklistCard.tsx` Enter 입력 시 `isComposing`/`repeat` 가드 + 짧은 시간 중복 시그니처 차단 로직을 추가해 항목 2개 생성 이슈 방지.
- verify: `npx tsc --noEmit` 통과, 백엔드 무손상(`app/api`, `src/llm` 변경 없음) 재확인.

## [Unreleased] - 2026-04-15 20:20:00 (style(front): 표본2 기준 1공정 선택/입력 폼 타이포·박스 정밀 보정)

### Changed
- style(front): `components/dashboard/process1/Process1Workbench.tsx`의 제품 선택 select와 신약 분석 입력 3종을 `38px` 높이, `8px` 라운드, 얇은 라인(border) 기반으로 재정렬.
- style(front): 입력/선택 텍스트를 `11.5px` 중심으로 통일하고 placeholder 명도(`#8a95a8`)를 조정해 표본2 대비 옅음 이슈 완화.
- style(front): 액션 버튼(`진출 적합 분석`/`신약 분석`)의 높이·패딩·폰트 크기를 폼 컨트롤과 동일 리듬으로 축소 정렬.
- style(front): 진행 스텝 숫자·라벨을 한 단계 축소(`10px`)해 표본2의 밀도감에 맞춤.
- verify: `npx tsc --noEmit` 통과, 백엔드 무손상(`app/api`, `src/llm` 변경 없음) 재확인.

## [Unreleased] - 2026-04-15 19:55:17 (chore(front): 1페이지 체크리스트 입력 placeholder 문구 수정)

### Changed
- chore(front): `components/dashboard/main/ProgressChecklistCard.tsx` 입력 placeholder를 `항목 추가 후 Enter…`에서 `기타 업무 추가 입력란`으로 변경.

## [Unreleased] - 2026-04-15 19:52:54 (style(front): 1공정 입력 UI 명도/폰트 통일 + 신약 분석 버튼 활성화)

### Changed
- style(front): `components/dashboard/process1/Process1Workbench.tsx`의 1공정 select/input 타이포(13px, semibold/medium)와 배경/그림자 톤을 표본 화면에 맞춰 통일.
- fix(front): 신약 분석 영역 입력칸 3개를 활성화(입력 가능)하고 버튼도 클릭 가능 상태로 전환.
- fix(front): 신약 분석 버튼 클릭 시 최소 입력 검증 및 사용자 안내(alert) 동작 추가로 "클릭 불가" 체감 이슈 해소.
- verify: `npx tsc --noEmit` 통과, 백엔드 무손상(`app/api`, `src/llm` 변경 없음) 재확인.

## [Unreleased] - 2026-04-15 19:42:28 (fix(front): 1공정 분석 버튼 반복 실행 안정화 + 보고서 탭 자동 동기화)

### Changed
- fix(front): `components/dashboard/process1/Process1Workbench.tsx`에서 `진출 적합 분석` 클릭 시 `analysisNonce` 기반 key 재마운트로 매 클릭마다 분석이 확실히 재실행되도록 보강.
- fix(front): 동일 컴포넌트에서 분석 시작 시 보고서 출력 영역으로 자동 스크롤되도록 `scrollIntoView` 동선 추가.
- fix(front): `components/dashboard/reports/GeneratedReportsList.tsx`에 `storage`/`focus` 이벤트 동기화 추가로 보고서 탭 재진입 시 최신 localStorage 목록 즉시 반영.
- verify: `npx tsc --noEmit` 통과, 백엔드 무손상(`app/api`, `src/llm` 변경 없음) 재확인.

## [Unreleased] - 2026-04-15 19:40:49 (chore(front): process1 임베드 보고서의 INN 탭 숨김)

### Changed
- chore(front): `components/PanamaReportClient.tsx`에 `showInnTabs` 옵션 추가(기본 true).
- chore(front): `components/dashboard/process1/Process1Workbench.tsx`에서 임베드 호출 시 `showInnTabs={false}` 적용해 1공정 분석 흐름을 "목록 선택 → 진출 적합 분석 버튼" 단일 동선으로 고정.
- verify: `npx tsc --noEmit` 통과, 백엔드 무손상(`app/api`, `src/llm` 변경 없음).

## [Unreleased] - 2026-04-15 19:37:07 (feat(dashboard): 분석 완료 보고서 목록 자동 적재 연결)

### Changed
- feat(front): `src/lib/dashboard/reports_store.ts`에 `upsertStoredReport` 추가 — 동일 productId 중복을 제거하고 최신 보고서를 맨 앞에 유지.
- feat(front): `components/PanamaReportClient.tsx`에서 분석 성공 시(`data+llm` 확보) `pa_upharma_reports_v1`에 보고서 메타를 자동 저장해 `/reports` 탭 목록이 실제 데이터로 채워지도록 연결.
- verify: 백엔드 무손상 재확인(`git diff --stat app/api src/llm` 결과 비어 있음), `npx tsc --noEmit` 통과.

## [Unreleased] - 2026-04-15 19:33:34 (feat(dashboard): process1 분석 버튼→A4 보고서 하단 도출 흐름 복원)

### Changed
- feat(front): `components/dashboard/process1/Process1Workbench.tsx` 신규 추가 — 제품 선택 + `진출 적합 분석` 버튼 클릭 시 기존 `PanamaReportClient`를 신약분석 카드 하단에 렌더링하도록 배치.
- feat(front): `app/process-1/page.tsx`를 워크벤치 단일 구성으로 교체해 보고서 노출 위치를 요청 UI 흐름(신약분석 검색창 하단)과 일치시킴.
- feat(front): `components/PanamaReportClient.tsx`에 `showBackLink` 옵션 추가(기본 true)하여 대시보드 임베드 시 불필요한 상단 복귀 링크를 숨길 수 있도록 개선.
- feat(asset): 첨부 로고 파일을 `public/images/logo.png`로 반영하고 `components/dashboard/Topbar.tsx`에서 실제 이미지 렌더링으로 전환.

## [Unreleased] - 2026-04-15 19:27:58 (feat(dashboard): integrate SG-prototype design for PA frontend-only phase1-2)

### Changed
- feat(dashboard): `tailwind.config.ts`에 PA 대시보드 디자인 토큰(colors/shadows/fontFamily.pretendard) 추가.
- feat(dashboard): `components/dashboard/` 공통 UI 추가(`DashboardShell`, `Topbar`, `TabNavigation`, `shared/Card`, `shared/EmptyPage`).
- feat(dashboard): 메인 프리뷰 카드 추가(`TariffExchangeCard`, `ProgressChecklistCard`, `MarketNewsCard`) 및 `/` 경로를 대시보드 홈으로 전환.
- feat(dashboard): 5탭 라우트 골격 추가(`/process-1`, `/process-2`, `/process-3`, `/reports`) 및 process2/3 준비중 페이지 구성.
- feat(dashboard): `src/lib/dashboard/` 로컬 상태 저장 유틸 추가(`todo_store.ts`, `reports_store.ts`, `product_dictionary.ts`)로 `pa_*` 키 규칙 적용.
- note(asset): `newfrontend`에 실제 `logo.png` 대신 `._logo.png`만 존재해 임시 브랜드 마크를 적용(추후 로고 원본 수신 시 `/public/images/logo.png` 치환 예정).

## [Unreleased] - 2026-04-15 18:24:17 (fix(report1): panamacompraV3Top 전달 추적 로그 + PDF 경로 누락 전달 복구)

### Changed
- fix(debug): `app/api/panama/analyze/route.ts`에 `DEBUG_REPORT1_V3=1` 조건부 로그 추가 (`panamacompraV3Top`, `generatorInput.panamacompraV3Top`)로 데이터 흐름 추적 가능하게 보강.
- fix(debug): `src/llm/report1_generator.ts`에 `fallbackInput.panamacompraV3Top` 조건부 로그 추가.
- fix(debug): `src/llm/report1_fallback_template.ts`에 폴백 분기 판단 로그(`panamacompraStats null 여부`, `panamacompraV3Top null 여부`) 추가.
- fix(api): `app/api/panama/pdf/route.ts`가 `generateReport1` 호출 시 `panamacompraV3Top`을 누락하던 경로를 복구하고, analyze 경로와 동일한 V3 상위 메타 계산을 추가해 PDF/폴백 경로 일관성 확보.
- test(verify): `scripts/runners/verify_report1_v3_meta.ts`를 로컬(`http://localhost:3030`)과 실서비스(`https://united-panama.vercel.app`)에 각각 실행해 응답 차이 확인.

## [Unreleased] - 2026-04-15 18:13:23 (chore(llm): 공공조달 가격 패턴 문구 사용자 지정안 반영)

### Changed
- chore(llm): `src/llm/system_context_panama.ts` 6번 항목 마지막 불릿을 사용자 지정 문구로 교체: `INDIA 제네릭 vs ESPAÑA 제네릭 가격 차 미미 (10% 이하), ORIGINAL (Servier/GSK) 30~40% 프리미엄`.

## [Unreleased] - 2026-04-15 18:12:06 (fix(llm): system context 문자열 종료 복구 후 재푸시)

### Changed
- fix(llm): `src/llm/system_context_panama.ts` 말미가 `- I`에서 끊겨 템플릿 문자열이 닫히지 않던 상태를 복구하고, 공공조달 가격 패턴 마지막 문장을 완결형으로 정리.
- chore(git): 미커밋 변경 원인 파일을 단독 커밋 대상으로 정리하여 원격 푸시 가능 상태로 전환.

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