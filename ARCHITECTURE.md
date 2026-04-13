# 파나마 1공정 크롤러 — 아키텍처 명세

> KITA 무역AX 1기 · 한국유나이티드제약 5조 · 김예환
> Tech Stack: Next.js · TypeScript · Playwright · Supabase · GitHub Actions
> **세션 16 / 2026-04-13 업데이트** — 용어 체계 이중 축 정립 (수집 시점 L1/L2/L3 + 데이터 채널 Phase A/B), PanamaCompra 명세 정정, L2 크롤러 0건 현황 박제

---

## 📌 세션 16 업데이트 (2026-04-13)

### 용어 체계 재정립 — 이중 축
세션 12~15까지 "Phase A = 사전 수집 / Phase B = 분석 시점 LLM 보강"으로 정의되던 용어가 모호해져 정리. 이제 **수집 시점**과 **데이터 채널** 두 축으로 분리.

- **수집 시점 (3계층)**: L1 정적 seed / L2 조건부 우리 크롤러 / L3 실시간 LLM 보강
- **데이터 채널**: Phase A 공공조달·규제 (정형) / Phase B 민간 소매 (비정형·차단 위험) / 거시 (별도 카테고리)

상세는 §핵심원칙 §1 + §데이터 채널 분류 참조.

### PanamaCompra 명세 정정 (실측 기반)
- 엔드포인트: ~~`/api/v1/ocds/release`~~ → **`/api/v1/releases`** (옛 경로는 404)
- 품목 위치: ~~`release.tender.items`~~ → **`release.awards[].items[]`** (tender.items는 일반적으로 비어있음)
- TLS: 서버 인증서 만료 상태 → `rejectUnauthorized: false` 필수 (코드 기본 적용됨)
- UNSPSC 51000000 필터: 의약품만 잡지 못하고 노이즈 다수 → 필터 제거 후 키워드 매칭으로 전환
- 통화: 응답값 그대로 (`PAB`/`USD` 혼재) — 하드코드 USD 금지
- 가격: `items[].totalValue` 우선, 없으면 `award.value` 폴백

### L2 크롤러 적재 0건 현황 (세션 16 실측)
| 사이트 | 코드 상태 | 라이브 응답 | 차단 여부 | 적재 건수 |
|---|---|---|---|---|
| PanamaCompra | 완성 (424줄, 명세 정정 후) | 200 OK | 없음 | 0건 (8 INN 부재 — 7,500건 샘플 0매칭) |
| CSS | 부분 (149줄, PDF 파싱 일부) | 403 + Cloudflare | 챌린지 | 0건 |
| MINSA | 스켈레톤 (72줄, CSRF 미구현) | — | — | 0건 |
| Arrocha | 스켈레톤 (55줄, dry-run만) | 200 OK (cf-mitigated 없음) | 우회 가능성 검토 중 | 0건 |
| Metro Plus | 스켈레톤 (43줄) | DNS 실패 (네트워크 의존) | — | 0건 |

→ "L2 크롤러 0건" 발표 방어 약점 그대로. 세션 17+ 진단 진행 중.

### 세션 16 발견 — PanamaCompra OCDS에 8 INN 부재
- 실측: 7,500건 릴리스 샘플에서 8 INN 키워드(스페인어·영문 INN·브랜드명) 매칭 0건
- 비교: ibuprofeno 등 일반 의약품은 발견됨 → 데이터셋 자체는 정상
- 시사: 우리 8 INN은 파나마 공공조달 비주류 또는 별도 검색·다운로드 API 필요
- 발표 방어 신규 내러티브: "8 INN 중 X개는 파나마 공공조달 비등재 → 민간 채널·인접국 ERP 활용이 정확한 전략"

### Phase A/B 코드 분리 원칙 변경
기존: "Phase A 코드는 `preload/`, Phase B 코드는 `realtime/`에 절대 섞지 않음"
신규: 폴더 분리는 **수집 시점(L1/L2/L3) 기준**으로 유지. 데이터 채널(Phase A/B)은 `pa_source` + `market_segment`로 구분.

---

## 📌 세션 13 업데이트 (2026-04-12)

### 거시 카드 정밀화
- 성장률: KOTRA 10% 제거 (의료기기 포함 scope 확인) → IQVIA Sandoz 2024 YoY 3.4% 단일 표기 + scope footer
- Perplexity 제시 KOTRA CAGR 5%: PDF 원문 검증 실패로 채택 불가
- 인구 파싱: `Most recent value. (2024)` 마침표 형식 정규식 매칭 추가
- 보건지출: `worldbank_who_ghed` 시드 행 분리, `pa_price_local` 폴백 적용

### 규제 마일스톤 시드 신규
- `market_segment: regulatory_milestone` CHECK 제약 추가
- 「진출 호재」 카드 2건: MINSA fast-track 2023 + 약가 개혁 2024
- DDL: `scripts/ddl/panama_alter_session13_macro_milestone.sql`

---

## 📌 세션 12 업데이트 (2026-04-12)

### PDF 엔진⑦ 상태
- **웹 보고서**: 완성 (5개 블록 렌더링, 한글 정상, Case 판정 동작)
- **PDF 다운로드**: Phase 2 로드맵 이월
  - 시도 1~5 (Pretendard TTF/OTF, Noto Sans KR woff, Nanum Gothic) 모두 react-pdf v4.4.1 호환 실패
  - Phase 2 방향: Puppeteer + 로컬 시스템 폰트 또는 외부 PDF 서비스 API
- **PDF API 구조**: A안 (LLM 재호출 제거) 완료. llmPayload 클라이언트 전달 구조

### LLM 변경
- 기본 모델: claude-sonnet-4-5 (ANTHROPIC_MODEL 환경변수 분기)
- ANTHROPIC_API_KEY 사용 (CLAUDE_API_KEY deprecated)
- API 키 trim() 적용 (401 방지)

### 보고서 UI 개선
- ② 판정 근거: 단일 박스 (좌측 라벨 제거)
- ④ 근거 및 출처 상위 헤더 추가
- 헤더: "제품명: 하이드린 캡슐 (Hydroxyurea)" + 동적 생성 시각
- gemini_seed → "1차 시드" UI 라벨

### 시스템 프롬프트 금지어 14종
- "Phase 2", "크롤링", "WAF", "Residential Proxy", "실측", "보강 예정", "우리 시스템" 등
- 대체: "2공정에서 정밀 분석 예정", "현재 가용 데이터 없음"

### 배포
- Vercel 프로젝트: `united-panama.vercel.app`

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

데이터의 **수집 시점**을 기준으로 3계층으로 구분. 이 비율은 응답 시간 단축 + 비용 절감의 근거이자 발표 방어의 핵심 논리.

- **L1 정적 seed (~85%)** — 사용자가 사전 검증·정제한 `data/seed/panama/*.json` → `seed_loaders`로 `panama` 테이블 적재. 데이터 신뢰성의 근거는 AI 생성 능력이 아닌 **사용자의 사전 검증**. Gemini는 사용자의 보조 도구이지 능동 크롤러가 아님.
- **L2 조건부 우리 크롤러 (~10%)** — `preload/` 트랙. L1 seed가 채우지 못한 빈칸을 보완. 발표 방어 시 "우리 크롤러도 작동한다"의 근거. 세션 16 현재 적재 0건 — 진단 진행 중.
- **L3 실시간 LLM 보강 (~5%)** — `freshness_checker`(해법 C 의미 게이트) 트리거 시에만 호출. L1·L2로 불가능한 실시간 빈칸 보충. 본격 구현은 Phase 2 로드맵.

**왜 9를 다시 쪼개는가**: 세션 7에서 "우리 크롤러 사용이 정말 90% 되긴 하나?" 지적. 실제로는 정적 90% 안에서도 사용자 검증 seed가 압도적이고, 우리 크롤러는 보완용에 가까움. 현실을 정확히 반영하기 위해 9의 내부를 3계층으로 세분화.

**왜 freshness 검증이 필요한가**: 정적 데이터는 시간이 지나면 정보 최신화가 필요. 규제·약가·정책은 끊임없이 갱신되므로 한 번 적재된 seed가 영원히 유효할 수 없음. 구체적 위험 사례: 2025년 1월 MINSA 행정령 2호로 WLA 국가 의약품은 10영업일 자동승인. 기존 "6~12개월" 텍스트가 그대로면 시스템은 폐지된 구형 절차를 "현재 사실"로 출력하게 됨(False Negative — 가장 위험한 실패 모드).

**해법 C (AI 의미 게이트)**: 기존 시간 규칙(updated_at 7일 초과 → 갱신) 단독 판정은 폐기. "텍스트는 깔끔한데 법령이 바뀐" 케이스를 못 잡기 때문. Phase 1 휴리스틱 → Phase 1.5 LLM Judge → Phase 2 web_search. 상세는 `docs/research/freshness_2gate_architecture.md`.

### 2. 데이터 채널 분류 — Phase A / Phase B / 거시

**수집 시점(L1/L2/L3)과 직교하는 다른 축**. 데이터의 출처 성격으로 분류.

- **Phase A 공공조달·규제 (정형)** — 정부·공공기관 발표. 신뢰도 높음. 차단 위험 낮음.
  - PanamaCompra OCDS, MINSA faddi, CSS, ACODECO
- **Phase B 민간 소매 (비정형·차단)** — 약국·유통사 가격. 차단 위험 높음 (Cloudflare WAF/Turnstile).
  - Arrocha, Metro Plus
- **거시 (별도 카테고리)** — 국가 지표·시장 통계. Phase 무관, 국가 페이지 카드 전용.
  - World Bank, ITA, KOTRA, PubMed, MOTIE

### 3. 분석 시점 흐름 (세션 12~13 결정)

기존 "10초 이내 응답" SLA는 세션 12에서 폐기. 이제 분석 버튼 클릭 시 **L2 크롤러도 함께 작동**(1~3분 허용). 단계별 진행 표시 UI 필수, 12시간 캐시로 IP 차단 회피.

```
사용자 클릭
  ↓
[1] L2 크롤링 (1~3분, 단계별 표시)
  ↓
[2] L1 seed 조회 + 충돌 판단 (data_reconciler)
  ↓
[3] L3 LLM 보강 (해법 C 트리거 시만)
  ↓
[4] 보고서 생성 + 렌더링
```

### 4. 팀 공통 규칙 준수
공통 6컬럼 강제, `pa_*` 접두어로 자유 확장.

### 5. 책임 분리
1공정은 현지 가격 수집까지. FOB 역산은 2공정. `fob_estimated_usd`는 1공정에서 NULL 적재.

### 6. IP 보호 + 수동 트리거
GitHub Actions `workflow_dispatch`만 사용. cron 금지.

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

### 파나마 자유 컬럼 (`pa_*`, 12종)

- `pa_source` — worldbank / panamacompra / arrocha / metroplus / minsa / css / acodeco / kotra / ita / motie / pubmed / who_paho / llm_search / gemini_seed / iqvia_sandoz_2024 / kotra_2026 / minsa_official / worldbank_who_ghed
- `pa_source_url` — 원본 URL
- `pa_collected_at` — 데이터 실제 생성 시점 (신선도). **DB 실제값만 사용, 하드코딩 금지** (세션 13 절대원칙)
- `pa_product_name_local` — 스페인어 원문
- `pa_ingredient_inn` — 스페인어 INN (8종 매칭 키)
- `pa_price_type` — tender_award / retail_normal / retail_promo / regulated / wholesale
- `pa_price_local` — DECIMAL(20,4)
  - **변경 이력 (헌법)**: 기존 DECIMAL(12,4) → DECIMAL(20,4) (2026-04-11). 거시 수치(WorldBank GDP $86.52B 등) + 공공 입찰가를 한 컬럼에 일관 저장하기 위함.
- `pa_currency_unit` — 응답값 그대로 (USD/PAB 등). 하드코드 금지 (세션 16 PanamaCompra 명세 정정)
- `pa_package_unit` — 1 caja x 30 tab 등
- `pa_decree_listed` — BOOLEAN, CABAMED 등재
- `pa_stock_status` — in_stock / out_of_stock / unknown
- `pa_notes` — TEXT (선택). Gemini seed 인용·메모
- `pa_released_at` — 원본 발표 시점 (세션 13 추가)

### 보조 테이블 `panama_distributors`

파트너·유통사 후보를 별도 보관. 엔진⑥ AHP 파트너 매칭(3공정)의 입력 데이터.

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

DDL: `scripts/ddl/panama_distributors.sql`

### 보조 테이블 `panama_eml`

8개 INN의 국제/국가 필수의약품목록(EML) 등재 상태 추적. 공공조달 전략 수립 시 "파나마 공공시장 진입 가능 여부"의 1차 필터.

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | UUID | PK |
| product_id | UUID | 8 INN UUID |
| market_segment | TEXT | CHECK: `eml_who` / `eml_paho` / `eml_minsa` |
| fob_estimated_usd | DECIMAL | CHECK: **IS NULL 강제** |
| confidence | DECIMAL | |
| crawled_at | TIMESTAMPTZ | |
| pa_inn_name | TEXT | NOT NULL, 스페인어 INN |
| pa_eml_listed | BOOLEAN | WHO EML 등재 여부 |
| pa_paho_procurable | BOOLEAN | PAHO Strategic Fund 조달 가능 |
| pa_minsa_essential | BOOLEAN | 파나마 MINSA 필수약 지정 |
| pa_atc_code | TEXT | 예: R05DB27 (Levodropropizine) |
| pa_therapeutic_class | TEXT | 치료 분류 |
| pa_notes | TEXT | 세부 메모 |
| pa_source_url | TEXT | 원본 URL |
| pa_raw_data | JSONB | 원시 데이터 백업 |

- **현재 적재**: 16행 (8 INN × `eml_who` + 8 INN × `eml_paho`)
- **골든 데이터**: WHO EML 2023 / PAHO Strategic Fund 모두 Hidroxiurea만 등재
- DDL: `scripts/ddl/panama_eml.sql`

#### ⚠ 파싱 원칙 (세션 3 디버깅 산물)
문자열 파싱 시 **부정 키워드 우선 매칭**. 예: "미포함" → "포함" 순서로 체크. "미포함"에 "포함"이 서브스트링으로 포함되어 발생하는 오탐을 사전 차단.

### confidence 부여
- API (WorldBank, OCDS, PubMed): **0.90~0.95**
- 정적 HTML (ITA, KOTRA, MOTIE): **0.80~0.90**
- 정부 폼 (MINSA, CSS, ACODECO): **0.70~0.85**
- 민간 약국 (Arrocha, Metro Plus): **0.65~0.80**
- LLM 실시간 보강 (L3): **0.50~0.65**

---

## 🌐 11개 사이트 — 채널 × 시점 매트릭스

| # | 사이트 | 데이터 채널 | 수집 시점 | 비고 |
|---|---|---|---|---|
| 1 | World Bank API | 거시 | L1 seed + L2 갱신 | REST JSON, GDP·인구·보건지출 |
| 2 | ITA | 거시 | L1 | trade.gov 정적 HTML |
| 3 | KOTRA | 거시 | L1 | 파나마 무역관 PDF |
| 4 | PubMed | 거시 | L1 | E-utilities API |
| 5 | MOTIE | 거시 | L1 | 한-중미 FTA |
| 6 | PanamaCompra OCDS | **Phase A** | L2 | `/api/v1/releases`. 8 INN 부재 발견 |
| 7 | MINSA faddi | **Phase A** | L2 | Session + POST + CSRF (스켈레톤) |
| 8 | CSS | **Phase A** | L2 | PDF 배치, Cloudflare 챌린지 확인됨 |
| 9 | ACODECO | **Phase A (규제)** | L1 | CABAMED 가격 통제 리스트 |
| 10 | Arrocha | **Phase B** | L2 | Cloudflare WAF (스켈레톤) |
| 11 | Metro Plus | **Phase B** | L2 | Cloudflare Turnstile (스켈레톤) |

거시 5개 / Phase A 4개 / Phase B 2개.

### Phase A 사이트 상세

#### PanamaCompra OCDS (세션 16 명세 정정)
- **엔드포인트**: `https://ocdsv2dev.panamacompraencifras.gob.pa/api/v1/releases` (옛 `/ocds/release`는 404)
- **응답 구조**: `releases[].awards[].items[]` (tender.items는 일반적으로 비어있음)
- **인증**: 불필요 (Open API)
- **TLS**: 서버 인증서 만료, `rejectUnauthorized: false` 필수
- **UNSPSC 필터**: 51000000 적용 시 노이즈 다수 → 필터 제거 후 키워드 매칭으로 전환
- **8 INN 매칭**: 7,500건 샘플 0건. 별도 검색 API 필요 또는 데이터셋 자체에 부재

#### CSS (사회보장기금)
- **URL**: `https://www.css.gob.pa`
- **응답**: 403 + Cloudflare 챌린지 (세션 16 실측)
- **현재 코드**: 부분 구현 (149줄, PDF 파싱 일부)
- **상태**: Cloudflare 우회 필요 → 세션 17+ 또는 Phase 2 이월

#### MINSA faddi
- **인증**: Session + POST + CSRF
- **현재 코드**: 스켈레톤 (72줄)
- **상태**: 본격 구현 미진입

#### ACODECO
- **데이터**: Decreto Ejecutivo CABAMED 가격 통제 리스트 (정적)
- **현재 적재**: 2건

### Phase B 사이트 상세

#### Arrocha
- **URL**: `https://www.arrocha.com`
- **세션 16 실측**: 200 OK, cf-mitigated 헤더 없음 → Cloudflare 우회 가능성 재검토 필요
- **현재 코드**: 스켈레톤 (55줄, dry-run만)

#### Metro Plus
- **URL**: `https://www.metroplusrx.com`
- **세션 16 실측**: DNS 실패 (네트워크 의존, 다른 환경에서 재확인 필요)
- **현재 코드**: 스켈레톤 (43줄)

### Phase B 후퇴 옵션 (세션 16 결정 대기)

Cloudflare 우회 비용($50/월 Residential Proxy + 8시간+ 작업) 대비 효과 낮음. ERP fallback (인접 5개국 콜·페·멕·칠 참조가) 유지하고 보고서에 한계 명시하는 것이 합리적.

---

## 🔄 분석 시점 흐름

```
[L1 사전 적재] gemini_seed JSON 32건 + 거시·공공 14건 + COMPETITOR 4건
  → seed_loaders로 panama 테이블 적재 (50건)

⋮ 데이터 대기 ⋮

[분석 시점] 사용자 클릭
  ↓ (1~3분 허용, 단계별 표시 UI)
  L2 크롤링 (Phase A·B 사이트 호출)
  ↓
  L1 seed 조회 + data_reconciler 충돌 판단
  ↓
  L3 LLM 보강 (해법 C 트리거 시만)
  ↓
  보고서 생성 + 렌더링
  ↓
  12시간 캐시 (panama_report_cache)
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
[진입] ⑦ Polite + ⑩ Resource Blocking → [탐색] ① WebWalker → [전처리] ⑧ HTML Preprocessing → [추출] ② Wrapper Maintenance → [정제1] ③ SAND → [정제2] ④ ComEM → [적재1] ⑤ XGrammar → [적재2] ⑨ EBNF → [적재3] ⑥ Atomic Calibration → Supabase INSERT

### 신규 기법 3개 설계 목적
- ⑧ HTML Preprocessing: Opus 입력 토큰 70~80% 절감 (실측 76.3%)
- ⑨ EBNF Constrained Extraction: 필드 누락·타입 오류 토큰 레벨 차단
- ⑩ Lightweight Resource Blocking: Arrocha/Metro Plus 5배 빠름 + 파나마 서버 부담 80% 감소

---

## 📁 디렉토리 구조

```
panama-crawler/
├── .github/workflows/
│   ├── pa_static_macro.yml       # 거시 L1 갱신
│   ├── pa_static_public.yml      # Phase A L2
│   ├── pa_static_private.yml     # Phase B L2
│   ├── pa_realtime_search.yml    # L3
│   └── pa_health_check.yml
├── src/
│   ├── crawler/                  # ⑦ Polite Scraping
│   ├── agents/                   # ① WebWalker ② Wrapper Maintenance
│   ├── cleansing/                # ③ SAND ④ ComEM
│   ├── crawlers/
│   │   ├── base/
│   │   ├── preload/              # L2 크롤러 (Phase A·B 모두 여기)
│   │   └── realtime/             # L3 LLM 보강
│   ├── seed_loaders/             # L1 정적 seed 로더
│   ├── utils/                    # ⑤ XGrammar ⑥ Atomic + db_connector
│   ├── logic/                    # case_judgment, fetch_panama_data, freshness_checker
│   └── config/                   # product-dictionary.ts
├── data/seed/panama/             # L1 정적 seed JSON
├── scripts/runners/
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
9. **`pa_source_type` 컬럼 사용 금지** — 세션 3 디버깅 결과 잉여 필드. `pa_source`만 사용
10. **문자열 파싱 시 부정 키워드 우선 매칭** — "미포함" → "포함" 순서 강제
11. **데이터 신뢰성 근거는 사용자 사전 검증** — AI 생성 능력 아님. Gemini는 보조 도구
12. **freshness 판정은 해법 C (AI 의미 게이트)** — 시간 규칙 단독 판정 금지. `docs/research/freshness_2gate_architecture.md` 준수. 본격 구현은 Phase 2 로드맵
13. **`pa_collected_at` 등 timestamp는 DB 실제값만 사용, 하드코딩 금지** (세션 13)
14. **제품 매칭 시 form·strength·unit 다중 필터 필수** — CR/일반, 캡슐/시럽 엄격 구분 (세션 13)
15. **L2 크롤링 통합 시 12시간 캐시 강제** — IP 차단 회피, `panama_report_cache` 활용 (세션 13)
16. **PanamaCompra `pa_currency_unit`은 응답값 그대로** — 하드코드 USD 금지 (세션 16)
17. **PanamaCompra UNSPSC 51000000 필터 사용 금지** — 노이즈 다수, 키워드 매칭으로 대체 (세션 16)

---

## 🔗 관련 설계 문서

- [REPORT1_SPEC.md](REPORT1_SPEC.md) — 보고서 1장 5개 블록 구조
- [USER_FLOW.md](USER_FLOW.md) — 사용자 여정 5단계 플로우
- [CURSOR_INSTRUCTIONS.md](CURSOR_INSTRUCTIONS.md) — Cursor 작업 지시서
- [TECHNIQUES_STATUS.md](TECHNIQUES_STATUS.md) — 10가지 기법 진척도
- [docs/research/freshness_2gate_architecture.md](docs/research/freshness_2gate_architecture.md) — 해법 C 설계 박제 (Phase 2 로드맵)