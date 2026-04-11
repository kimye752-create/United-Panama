# 파나마 1공정 크롤러 — 아키텍처 명세

> KITA 무역AX 1기 · 한국유나이티드제약 5조 · 김예환
> Tech Stack: Next.js · TypeScript · Playwright · Supabase · GitHub Actions

## 👥 AI 역할 분담

- **Claude** — 설계·검수·문서화. 코드 직접 작성 금지 (크레딧 절약)
- **Gemini** — 사용자의 자료 수집·검증 **보조 도구** (능동 크롤러 아님)
- **Cursor** — 실제 코드 구현·디버깅

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

## 🎯 핵심 원칙

1. **9:1 정적/실시간 분리** — 보고서의 90%는 Phase A 사전 수집 (Supabase 적재), 10%는 Phase B 실시간 LLM 보강  
   - **정적 90% 재정립 (2026-04-11)**: 우선 **JSON seed 사전 수집** (사용자가 사전 검증·정제한 `data/seed/panama/*.json`) → `seed_loaders`로 `panama` 테이블 적재; 기존 `preload/` 크롤러는 **보완용**(seed가 채우지 못한 빈칸만).
   - "JSON seed 사전 수집" 정의: 사용자가 검증·정제하여 정적 자료 형태(JSON, PDF 등)로 DB화한 것. 데이터 신뢰성의 근거는 AI 생성 능력이 아닌 **사용자의 사전 검증**.
2. **팀 공통 규칙 준수** — 공통 6컬럼 강제, pa_* 접두어로 자유 확장
3. **책임 분리** — 1공정은 현지 가격 수집까지. FOB 역산은 2공정. `fob_estimated_usd`는 1공정에서 NULL 적재
4. **IP 보호 + 수동 트리거** — GitHub Actions `workflow_dispatch`만 사용. cron 금지. Azure IP 자동 회전
5. **Polite Scraping** — 1.5~3초 랜덤 딜레이, 연속 에러 3회 중단, OCDS API 1초당 1~2회

---

## 📊 스키마 (Supabase `panama` 테이블)

### 공통 6컬럼 (변경 금지)

| 컬럼 | 타입 | 규칙 |
|---|---|---|
| id | UUID | PK, `gen_random_uuid()` |
| product_id | UUID | 자사 제품 UUID |
| market_segment | TEXT | `public` / `private` / `macro` |
| fob_estimated_usd | DECIMAL | ⚠ 1공정 NULL. 2공정 UPDATE |
| confidence | DECIMAL | 0.0~1.0 |
| crawled_at | TIMESTAMPTZ | `now()` UTC |

### 파나마 자유 컬럼 (`pa_*`, 12종)

- `pa_source` — worldbank / panamacompra / arrocha / metroplus / minsa / css / acodeco / kotra / ita / motie / pubmed / who_paho / llm_search / gemini_seed
- `pa_source_url` — 원본 URL
- `pa_collected_at` — 데이터 실제 생성 시점 (신선도)
- `pa_product_name_local` — 스페인어 원문
- `pa_ingredient_inn` — 스페인어 INN (8종 매칭 키)
- `pa_price_type` — tender_award / retail_normal / retail_promo / regulated / wholesale
- `pa_price_local` — DECIMAL(20,4), USD (환율 변환 불필요)
  - **변경 이력 (헌법)**: 기존 DECIMAL(12,4) → DECIMAL(20,4) (2026-04-11). 거시 수치(WorldBank GDP $86.52B 등) + 공공 입찰가를 한 컬럼에 일관 저장하기 위함. DECIMAL(12,4) 한계(정수부 최대 8자리)로는 GDP 등이 numeric overflow 발생.
- `pa_currency_unit` — 'USD' 고정
- `pa_package_unit` — 1 caja x 30 tab 등
- `pa_decree_listed` — BOOLEAN, CABAMED 등재
- `pa_stock_status` — in_stock / out_of_stock / unknown
- `pa_notes` — TEXT (선택). Gemini seed 인용·메모 (`scripts/ddl/panama_add_pa_notes.sql`로 컬럼 추가)

### 보조 테이블 `panama_distributors`

파트너·유통사 후보를 별도 보관 (메인 `panama` 제품·가격 행과 분리).

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | UUID | PK |
| company_name | TEXT | 필수 |
| company_name_local | TEXT | |
| focus_area | TEXT | 예: farmacéuticos |
| target_market | TEXT | public / private / both |
| estimated_revenue_usd | DECIMAL(20,4) | AHP 입력, 비어도 OK |
| has_gmp_certification | BOOLEAN | |
| has_mah_capability | BOOLEAN | |
| product_lines | TEXT | |
| korean_partnership_history | BOOLEAN | |
| source | TEXT | gemini_seed / panamacompra / minsa / manual |
| source_url | TEXT | |
| source_quote | TEXT | |
| confidence | DECIMAL(4,3) | 0~1 |
| collected_at | TIMESTAMPTZ | |
| ahp_psi_score | DECIMAL(6,4) | **3공정** UPDATE, 1공정 NULL |
| ahp_rank | INTEGER | **3공정** UPDATE, 1공정 NULL |

- **목적**: 엔진⑥ AHP 파트너 매칭(3공정)의 입력 데이터.  
- **1공정**: Gemini seed + (필요 시) 크롤러로 후보군 수집.  
- **3공정**: `ahp_psi_score` / `ahp_rank` 컬럼 UPDATE.  
- DDL: `scripts/ddl/panama_distributors.sql`

### 보조 테이블 `panama_eml`

8개 INN의 국제/국가 필수의약품목록(EML) 등재 상태 추적. 공공조달 전략 수립 시 "파나마 공공시장 진입 가능 여부"의 1차 필터로 사용됨.

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | UUID | PK (공통) |
| product_id | UUID | 공통 — 8 INN UUID |
| market_segment | TEXT | CHECK: `eml_who` / `eml_paho` / `eml_minsa` |
| fob_estimated_usd | DECIMAL | 공통 — CHECK: **IS NULL 강제** |
| confidence | DECIMAL | 공통 |
| crawled_at | TIMESTAMPTZ | 공통 |
| pa_inn_name | TEXT | NOT NULL, 스페인어 INN |
| pa_eml_listed | BOOLEAN | WHO EML 등재 여부 |
| pa_paho_procurable | BOOLEAN | PAHO Strategic Fund 조달 가능 |
| pa_minsa_essential | BOOLEAN | 파나마 MINSA 필수약 지정 |
| pa_atc_code | TEXT | 예: R05DB27 (Levodropropizine) |
| pa_therapeutic_class | TEXT | 치료 분류 |
| pa_notes | TEXT | 세부 메모 |
| pa_source_url | TEXT | 원본 URL |
| pa_raw_data | JSONB | 원시 데이터 백업 |

- **목적**: 8 INN × 3개 등재 리스트(WHO/PAHO/MINSA)의 교차표. 공공조달(PanamaCompra) 입찰 전략 시 등재 여부가 참여 가능성에 직결됨.
- **현재 적재 상태**: 16행 (8 INN × `eml_who` + 8 INN × `eml_paho`). MINSA 리스트 수집은 미결.
- **골든 데이터**: WHO EML 2023 / PAHO Strategic Fund 모두 Hidroxiurea만 등재.
- DDL: `scripts/ddl/panama_eml.sql`
- 로더: `src/seed_loaders/load_eml.ts` (세션 3 완성·적재 완료)

#### ⚠ 파싱 원칙 (세션 3 디버깅 산물)
문자열 파싱 시 **부정 키워드 우선 매칭**. 예: "미포함" → "포함" 순서로 체크. "미포함"에 "포함"이 서브스트링으로 포함되어 발생하는 오탐을 사전 차단.

### confidence 부여
- API (WorldBank, OCDS, PubMed): **0.90~0.95**
- 정적 HTML (ITA, KOTRA, MOTIE): **0.80~0.90**
- 정부 폼 (MINSA, CSS, ACODECO): **0.70~0.85**
- 민간 약국 (Arrocha, Metro Plus): **0.65~0.80**
- LLM 실시간 보강: **0.50~0.65**

---

## 🌐 Phase A — 11개 사이트 사전 수집

### 거시 (5개, 1회 수집)
1. **World Bank API** — GDP·인구·보건지출 (REST JSON)
2. **ITA** — trade.gov/country-commercial-guides/panama-healthcare (정적 HTML)
3. **KOTRA** — 파나마 무역관 PDF. ★ 2023.6 대한민국 '위생 선진국' 지정
4. **PubMed** — E-utilities API, 8개 INN 검색 확장
5. **MOTIE** — 산자부 한-중미 FTA. ★ 2021.3.1 전체 발효 완료

### 공공 (3개, 8개 INN별)
6. **PanamaCompra OCDS** — `https://ocdsv2dev.panamacompraencifras.gob.pa/api/v1/ocds/release` (UNSPSC 51000000 필터)
7. **MINSA faddi** — Session + POST + CSRF
8. **CSS** — 사회보장기금 (파나마 인구 70% 가입). PDF 배치

### 민간 (2개, 시연 직전 1회)
9. **Arrocha** — Playwright Stealth + Residential Proxy (Cloudflare WAF)
10. **Metro Plus** — Playwright + 사용자 행동 모사 (Cloudflare Turnstile)

### 규제 (1개)
11. **ACODECO** — Decreto Ejecutivo CABAMED 가격 통제 리스트

---

## 🔄 Phase A/B 흐름

```
[Phase A] 수동 트리거 (GitHub Actions Run workflow 버튼)
  A-1 거시 수집 → A-2 공공 수집 → A-3 민간 수집
  → A-4 정제 (SAND + ComEM + XGrammar)
  → A-5 Supabase 적재 (pa_source 기반 출처 추적)

⋮ 데이터 대기 ⋮

[Phase B] 분석 버튼 클릭
  B-1 사용자 선택 → B-2 Supabase 조회 (90%)
  → B-3 조건부 LLM 보강 (freshness_checker 기반 7일 초과 시)
  → B-4 보고서 생성 → B-5 렌더링
  → 10초 이내 응답
```

---

## 🧠 10가지 크롤링 기법

| # | 기법 | 파일 위치 | 출처 |
|---|---|---|---|
| ① | WebWalker (자율 탐색) | src/agents/webwalker_core.ts | arxiv.org/abs/2501.07572 |
| ② | Wrapper Maintenance + Top-down/Step-back | src/agents/wrapper_maintenance.ts | DataProG + AUTOSCRAPER |
| ③ | SAND (이상치 탐지) | src/cleansing/sand_outlier.ts | dl.acm.org/doi/10.14778/3467861.3467863 |
| ④ | ComEM (엔티티 매칭) | src/cleansing/comem_matcher.ts | arxiv.org/abs/2405.16884 |
| ⑤ | XGrammar (JSON 강제) | src/utils/xgrammar_enforcer.ts | arxiv.org/abs/2411.15100 |
| ⑥ | Atomic Calibration (팩트체크) | src/utils/atomic_factchecker.ts | arxiv.org/abs/2410.13246 |
| ⑦ | Polite Scraping (인프라) | src/crawler/stealth_setup.ts | 실무 엔지니어링 |
| ⑧ | HTML Preprocessing Pipeline (신규) | src/utils/html_preprocessor.ts | 제로샷 + 소형 모델 논문 |
| ⑨ | EBNF Constrained Extraction (신규) | src/utils/ebnf_schemas.ts | 자율 웹 크롤러 보고서 |
| ⑩ | Lightweight Resource Blocking (신규) | src/crawler/stealth_setup.ts (통합) | 자율 웹 크롤러 보고서 |

### Lifecycle 흐름
[진입] ⑦ Polite + ⑩ Resource Blocking → [탐색] ① WebWalker 
→ [전처리] ⑧ HTML Preprocessing → [추출] ② Wrapper Maintenance 
→ [정제1] ③ SAND → [정제2] ④ ComEM 
→ [적재1] ⑤ XGrammar → [적재2] ⑨ EBNF → [적재3] ⑥ Atomic Calibration 
→ Supabase INSERT

### 신규 기법 3개 설계 목적
- ⑧ HTML Preprocessing: Opus 입력 토큰 70~80% 절감 (비용 실익)
- ⑨ EBNF Constrained Extraction: 필드 누락·타입 오류 토큰 레벨 차단
- ⑩ Lightweight Resource Blocking: Arrocha/Metro Plus 5배 빠름 + 파나마 서버 부담 80% 감소
---

## 📁 디렉토리 구조

```
panama-crawler/
├── .github/workflows/
│   ├── pa_static_macro.yml       # Phase A 거시 (수동)
│   ├── pa_static_public.yml      # Phase A 공공 (수동)
│   ├── pa_static_private.yml     # Phase A 민간 (수동)
│   ├── pa_realtime_search.yml    # Phase B LLM 실시간
│   └── pa_health_check.yml       # 시연 전 신선도 점검
├── src/
│   ├── crawler/                  # ⑦ Polite Scraping
│   ├── agents/                   # ① WebWalker ② Wrapper Maintenance
│   ├── cleansing/                # ③ SAND ④ ComEM
│   ├── crawlers/
│   │   ├── base/                 # BaseCrawler + Api/Static/Playwright/LLMSearch
│   │   ├── preload/              # Phase A 11개 사이트 전용
│   │   └── realtime/             # Phase B LLM 보강 전용
│   ├── utils/                    # ⑤ XGrammar ⑥ Atomic + db_connector, translate
│   ├── logic/                    # schema_mapper, product_matcher, freshness_checker
│   └── config/                   # product-dictionary.ts, targets.ts, llm-trigger-rules.ts
├── scripts/runners/              # preload_macro/public/private, realtime_search, health_check
└── package.json
```

---

## ⚠ 절대 원칙 (협상 불가)

1. Phase A와 Phase B 코드는 `preload/`와 `realtime/`에 절대 섞지 않음
2. 모든 워크플로우는 `workflow_dispatch`만. cron 절대 금지
3. 분석 버튼 시 11개 사이트 호출 절대 금지 — Supabase 조회만
4. `fob_estimated_usd`는 1공정 NULL — FOB 역산 절대 금지
5. LLM 호출은 `MAX_LLM_CALLS_PER_RUN=3` 환경변수 강제
6. 공통 6컬럼 이름·타입 변경 절대 금지
7. `any` 타입 절대 금지
8. `.ts`(로직)와 `.tsx`(UI) 분리
9. **`pa_source_type` 컬럼 사용 금지** — 세션 3 디버깅 결과 잉여 필드로 판정. `pa_source`만으로 출처 추적 충분
10. **문자열 파싱 시 부정 키워드 우선 매칭** — "미포함" → "포함" 순서 강제
11. **데이터 신뢰성 근거는 사용자 사전 검증** — AI 생성 능력 아님. Gemini는 보조 도구이지 능동 크롤러가 아님

---

## 🔗 관련 설계 문서

- [REPORT1_SPEC.md](REPORT1_SPEC.md) — 보고서 1장 5개 블록 구조
- [USER_FLOW.md](USER_FLOW.md) — 사용자 여정 5단계 플로우