# 파나마 1공정 크롤러 — 아키텍처 명세

> KITA 무역AX 1기 · 한국유나이티드제약 5조 · 김예환
> Tech Stack: Next.js · TypeScript · Playwright · Supabase · GitHub Actions
> **세션 23 / 2026-04-16 갱신** — 중간안 D-1 환율 런타임 복원 + D-2 GitHub Actions 조건부 크롤러 도입, 보고서 생성 전체 로직 박제, 신 8제품 반영 (세션 19), Rx/OTC 분리 원칙 추가

---

## ⭐ 보고서 생성 전체 로직 (필독 — 모든 개발 참여자 숙지 필수)

> 세션 23 신규 박제. Claude·Cursor·Gemini·달강님 모두 작업 착수 전 반드시 이 표를 확인.

```
[사전 단계] 🟦 GitHub Actions 크롤링 (달강님 수동 workflow_dispatch로 주 1회 트리거)

  ├─ [1] 신선도 stale 항목 DB 조회 (v_stale_items VIEW)  ✅ D-2 신규
  │       └─ pa_freshness_status = 'stale_likely' 또는 'stale_confirmed'인 행만 선별
  │           (freshness_registry 기반 시간 규칙 + Haiku 의미 판정 결과)
  │
  ├─ [2] stale 항목만 크롤러 선별 실행 (API/정적 크롤링 자동화)
  │       │
  │       ├─ Colombia SECOP Socrata API (pa_source = 'datos_gov_co')
  │       │    └─ 가져오는 정보: 콜롬비아 정부 공공조달 "도매가" (wholesale)
  │       │        · 데이터: INN · 제조사 · 가격(COP→USD 환산) · 수량 · 조달 기관 · 일자
  │       │        · 용도: 파나마 직접 데이터 없는 INN의 WHO ERP 대체 참조가
  │       │        · 출처: datos.gov.co (Socrata Open Data API, 무료)
  │       │        · 현재 누적: 109건
  │       │
  │       ├─ SuperXtra VTEX 정적 크롤링 (pa_source = 'superxtra_vtex')
  │       │    └─ 가져오는 정보: 파나마 민간 약국 "소매가" (retail_promo)
  │       │        · 데이터: 브랜드명 · 정가(list_price) · 할인가(discount_price) · 재고 상태
  │       │        · 용도: 파나마 환자 실제 구매 가격 (처방 후 민간 약국 구매)
  │       │        · 출처: superxtra.com 제품 상세 페이지 (VTEX 플랫폼)
  │       │        · 현재 누적: 15건
  │       │
  │       └─ ACODECO CABAMED XLSX 다운로드 (pa_source = 'acodeco_cabamed_competitor')
  │            └─ 가져오는 정보: 파나마 약국 의무공시 "평균가" (retail_average_published)
  │                · 데이터: 제품명 · 성분 · 평균가 · 판매단위 · 공시월
  │                · 법적 근거: Resolución 774 (2019) 약국 평균가 의무 공시
  │                · 용도: 자사 개량신약 가격 책정의 핵심 기준선
  │                · 출처: acodeco.gob.pa CABAMED 161종 기초의약품 바스켓
  │                · 현재 누적: 3건
  │
  ├─ [3] Supabase UPSERT + pa_freshness_status = 'fresh' 갱신
  │       └─ 크롤러 성공 시 해당 행의 신선도를 'fresh'로 되돌림
  │           다음 트리거 때 건너뛸 수 있도록 상태 마킹
  │
  └─ PanamaCompra V3 수동 수집 (pa_source = 'panamacompra_v3', 기존 유지)
         └─ 가져오는 정보: 파나마 정부 공공조달 "낙찰가" (public_procurement)
             · 데이터: 제품명 · 제조사(fabricante) · 유통사(proveedor) · 낙찰가
             ·       수량 · 발주기관(entidad_compradora) · 발주일 · 사건번호
             · 수집 방식: 봇 차단으로 자동화 불가 →
                (1) 달강님이 PanamaCompra V3 사이트 수동 접속 + 키워드 검색 (예: "Rosuvastatina")
                (2) 낙찰 공고 PDF 수동 다운로드
                (3) 별도 Claude 세션에 PDF 업로드 → LLM이 JSON 구조화 추출
                (4) 달강님이 정형화된 JSON을 Supabase 수동 INSERT
             · 법적 근거: Ley 419 de 2024 (DGCP 운영)
             · 현재 누적: 16건 (Rosumeg 5건 + Hydrine 3건 + Ciloduo 3건 + Atmeg 2건 + Sereterol 3건)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[런타임] 🟧 POST /api/panama/analyze (사용자 분석 버튼 클릭 시, 20초 목표)

[1] Supabase DB 조회 (L1 시드 + L2 크롤링 누적 = 80%)
     └─ panama 테이블 전수 조회 (현재 175행)
         · L1 시드 ~25행: gemini_prevalence, worldbank, kotra, ita, motie, who_paho
         · L2 크롤링 ~148행: datos_gov_co 109, superxtra_vtex 15, panamacompra_v3 16, acodeco 3
         · product_id 또는 MACRO_PRODUCT_ID 매칭 후 priceRows/macroRows 분리

[2] 환율 EXIM API 런타임 호출 (L3 5%, 실시간)  ✅ D-1 복원
     └─ 한국수출입은행 API로 USD/KRW 환율 실시간 조회
         · 성공: pa_notes.source = "api_success"
         · 실패: pa_notes.source = "db_fallback" (안전망)
         · 용도: 한국 원가를 USD로 환산하여 FOB 산정 기반 확보

[3] 신선도 판정 (Haiku Judge, 5%)
     └─ Phase 1 시간 규칙 (freshness_registry 20종 등록)
         └─ Phase 1.5 Haiku LLM 의미 기반 판정 (fresh/stale_likely/stale_confirmed)
             └─ Phase 2 web_search (stale_confirmed 시만 트리거, 선택적)

[4] DB 신선도 상태 갱신 (pa_freshness_status 마킹)
     └─ Haiku 판정 결과를 DB에 즉시 반영
         · 다음 GitHub Actions 실행 시 자동으로 재크롤링 대상에 포함됨
         · 런타임 → 크롤링 루프를 연결하는 "가교" 역할

[5] Case 판정 + entryFeasibility (규칙 기반, 10%)
     └─ 8가지 진출 가능성 등급 (A_fast_track ~ D_long_term)
         · 성분별 distributable 여부 + 시장 발달 정도로 판정
         · 예: Rosumeg = D_long_term (성분 유통 가능, 조합제 신규 등록 필요)

[6] 프롬프트 조립 (rawDataDigest + 제품 dictionary)
     └─ Haiku에게 넘길 전체 컨텍스트 구성
         · 파나마 거시 지표 + 경쟁품 가격 Tier 1~3 + 규제 근거 + 제품 스펙

[7] Haiku API 호출 (보고서 5블록 합성)  🔴 현재 크레딧 문제로 fallback 중 (별건 이슈)
     └─ 3-tier LLM 체인: Opus → Sonnet → Haiku → rule-based template
         · block3_reasoning (150자/줄 5줄)
         · block4_1_channel (300자)
         · block4_2_pricing (450자)
         · block4_3_partners (200자)
         · block4_4_risks (300자)
         · block4_5_entry_feasibility

[8] panama_report_cache 저장 (24h TTL)
     └─ 동일 product_id 재분석 시 캐시 히트 → Haiku 재호출 스킵

[9] Response JSON → Report1.tsx A4 WYSIWYG 렌더링
     └─ 브라우저에서 /products/{product_id} 경로로 최종 렌더
```

### 🔄 신선도 가교 흐름 (핵심 아키텍처)

```
[런타임 분석] → Haiku가 "이 데이터 오래됐음" 판정
              ↓
        DB에 pa_freshness_status = 'stale_confirmed' 마킹
              ↓
[달강님 주 1회] GitHub Actions 수동 실행 (workflow_dispatch)
              ↓
        v_stale_items VIEW가 stale 항목 자동 선별
              ↓
        해당 항목만 Colombia/SuperXtra/ACODECO 재크롤링
              ↓
        DB 갱신 + pa_freshness_status = 'fresh'로 되돌림
```

**이 구조가 3가지 요구 조건을 모두 만족**:
- ✅ 크롤링 로직 반드시 포함 (GitHub Actions 크롤러)
- ✅ 신선도 다한 것만 선별 (v_stale_items VIEW)
- ✅ URL 핀포인팅 없이 작동 (기존 pa_source 기반 라우팅)

---

## 📌 세션 23 업데이트 (2026-04-16, D-8)

### 중간안 D-1 + D-2 도입

- **D-1 환율 런타임 복원**: `src/crawlers/realtime/exchange_rate_exim.ts` 로깅 강화 + try-catch 보강
  - 성공 시 `pa_notes.source = "api_success"` 표시
  - 실패 시 `db_fallback` 안전망 유지
  - Vercel Logs `[exchange_rate_exim]` 검색으로 SUCCESS/FAILED 추적
- **D-2 GitHub Actions 조건부 크롤러**:
  - `scripts/sql/v_stale_items.sql` VIEW 신규 생성
  - `scripts/runners/freshness_refresh_runner.ts` 러너 스크립트 신규
  - `.github/workflows/freshness_refresh.yml` 워크플로우 신규 (workflow_dispatch + dry_run 옵션)
  - `SUPABASE_KEY` 단일 인증 (RLS 비활성화 확인: `rowsecurity = false`)
- **2공정 완성**: Phase2 UI/API + LLM Generator + 3-tier 체인 (세션 23 전반부)

### 신 8제품 반영 (세션 19 박제 유지)

세션 19에서 product-dictionary.ts 전면 재구성. 기존 단순 INN 8종(Hydroxyurea, Cilostazol, Itopride, Aceclofenac, Rabeprazole, Erdosteine, Omega-3, Levodropropizine) → 복합제 포함 신 8제품으로 교체. UUID 8개 재사용.

| # | 한글 브랜드 | WHO INN | 파나마 우선 |
|---|---|---|---|
| 1 | Rosumeg Combigel ⭐ | Rosuvastatin + Omega-3-acid ethyl esters | YES |
| 2 | Atmeg Combigel | Atorvastatin + Omega-3-acid ethyl esters | |
| 3 | Ciloduo | Cilostazol + Rosuvastatin | |
| 4 | Gastiin CR | Mosapride citrate | |
| 5 | Omethyl Cutielet ⭐ | Omega-3-acid ethyl esters | YES |
| 6 | Sereterol Activair | Salmeterol + Fluticasone propionate | |
| 7 | Gadvoa Inj. | Gadobutrol | |
| 8 | Hydrine | Hydroxyurea | |

### Rx vs OTC 엄격 분리 원칙 (세션 23 신규)

유나이티드_8개제품_분석_v2.docx 라인 87 박제 원칙 반영.

| 구분 | Rx (처방약) | OTC (건강기능식품) |
|------|-----------|-----------------|
| 대표 성분 | Omega-3-acid ethyl esters 90 | 일반 오메가-3 |
| EPA+DHA 농도 | 90% 이상 | 30~60% |
| 형태 | Ethyl Ester (EE) | Triglyceride (TG) |
| ATC 코드 | C10AX06 부여 | 없음 |
| 대표 브랜드 | Omacor, Lovaza, Vascepa | Kirkland, GNC, Nordic |
| 가격 비교 | **유효 (서로만 비교)** | **비교 대상 제외** |

**원칙**: Rx Omega-3와 OTC Omega-3를 가격 비교 대상으로 혼용 절대 금지.

### Tier 매칭 전략 (세션 23 박제)

자사 조합제 경쟁품 매칭 시 3단계 위계:

- **Tier 1**: 동일 조합제 매칭 (예: Rosuvastatin + Omega-3 조합제). 파나마 공공조달 0건 확증 시 First-mover 기회 시그널.
- **Tier 2**: 단일성분 합산 벤치마크 (Rosuvastatin 단독 + Omega-3 단독 합산). WHO 2015 ERP 가이드라인 근거.
- **Tier 3**: ATC4 효능군 평균가 (예: C10AA HMG-CoA reductase inhibitors). 가장 견고한 가격 밴드.

현재 Rosumeg Response 실측: Tier 1 = 0건, Tier 2 = partial_rosuvastatin_only (5건), Tier 3 = 30건 (파나마 5건 + Colombia SECOP 25건).

### 3계층 데이터 수집 원칙 작동 상태 (세션 23 냉정 재점검)

| 계층 | 비중 | 출처 | 갱신 주기 | 현재 상태 |
|------|-----|------|----------|---------|
| L1 정적 시드 | ~85% | 수동 DB 박제 | 1년~immutable | ✅ 정상 |
| L2 크롤링 누적 | ~10% | GitHub Actions 자동화 | 월 1회 ~ 분기 1회 | 🟡 D-2 구축 중 |
| L3 실시간 | ~5% | 런타임 API 호출 | 매 분석 시 | 🟡 D-1 복원 중 |

### 파나마 사이트 구조적 접근 제약 재확인

- 🔴 PanamaCompra V3 → Playwright 봇 감지 차단 (자동화 포기, 수동 PDF만)
- 🔴 MINSA tramites → IP 국가 차단 (한국 VPN 접속 불가)
- 🔴 CSS → Cloudflare 차단 (522)
- 🔴 MINSA faddi → 연결 차단 (000)
- 🔴 consultamedicamentos → Blazor SPA 접근 불가

### 절대 원칙 신규 2개 (12번·13번)

- **12번**: 로컬 환경변수 오염은 Vercel 배포본에 영향 주지 않음 (로컬 vs Vercel 진단 시 분리 필수)
- **13번**: Rx vs OTC 카테고리 엄격 분리 (유나이티드_8개제품_분석_v2 라인 87 박제)

---

## 📌 세션 16 마무리 (2026-04-13)

### 핵심 성과 — 보고서 신뢰도 대폭 강화

세션 12~13 시점 외부 검수에서 발견된 4종 버그 + 1종 잘림 버그 모두 통과. 8 INN 전체 spot check 정상.

| # | 항목 | 결과 |
|---|---|---|
| 1 | 역학(Epidemiology) INN 교차오염 (H.pylori) | ✅ `report1_digest.ts` product_id 엄격 필터 |
| 2 | 유통 파트너 이름 중복 출력 (Haseth 3회 등) | ✅ `dedupeDistributorNames` + 시스템 프롬프트 룰 |
| 3 | PAHO 권역 단가 $0.188 누락 | ✅ `paho_reference_prices.ts` 주입 방식 |
| 4 | 보건지출 $1,547 → $1,557.81 | ✅ World Bank/WHO GHED 2023 통일 |
| 5 | prevalence 8 INN 신규 데이터 적재 (5건 파나마 실측 우위) | ✅ `gemini_prevalence` 신규 pa_source |
| 6 | 판정근거 1·5번 잘림 (100자 hard cap) | ✅ 항목별 차등 maxLength `[200,100,100,100,250]` |
| 7 | Aceclofenac scope=latam_average 각주 분리 | ✅ `splitAceclofenacPrevalenceForBlock3` + footer UI |

### prevalence 신규 데이터 (gemini_prevalence)

8 INN 전체 신규 적재. 5건 파나마 국가 실측 + 3건 동급 갱신.

| INN | 데이터 | 출처 | scope |
|---|---|---|---|
| Hydroxyurea | 백혈병 신규 발병률 10만당 4.3명 | GLOBOCAN 2022 Panama | panama |
| Cilostazol | PAD 유병률 4.44% | PMC peer-reviewed | panama |
| Itopride | FGID 28.7% | PMC 파나마 청소년 | panama |
| Aceclofenac | 골관절염 10.5% | PAHO GBD | **latam_average** |
| Rabeprazole | H.pylori 70~86% | Gorgas Memorial | panama |
| Erdosteine | COPD 4.4% | SciELO | panama |
| Omega-3 | 이상지질 35~40% | MINSA PREFREC | panama |
| Levodropropizine | 마른기침 56.7% | PMC 파나마 아동병원 | panama |

### Arrocha 정찰 결과 — 후퇴 결정

세션 17 1순위 후보였으나 라이브 정찰에서 후퇴 확정.

- ✅ Shopify 기반 (powered-by 헤더, x-shopid 등 확인)
- ✅ `/products.json` 200 + JSON 응답
- 🔴 **의약품 컬렉션 의도적 차단** (`/collections/medicamentos` HTML 200, JSON 빈 배열)
- 🔴 7,500건 페이징 샘플에서 의약 카테고리 0건
- 🔴 search/suggest 8 INN 0매칭 (unavailable_products=show 옵션 포함)

**판정**: 파나마 약사법 또는 Arrocha 자체 정책으로 의약품 비공개 처리. 우회는 로그인·지역 인증 등 비공개 경로 필요. Phase 2 로드맵 이월.

**발표 방어 신규 내러티브**: "Arrocha는 Shopify 기반이며 공개 API는 살아있으나, 의약품 컬렉션은 약사법 준수 차원에서 의도적으로 비공개 처리됨. 본 데모에서는 ACODECO CABAMED 153품목 공식 가격표를 1차 소스로 활용."

### Metro Plus — Shopify 가설 기각

WordPress/WooCommerce 기반. Shopify 패턴 미적용. 별도 전략 필요 (Phase 2 로드맵).

### DNFD 신규 발견 — 자사 제품 등록 여부 직접 확인 가능

파나마 보건부 산하 국립 약물·약품국(Dirección Nacional de Farmacia y Drogas).

- DNFD 공공 조회 포털 (`tramites-minsa.panamadigital.gob.pa`) — Playwright 폼 제출 필요
- DNFD 공식 사이트 (`dnfd.minsa.gob.pa`) — 정적 HTML, 규제 변경·경고 수집
- WLA 패스트트랙 5단계 절차 명문화 (한국 위생선진국 지정 활용)

세션 17 작업 큐 2~3순위로 진입.

---

## 📌 세션 13 업데이트 (2026-04-12)

### 거시 카드 정밀화
- 성장률: KOTRA 10% 제거 → IQVIA Sandoz 2024 YoY 3.4% 단일 표기 + scope footer
- 인구 파싱: `Most recent value. (2024)` 마침표 형식 정규식 매칭 추가
- 보건지출: `worldbank_who_ghed` 시드 행 분리

### 규제 마일스톤 시드
- `market_segment: regulatory_milestone` CHECK 제약 추가
- 「진출 호재」 카드 2건: MINSA fast-track 2023 + 약가 개혁 2024

---

## 📌 세션 12 업데이트 (2026-04-12)

- **PDF 다운로드**: Phase 2 로드맵 이월 (react-pdf v4.4.1 + 한글 폰트 5회 시도 실패)
- **LLM**: claude-haiku-4-5-20251001 (ANTHROPIC_API_KEY trim() 적용, Perplexity 논문 도출 제외)
- **시스템 프롬프트 금지어 14종**: "Phase 2", "크롤링", "WAF", "Residential Proxy", "실측", "보강 예정", "우리 시스템" 등
- **배포**: `united-panama.vercel.app`

---

## 👥 AI 역할 분담

- **Claude** — 설계·검수·문서화. 코드 직접 작성 금지 (크레딧 절약)
- **Gemini** — 사용자의 자료 수집·검증 **보조 도구** (능동 크롤러 아님)
- **Cursor** — 실제 코드 구현·디버깅

---

## 🎯 타겟 제품 (8 INN + 거시)

product-dictionary.ts와 완전히 일치해야 하며, 한 번 발급된 UUID는 절대 변경 금지.

| # | 한글 브랜드 | WHO INN (영문) | product_id (UUID) |
|---|---|---|---|
| 0 | (거시 지표 전용) | MACRO | `ba6cf610-9d7c-4fb9-9506-eabd7a5457b8` |
| 1 | 하이드린 캡슐 | Hydroxyurea | `bdfc9883-6040-438a-8e7a-df01f1230682` |
| 2 | 실로스탄 CR정 | Cilostazol | `fcae4399-aa80-4318-ad55-89d6401c10a9` |
| 3 | 가스티인 CR정 | Itopride | `24738c3b-3a5b-40a9-9e8e-889ec075b453` |
| 4 | 클란자 CR정 | Aceclofenac | `2504d79b-c2ce-4660-9ea7-5576c8bb755f` |
| 5 | 라베맥스 정 | Rabeprazole | `859e60f9-8544-43b3-a6a0-f6c7529847eb` |
| 6 | 에르도스테인 캡슐 | Erdosteine | `014fd4d2-dc66-4fc1-8d4f-59695183387f` |
| 7 | 오메가-3 연질캡슐 | Omega-3-acid ethyl esters | `f88b87b8-c0ab-4f6e-ba34-e9330d1d4e18` |
| 8 | 레보틱스 시럽 90mg | Levodropropizine | `895f49ae-6ce3-44a3-93bd-bb77e027ba59` |

---

## 🎯 핵심 원칙

### 1. 9:1 정적/실시간 분리 — 수집 시점 3계층 (L1/L2/L3)

데이터의 **수집 시점**을 기준으로 3계층 구분.

- **L1 정적 seed (~85%)** — 사용자가 사전 검증·정제한 `data/seed/panama/*.json` → `seed_loaders`로 적재. 신뢰성 근거는 사용자 사전 검증.
- **L2 조건부 우리 크롤러 (~10%)** — `preload/` 트랙. L1 빈칸 보완. 세션 16 시점 적재 0건 (PanamaCompra 8 INN 부재 등 진단 진행).
- **L3 실시간 LLM 보강 (~5%)** — `freshness_checker` (해법 C 의미 게이트) 트리거 시만. Phase 2 로드맵.

### 2. 데이터 채널 분류 — Phase A / Phase B / 거시 / 규제

수집 시점(L1/L2/L3)과 직교하는 다른 축. **세션 16 갱신: 규제 카테고리 신규 분리** (DNFD 추가 반영).

- **Phase A 공공조달 (정형)** — PanamaCompra OCDS, MINSA faddi, CSS, ACODECO
- **Phase A 규제 (DNFD)** — DNFD 공공 조회 포털, DNFD 공식 사이트, MINSA 메인
- **Phase B 민간 소매 (비정형·차단)** — Arrocha, Metro Plus, El Javillo, Revilla, FarmaValue, Saba, Super 99, Riba Smith
- **거시 (별도 카테고리)** — World Bank, ITA, KOTRA, PubMed, MOTIE

### 3. 분석 시점 흐름

```
사용자 클릭
  ↓
[1] L2 크롤링 (1~3분, 단계별 표시)
  ↓
[2] L1 seed 조회 + 충돌 판단 (data_reconciler — 세션 17 신규)
  ↓
[3] L3 LLM 보강 (해법 C 트리거 시만)
  ↓
[4] 보고서 1·2·3 페이지 생성 + 렌더링
  ↓
[5] 12시간 캐시 (panama_report_cache)
```

### 4. 팀 공통 규칙
공통 6컬럼 강제, `pa_*` 접두어로 자유 확장.

### 5. 책임 분리
1공정은 현지 가격 수집까지. FOB 역산은 2공정. `fob_estimated_usd`는 1공정 NULL.

### 6. IP 보호 + 수동 트리거
GitHub Actions `workflow_dispatch`만. cron 금지.

### 7. Polite Scraping
1.5~3초 랜덤 딜레이, 연속 에러 3회 중단, OCDS API 1초당 1~2회.

---

## 📊 스키마 (Supabase `panama` 테이블)

### 공통 6컬럼 (변경 금지)

| 컬럼 | 타입 | 규칙 |
|---|---|---|
| id | UUID | PK, `gen_random_uuid()` |
| product_id | UUID | 자사 제품 UUID |
| market_segment | TEXT | `public` / `private` / `macro` / `default` / `regulatory_milestone` |
| fob_estimated_usd | DECIMAL | ⚠ 1공정 NULL. 2공정 UPDATE |
| confidence | DECIMAL | 0.0~1.0 |
| crawled_at | TIMESTAMPTZ | `now()` UTC |

### 파나마 자유 컬럼 (`pa_*`)

- `pa_source` — worldbank / panamacompra / arrocha / metroplus / minsa / css / acodeco / kotra / ita / motie / pubmed / who_paho / llm_search / gemini_seed / **gemini_prevalence** (세션 16 신규) / iqvia_sandoz_2024 / kotra_2026 / minsa_official / worldbank_who_ghed
- `pa_source_url` — 원본 URL
- `pa_collected_at` — 데이터 실제 생성 시점. **DB 실제값만 사용, 하드코딩 금지**
- `pa_product_name_local` — 스페인어 원문
- `pa_ingredient_inn` — 스페인어 INN
- `pa_price_type` — tender_award / retail_normal / retail_promo / regulated / wholesale
- `pa_price_local` — DECIMAL(20,4)
- `pa_currency_unit` — 응답값 그대로 (USD/PAB 혼재). 하드코드 금지
- `pa_package_unit`, `pa_decree_listed`, `pa_stock_status`, `pa_notes`, `pa_released_at`

### 보조 테이블 `panama_distributors`
파트너·유통사 후보. 엔진⑥ AHP 입력 데이터. DDL: `scripts/ddl/panama_distributors.sql`

### 보조 테이블 `panama_eml`
8 INN의 WHO/PAHO/MINSA 등재 상태 추적. 16행 적재. DDL: `scripts/ddl/panama_eml.sql`

### confidence 부여
- API (WorldBank, OCDS, PubMed): 0.90~0.95
- 정적 HTML (ITA, KOTRA, MOTIE): 0.80~0.90
- 정부 폼 (MINSA, CSS, ACODECO, **DNFD**): 0.70~0.85
- 민간 약국 (Arrocha, Metro Plus 등): 0.65~0.80
- LLM 실시간 보강 (L3): 0.50~0.65

---

## 🌐 23개 사이트 — 채널 × 시점 매트릭스 (세션 16 갱신)

### 거시 5개 (L1+L2)

| 사이트 | URL | 방식 | 적재 |
|---|---|---|---|
| World Bank API | api.worldbank.org | REST API | ✅ 2건 |
| ITA | trade.gov/country-commercial-guides/panama-healthcare | 정적 HTML | ✅ 2건 |
| KOTRA | dream.kotra.or.kr | PDF | ✅ 2건 |
| PubMed | E-utilities | REST API | ✅ 2건 |
| MOTIE | 한-중미 FTA | 정적 HTML | ✅ 2건 |

### Phase A 공공조달 4개 (L2)

| 사이트 | URL | 방식 | 적재 | 상태 |
|---|---|---|---|---|
| PanamaCompra OCDS | `/api/v1/releases` | REST API | 0건 | 8 INN 부재 (7,500건 샘플 0매칭) |
| MINSA faddi | minsa.gob.pa | Session+POST+CSRF | 0건 | 스켈레톤 (72줄) |
| CSS | css.gob.pa | PDF 배치 | 0건 | Cloudflare 챌린지 (403) |
| ACODECO | acodeco.gob.pa | PDF/Excel 다운로드 | ✅ 2건 | 세션 17 1순위 (CABAMED 153품목) |

### Phase A 규제 3개 (L2) — 세션 16 신규

| 사이트 | URL | 방식 | 우선순위 |
|---|---|---|---|
| **DNFD 공공 조회 포털** | tramites-minsa.panamadigital.gob.pa | Playwright 폼 제출 (SPA) | 🔴 세션 17 2순위 |
| **DNFD 공식 사이트** | dnfd.minsa.gob.pa | BeautifulSoup (정적) | 🟡 세션 17 3순위 |
| MINSA 메인 | minsa.gob.pa | PDF 정적 | 🟢 |

(후퇴) Panamá Digital — panamadigital.gob.pa — 로그인 차단으로 외부 봇 크롤링 원천 불가

### Phase B 민간 소매 (L2)

| 사이트 | URL | 방식 | 상태 | 비고 |
|---|---|---|---|---|
| Super Xtra | superxtra.com | **VTEX** `api/catalog_system/pub/products/search` (카테고리·`ft` 검색) | 🟢 세션22 프로브 | Xtra Farmacia 의약품 **~2765 SKU** 공개, 가격·재고 `commertialOffer` |
| Arrocha | arrocha.com | Shopify JSON API | 🔴 후퇴 | 의약품 컬렉션 의도적 차단 |
| Metro Plus | metroplus.com.pa | WordPress/WooCommerce | 🔴 후퇴 | Shopify 가설 기각 |
| El Javillo | eljavillo.com | Playwright (Dynamic) | 🟢 미검증 | 세션 17 라이브 검증 대상 |
| Revilla | farmaciasrevilla.com | Playwright (Dynamic) | 🟢 미검증 | 세션 17 라이브 검증 대상 |
| FarmaValue | farmavalue.com/pa | Playwright (SPA) | 🟡 세션 17 진입 | 최저가 벤치마크 |
| Saba | farmaciasaba.com | Playwright (Dynamic) | 🟢 미검증 | |
| Super 99 | super99.com | Playwright (E-com) | 🟢 미검증 | OTC·진통제 |
| Riba Smith | ribasmith.com | Playwright (E-com) | 🟢 미검증 | 프리미엄 수입 |

### Phase A 사이트 상세

#### PanamaCompra OCDS (세션 16 명세 정정)
- **엔드포인트**: `https://ocdsv2dev.panamacompraencifras.gob.pa/api/v1/releases` (옛 `/ocds/release`는 404)
- **응답 구조**: `releases[].awards[].items[]` (tender.items는 일반적으로 비어있음)
- **인증**: 불필요 (Open API)
- **TLS**: 서버 인증서 만료, `rejectUnauthorized: false` 필수
- **UNSPSC 51000000 필터**: 노이즈 다수 → 필터 제거 후 키워드 매칭
- **8 INN 매칭**: 7,500건 샘플 0건. 데이터셋 자체 부재 또는 별도 검색 API 필요

#### ACODECO CABAMED (세션 17 1순위)
- **데이터**: 153품목 의약품 바구니 (Canasta Básica de Medicamentos)
- **형식**: PDF + Excel 정기 공시
- **차단 위험**: 0
- **데이터 밀도**: 최고 (민간/공공 최고가·최저가 모두 포함)
- **현재 적재**: 2건 (세션 17에서 153품목 전체 확장)

#### DNFD 공공 조회 포털 (세션 17 2순위, 신규)
- **URL**: tramites-minsa.panamadigital.gob.pa
- **데이터**: 자사 8 INN 위생등록(Registro Sanitario) 여부 직접 확인
- **방식**: Playwright 폼 제출 (검색창에 약품명·등록번호 입력)
- **주의**: CAPTCHA 간헐적 노출 → Timeout 넉넉히, 예외 처리 꼼꼼히
- **WLA 패스트트랙**: 한국 위생선진국 지정 → 5단계 신속 절차 (5년 유효 등록증)

#### DNFD 공식 사이트 (세션 17 3순위, 신규)
- **URL**: dnfd.minsa.gob.pa
- **데이터**: 신규 법령, 규제 변경, 의약품 경고(Alerts) 텍스트
- **방식**: BeautifulSoup 또는 cheerio (정적 HTML)
- **갱신**: 분기별 1회 workflow_dispatch

#### CSS (사회보장기금)
- **URL**: `https://www.css.gob.pa`
- **데이터**: 보험 약가 PDF 배치
- **인증**: 불필요
- **세션 16 라이브 응답**: 403 + Cloudflare 챌린지
- **현재 코드**: 부분 구현 (149줄, PDF 파싱 일부)
- **상태**: Cloudflare 우회 필요 → 세션 17+ 또는 Phase 2 이월
- **우회 옵션**: Residential Proxy ($50/월) 또는 후퇴

#### MINSA faddi
- **URL**: minsa.gob.pa/faddi
- **데이터**: 의약품 위생등록 검색 (DNFD 공공 조회 포털과 별개)
- **인증**: Session + POST + CSRF 토큰
- **현재 코드**: 스켈레톤 (72줄, CSRF 미구현)
- **상태**: 본격 구현 미진입. DNFD 공공 조회 포털이 더 효율적이라 우선순위 후순위

#### ACODECO
- **URL**: acodeco.gob.pa
- **데이터**: Decreto Ejecutivo CABAMED 가격 통제 리스트 (153품목 정적)
- **현재 적재**: 2건
- **세션 17 1순위**: PDF/Excel 파서로 153품목 전체 적재 → 50건+ 확장

### Phase B 사이트 상세

#### Super Xtra (세션 22 VTEX 프로브)
- **URL**: `https://www.superxtra.com` — 카탈로그: `/xtra-farmacia/medicamentos`
- **플랫폼**: VTEX (`powered: vtex`, `X-VTEX-*` 헤더). Arrocha Shopify와 **별계열**.
- **공개 API 예시**: `GET /api/catalog_system/pub/products/search/xtra-farmacia/medicamentos?_from=0&_to=49` → 응답 헤더 `resources: 0-49/2765` (총 의약품 **2765** 추정), 본문 JSON 배열.
- **검색**: `GET .../products/search?ft=rosuvastatina` 등 `ft` 풀텍스트.
- **가격 필드**: `items[].sellers[].commertialOffer.Price` (VTEX 오타 `commertialOffer` 그대로).
- **민감도**: `findProductByPanamaText`로 8제품 매칭 시 스타틴·Omega 등 **키워드가 겹치면 딕셔너리 우선순위에 따라 한 제품으로만 귀속**될 수 있음 → 적재 로직에서 `product_id` 고정 매칭 규칙 필요.
- **차단**: 본 프로브 구간 **206 Partial Content + JSON 정상**, Rate limit 메시지 없음 (2s 간격 권장).

#### Arrocha (세션 16 라이브 정찰 결과)
- **URL**: `https://arrocha.com`
- **플랫폼 확정**: Shopify (powered-by 헤더, x-shopid, x-sorting-hat-podid 확인)
- **공개 API**: `/products.json` 200 OK + JSON 응답 정상
- **🔴 결정적 차단 발견**:
  - `/collections/medicamentos` HTML 200, JSON 빈 배열 (`{"products":[]}`)
  - 7,500건 페이징 샘플 (page 1·5·10) 모두 의약 카테고리 0건
  - search/suggest 8 INN 0매칭 (unavailable_products=show 옵션 포함)
  - Easylockdown 앱이 의약품 컬렉션 링크 의도적 숨김 처리
- **판정**: 파나마 약사법 또는 Arrocha 자체 정책으로 의약품 비공개
- **우회 경로**: 로그인·지역 인증·B2B (모두 비공개, 발표 전 시간 안에 불가)
- **현재 적재**: 0건. Phase 2 로드맵 이월

#### Metro Plus (세션 16 라이브 정찰 결과)
- **URL**: `https://metroplus.com.pa`
- **플랫폼 확정**: WordPress / WooCommerce (Kinsta 호스팅 + Cloudflare)
- **세션 16 검증**: products.json HTML 응답 (Página no encontrada), Shopify 가설 기각
- **현재 코드**: 스켈레톤 (43줄)
- **상태**: WordPress 별도 전략 필요 → Phase 2 이월

### Phase B 후퇴 옵션 (세션 16 결정)

Cloudflare 우회 비용($50/월 Residential Proxy + 8시간+ 작업 + 차단 재발 위험) 대비 효과 낮음 판정.

대안 채택:
- **ACODECO CABAMED 153품목** (공식 가격표) — 1차 소스
- **WHO 2015 ERP 가이드라인 인접 5개국 참조가** — 2차 소스 (콜·페·멕·칠·코)
- **PAHO Strategic Fund 권역 단가** — 3차 소스 (Hydroxyurea $0.188 등)

발표 방어 신규 내러티브: "Arrocha는 Shopify 기반이며 공개 API는 살아있으나, 의약품 컬렉션은 약사법 준수 차원에서 의도적으로 비공개 처리됨이 확인됐습니다. 본 데모에서는 ACODECO CABAMED 공식 가격표 + WHO ERP 가이드라인에 따른 인접 5개국 참조가를 활용했습니다."

---

## 🔄 분석 시점 흐름 (상세 다이어그램)

```
[L1 사전 적재] gemini_seed JSON 32건 + gemini_prevalence 9건 + 거시·공공 18건
  → seed_loaders로 panama 테이블 적재 (총 59건)

⋮ 데이터 대기 ⋮

[분석 시점] 사용자 클릭
  ↓ (1~3분 허용, 단계별 표시 UI 필수)

  L2 크롤링 (Phase A·B 사이트 호출)
  ├─ ✅ 1/N PanamaCompra: 8 INN 검색 (1~2초)
  ├─ ✅ 2/N World Bank: GDP 갱신 (0.8초)
  ├─ ⏳ 3/N MINSA 위생 등록 정보 수집 중...
  └─ ...
  ↓
  L1 seed 조회 + data_reconciler 충돌 판단 (세션 17 신규)
  ↓
  L3 LLM 보강 (해법 C 트리거 시만, Phase 2)
  ↓
  보고서 1·2·3 페이지 생성 + 렌더링
  ↓
  12시간 캐시 (panama_report_cache) — 강제 새로고침 버튼 제공
```

---

## 🧠 10가지 크롤링 기법

| # | 기법 | 파일 위치 | 상태 | 출처 |
|---|---|---|---|---|
| ① | WebWalker (자율 탐색) | src/agents/webwalker_core.ts | 🔴 Phase 2 | arxiv.org/abs/2501.07572 |
| ② | Wrapper Maintenance + Top-down/Step-back | src/agents/wrapper_maintenance.ts | 🔴 Phase 2 | DataProG + AUTOSCRAPER |
| ③ | SAND (이상치 탐지 IQR) | src/cleansing/sand_outlier.ts | ✅ | dl.acm.org/doi/10.14778/3467861.3467863 |
| ④ | ComEM (스페인어 정규화) | src/cleansing/comem_matcher.ts | ✅ | arxiv.org/abs/2405.16884 |
| ⑤ | XGrammar (JSON 강제) | src/utils/xgrammar_enforcer.ts | 🟡 Skeleton | arxiv.org/abs/2411.15100 |
| ⑥ | Atomic Calibration (팩트체크) | src/utils/atomic_factchecker.ts | 🔴 Phase 2 | arxiv.org/abs/2410.13246 |
| ⑦ | Polite Scraping (인프라) | src/crawler/stealth_setup.ts | ✅ | 실무 엔지니어링 |
| ⑧ | HTML Preprocessing Pipeline | src/utils/html_preprocessor.ts | ✅ (76.3% 절감 실측) | 제로샷 + 소형 모델 논문 |
| ⑨ | EBNF Constrained Extraction | src/utils/ebnf_schemas.ts | ✅ | 자율 웹 크롤러 보고서 |
| ⑩ | Lightweight Resource Blocking | src/crawler/stealth_setup.ts (통합) | 🟡 Skeleton | 자율 웹 크롤러 보고서 |

### Lifecycle 흐름

```
[진입] ⑦ Polite + ⑩ Resource Blocking
  ↓
[탐색] ① WebWalker
  ↓
[전처리] ⑧ HTML Preprocessing  (Opus 입력 토큰 70~80% 절감)
  ↓
[추출] ② Wrapper Maintenance + Top-down/Step-back
  ↓
[정제1] ③ SAND (이상치 IQR)
  ↓
[정제2] ④ ComEM (엔티티 매칭)
  ↓
[적재1] ⑤ XGrammar (JSON 토큰 강제)
  ↓
[적재2] ⑨ EBNF Constrained Extraction (필드 누락 차단)
  ↓
[적재3] ⑥ Atomic Calibration (팩트체크 검증)
  ↓
Supabase INSERT
```

### 신규 기법 3개 설계 목적 (세션 2 도입)

- **⑧ HTML Preprocessing**: Opus 입력 토큰 70~80% 절감. 실측 76.3% 절감 달성 (PanamaCompra 응답 기준)
- **⑨ EBNF Constrained Extraction**: 필드 누락·타입 오류를 토큰 레벨에서 차단. JSON Schema 후처리 검증보다 강력
- **⑩ Lightweight Resource Blocking**: Arrocha/Metro Plus 페이지 5배 빠름 + 파나마 서버 부담 80% 감소 (이미지·CSS·웹폰트 차단)

---

## 📁 디렉토리 구조

```
panama-crawler/
├── .github/workflows/
│   ├── pa_static_macro.yml       # 거시 L1 갱신
│   ├── pa_static_public.yml      # Phase A L2
│   ├── pa_static_private.yml     # Phase B L2
│   ├── pa_realtime_search.yml    # L3
│   ├── pa_health_check.yml
│   └── freshness_refresh.yml     # 🆕 세션 23 D-2 (신선도 조건부 재크롤링)
├── src/
│   ├── crawler/                  # ⑦ Polite Scraping
│   ├── agents/                   # ① WebWalker ② Wrapper Maintenance
│   ├── cleansing/                # ③ SAND ④ ComEM
│   ├── crawlers/
│   │   ├── base/
│   │   ├── preload/              # L2 (Phase A·B 모두 여기)
│   │   └── realtime/             # L3 LLM 보강 + 환율 EXIM (D-1 복원)
│   ├── seed_loaders/             # L1 정적 seed 로더
│   ├── utils/                    # ⑤ XGrammar ⑥ Atomic + db_connector
│   ├── llm/                      # report1_generator, REPORT1_SYSTEM_PROMPT, phase2/ (세션 23 신규)
│   ├── logic/                    # case_judgment, fetch_panama_data, prevalence_resolve, freshness_checker, data_reconciler, product_matcher, 2공정 로직 (margin_policy_resolver·fob_back_calculator·price_scenario_generator·incoterms_forward_calculator, 세션 23)
│   └── config/                   # product-dictionary.ts
├── data/seed/panama/             # round1~4 JSON (round5_ita_insights.json 세션 17 추가 예정)
├── scripts/
│   ├── runners/
│   │   └── freshness_refresh_runner.ts  # 🆕 세션 23 D-2 (stale 항목 선별 러너)
│   └── sql/
│       └── v_stale_items.sql     # 🆕 세션 23 D-2 (신선도 VIEW)
├── docs/research/                # freshness_2gate_architecture.md
└── package.json
```

폴더 분리 기준은 **수집 시점(L1/L2/L3)**. 데이터 채널(Phase A/B)은 코드 내 `pa_source` + `market_segment`로 구분.

---

## ⚠ 절대 원칙 (협상 불가)

1. **수집 시점별 폴더 분리** — L1 코드는 `seed_loaders/`, L2 코드는 `preload/`, L3 코드는 `realtime/`. 절대 섞지 않음
2. 모든 워크플로우는 `workflow_dispatch`만. cron 절대 금지
3. 분석 버튼 시 분석 시점 흐름 준수 (L2 크롤링 1~3분 허용, 단계별 표시 UI 필수)
4. `fob_estimated_usd`는 1공정 NULL — FOB 역산 절대 금지
5. LLM 호출은 `MAX_LLM_CALLS_PER_RUN=3` 환경변수 강제
6. 공통 6컬럼 이름·타입 변경 절대 금지
7. `any` 타입 절대 금지
8. `.ts`(로직)와 `.tsx`(UI) 분리
9. **`pa_source_type` 컬럼 사용 금지** — 잉여 필드. `pa_source`만 사용
10. **문자열 파싱 시 부정 키워드 우선 매칭** — "미포함" → "포함" 순서 강제
11. **데이터 신뢰성 근거는 사용자 사전 검증** — AI 생성 능력 아님. Gemini는 보조 도구
12. **freshness 판정은 해법 C (AI 의미 게이트)** — 시간 규칙 단독 판정 금지
13. **`pa_collected_at` 등 timestamp는 DB 실제값만** — 하드코딩 금지
14. **제품 매칭 시 form·strength·unit 다중 필터** — CR/일반, 캡슐/시럽 엄격 구분
15. **L2 크롤링 통합 시 12시간 캐시 강제** — IP 차단 회피, `panama_report_cache`
16. **PanamaCompra `pa_currency_unit`은 응답값 그대로** — 하드코드 USD 금지
17. **PanamaCompra UNSPSC 51000000 필터 사용 금지** — 노이즈 다수, 키워드 매칭으로 대체
18. **🆕 크롤러 작업 완료 기준은 "코드 작성·tsc 통과"가 아니라 "DB INSERT N행 + SQL 검증"** — 세션 16 PanamaCompra 0건 교훈. "코드 완성 → 실제 0건" 패턴 재발 방지. 외부 가설(Shopify 쉬움 등)은 모두 실제 INSERT까지 도달해야 통과
19. **🆕 보고서 prevalence 조회 시 product_id 엄격 일치 + 키워드 fallback 금지** — 세션 16 H.pylori 교차오염 교훈. 매칭 실패 시 빈 문자열, 다른 INN 데이터 폴백 절대 금지
20. **🆕 (세션 23) 로컬 환경변수 오염은 Vercel 배포본에 영향 주지 않음** — 로컬 디버깅 결과로 Vercel 실행 상태 판단 금지. `KEY_EXISTS: false` 로컬 진단 결과를 Vercel 원인으로 오인 금지. 반드시 Vercel Logs로 별도 진단
21. **🆕 (세션 23) Rx vs OTC 카테고리 엄격 분리** — 처방약 Omega-3-acid ethyl esters 90 (Omacor/Lovaza/Vascepa)과 일반 건강기능식품 Omega-3 (Kirkland/GNC) 가격 비교 혼용 절대 금지. 유나이티드_8개제품_분석_v2 라인 87 박제
22. **🆕 (세션 23) 신선도 가교는 "런타임 마킹 + GitHub Actions 수동 재크롤링" 구조** — 런타임 Haiku가 `stale_confirmed` 마킹 → 달강님 수동 트리거로 해당 항목만 재수집. `v_stale_items` VIEW 경유 필수. 핀포인팅 URL 추가 없이 기존 `pa_source` 기반 라우팅만 사용

---

## 🔗 관련 설계 문서

- [REPORT1_SPEC.md](REPORT1_SPEC.md) — 보고서 1장 5개 블록 구조
- [USER_FLOW.md](USER_FLOW.md) — 사용자 여정 5단계 플로우
- [CURSOR_INSTRUCTIONS.md](CURSOR_INSTRUCTIONS.md) — Cursor 작업 지시서
- [TECHNIQUES_STATUS.md](TECHNIQUES_STATUS.md) — 10가지 기법 진척도
- [docs/research/freshness_2gate_architecture.md](docs/research/freshness_2gate_architecture.md) — 해법 C 설계 박제 (Phase 2 로드맵)