# UPharma Export AI — 전체 유저 플로우 (End-to-End Flow)

> **세션 23 / 2026-04-16 갱신**
> KITA 무역AX 1기 · 한국유나이티드제약 5조
> 사용자(해외마케팅·영업 담당자)가 대시보드 접속부터 PDF 다운로드까지의 전체 여정
> **세션 23 변경**: 중간안 D-1 환율 런타임 복원 + D-2 GitHub Actions 조건부 크롤러 도입. 보고서 생성 전체 로직 박제 (필독). 2공정 UI/API 완성. 신 8제품 반영.

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

## 🎯 설계 철학

**"5클릭 이내, 1~3분 이내 신뢰도 있는 보고서 도출"**
해외영업 담당자가 조사 대상 국가·품목을 선택하면 데이터 수집부터 보고서 생성까지 전 과정이 자동으로 진행된다. 사용자는 분석 근거 데이터를 보유하고 있을 필요가 없다.

**※ 세션 12에서 결정**: 기존 "10초 이내 응답" SLA는 폐기. 분석 시점에 L2 크롤링도 함께 작동(1~3분). 단계별 진행 표시 UI로 사용자 인내심 확보. 12시간 캐시로 IP 차단 회피.

---

## 📊 전체 플로우 다이어그램

```
┌──────────────────────────────────────────────────────────┐
│ [1단계] 통합 대시보드 진입                                   │
│ URL: vercel.app/ (팀원들이 만든 국가 결합 페이지)             │
│ 구성: 20개국 지도 + 권역별 카드                              │
└─────────────────┬────────────────────────────────────────┘
                  │
                  │ 사용자가 "파나마" 카드 클릭
                  ▼
┌──────────────────────────────────────────────────────────┐
│ [2단계] 파나마 국가 페이지                                   │
│ URL: united-panama.vercel.app/panama                      │
│ 구성:                                                      │
│   ├─ 거시 지표 카드 (GDP/인구/보건/시장성장률 IQVIA 3.4%)   │
│   ├─ 진출 호재 카드 (MINSA fast-track 등 규제 마일스톤)     │
│   ├─ 한-중미 FTA·위생선진국 지정 배지                        │
│   ├─ 8 INN 품목 드롭다운 (TARGET_PRODUCTS)                  │
│   └─ [진출 적합 분석] 버튼                                   │
└─────────────────┬────────────────────────────────────────┘
                  │
                  │ 사용자가 드롭다운에서 제품 선택
                  │ (예: "하이드린 캡슐 — Hydroxyurea 500mg")
                  │ [진출 적합 분석] 버튼 클릭
                  ▼
┌──────────────────────────────────────────────────────────┐
│ [3단계] 분석 파이프라인 실행 (1~3분, 단계별 진행 표시)         │
│ 12시간 캐시 적용, 강제 새로고침 버튼 제공                     │
│                                                            │
│ ✅ 1/8 PanamaCompra (Phase A): 신규 낙찰 X건 발견          │
│ ✅ 2/8 World Bank: GDP 갱신 확인                           │
│ ⏳ 3/8 MINSA 위생 등록 정보 수집 중...                      │
│ ⏳ 4/8 CSS 보험 약가 조회 중...                             │
│ ⏳ 5/8 ACODECO 가격 통제 리스트 확인 중...                  │
│ ⏳ 6/8 ERP 인접국 참조가 비교 중...                         │
│ ⏳ 7/8 data_reconciler 충돌 판단 중...                     │
│ ⏳ 8/8 보고서 생성 중...                                    │
│                                                            │
│ 단계별 처리:                                                │
│   ① L2 크롤링 (Phase A·B 사이트)                            │
│   ② L1 seed 조회 + data_reconciler 충돌 판단                │
│   ③ SAND 이상치 필터 + ComEM 엔티티 매칭                    │
│   ④ Case 판정 엔진 (규칙 기반 A/B/C, LLM 사용 안 함)         │
│   ⑤ 보고서 생성 (LLM Opus → Sonnet → fallback 3단)          │
└─────────────────┬────────────────────────────────────────┘
                  │
                  │ L3 LLM 보강 (해법 C 트리거 시만)
                  │ ※ Phase 2 로드맵, 본격 구현 미진입
                  ▼
┌──────────────────────────────────────────────────────────┐
│ [4단계] 보고서 1장 표시 (웹 뷰)                               │
│ URL: united-panama.vercel.app/panama/report/hydroxyurea    │
│ 구성 (REPORT1_SPEC.md 준수):                                │
│   블록 1: 헤더 (브랜드·INN·HS·Case·confidence)              │
│   블록 2: 판정 한 줄 🟢/🟡/🔴                                │
│   블록 3: 두괄식 근거 3줄                                    │
│   블록 4: 시장 진출 전략 (진입 채널·가격·파트너·리스크)         │
│   블록 5: 근거·출처 (Supabase 집계표 + 카테고리별 URL)         │
└─────────────────┬────────────────────────────────────────┘
                  │
                  │ 보고서 2·3페이지 (세션 17+ 작업 큐, 미구현)
                  │   2페이지: 데이터 투명성 (감사 추적)
                  │   3페이지: 학술 자료 (Perplexity Sonar Pro)
                  ▼
┌──────────────────────────────────────────────────────────┐
│ [5단계] PDF 다운로드 (Phase 2 이월)                          │
│ 현재: 버튼 disabled, "Phase 2" 라벨                          │
│ 시도 이력: react-pdf v4.4.1 + 한글 폰트 5회 실패             │
│ 다음 시도: Puppeteer + 로컬 시스템 폰트 또는 외부 API         │
└──────────────────────────────────────────────────────────┘
```

---

## 🔄 데이터 흐름 (Data Flow)

### Supabase + L2 크롤링 → data_reconciler → 판정 → 렌더링

```
┌─────────────────┐         ┌─────────────────┐
│ Supabase (L1)    │         │ L2 크롤링 (분석 시점)│
├─────────────────┤         ├─────────────────┤
│ panama (50건)    │         │ Phase A 4종      │
│ panama_distrib(4)│         │   PanamaCompra   │
│ panama_eml (16)  │         │   MINSA          │
│ panama_report_   │         │   CSS            │
│   cache (12h TTL)│         │   ACODECO        │
└────────┬────────┘         │ Phase B 2종      │
         │                  │   Arrocha        │
         │                  │   Metro Plus     │
         │                  └────────┬────────┘
         │                           │
         └─────────┬─────────────────┘
                   │
                   │ [src/logic/data_reconciler.ts]
                   │ 충돌 판단 4규칙 (세션 17+ 신규)
                   ▼
         ┌─────────────────────────┐
         │ 정제된 데이터 셋          │
         │ + SAND 이상치 필터        │
         │ + ComEM 엔티티 매칭       │
         └────────┬────────────────┘
                  │
                  │ [lib/case_judgment.ts]
                  │ 규칙 기반 Case A/B/C (LLM 없음)
                  ▼
         ┌─────────────────────────┐
         │ JudgmentResult          │
         │ - case: 'A'|'B'|'C'     │
         │ - verdict: 가능/조건부/불가│
         │ - reasoning[] (3줄)     │
         │ - risks[]               │
         └────────┬────────────────┘
                  │
                  │ [LLM 보고서 생성]
                  │ Opus → Sonnet → fallback 3단
                  │ Tool Use JSON Schema 강제
                  ▼
         ┌─────────────────────────┐
         │ 보고서 1장 (웹 뷰)        │
         │ panama_report_cache 저장 │
         └─────────────────────────┘
```

---

## 🎬 사용자 여정 상세 (User Journey)

### 페르소나
**김마케팅** (한국유나이티드제약 해외마케팅팀 대리, 5년차)
- 목표: 파나마 시장 진출 가능성 5분 내 1차 판단
- 컨텍스트: 킥오프 미팅 앞두고 "우리 8개 주력 품목 중 어느 것이 파나마에 맞는지" 상사 보고 준비

### 여정 단계 (세션 16 기준)

| 시간 | 액션 | 화면 | 기대값 |
|---|---|---|---|
| 0초 | vercel.app 접속 | 대시보드 (20개국 지도) | 즉시 로드 |
| 3초 | "파나마" 클릭 | 파나마 국가 페이지 | 거시 카드·진출 호재 카드·FTA 배지 보임 |
| 10초 | 8 INN 드롭다운 펼침 | 드롭다운 오버레이 | 한글 브랜드명 + INN 병기 |
| 12초 | "하이드린 캡슐" 선택 | 버튼 활성화 | 선택 시각 피드백 |
| 13초 | [진출 적합 분석] 클릭 | 로딩 화면 | 8단계 진행 표시 |
| ~2분 | 분석 진행 중 | 단계별 카운터 | 실시간 발견 데이터 표시 |
| 2분 5초 | 분석 완료 | 보고서 1장 | 🟢 Case A 판정 |
| 2분 10초 | 블록 2 판정 확인 | 스크롤 없이 결론 파악 | "가능" 인지 |
| 2분 30초 | 블록 3~4 본문 읽기 | 스크롤 | 근거 내재화 |
| 3분 | 블록 5 출처 확인 | 하단 스크롤 | 신뢰도 체크 |
| 3분 5초 | (Phase 2) PDF 다운로드 | — | Phase 2 이월 |

**총 소요 시간: 약 3분** (수동 조사 대비 95% 이상 단축, 12시간 내 재분석 시 캐시 즉시 응답)

---

## 🔧 기술 스택 매핑

| 플로우 단계 | 기술 | 파일 |
|---|---|---|
| [1단계] 대시보드 | Next.js App Router | `app/page.tsx` |
| [2단계] 파나마 페이지 | Next.js + Tailwind | `app/panama/page.tsx` |
| [3단계] L2 크롤링 | TypeScript + axios/undici | `src/crawlers/preload/*.ts` |
| [3단계] data_reconciler | 순수 TypeScript | `src/logic/data_reconciler.ts` (세션 17+) |
| [3단계] 분석 API | Server Action / Route Handler | `app/api/panama/analyze/route.ts` |
| Supabase 조회 | @supabase/supabase-js | `lib/supabase.ts` |
| Case 판정 | 순수 TypeScript | `src/logic/case_judgment.ts` |
| SAND 이상치 | 순수 TypeScript | `src/cleansing/sand_outlier.ts` |
| ComEM 매칭 | 순수 TypeScript | `src/cleansing/comem_matcher.ts` |
| LLM 보고서 | Anthropic SDK | `src/llm/report1_generator.ts` |
| 캐시 | Supabase Table | `panama_report_cache` (12h TTL) |
| [4단계] 보고서 렌더링 | React Client Component | `components/Report1.tsx` |
| [5단계] PDF 생성 | Phase 2 이월 | `lib/pdf/Report1Document.tsx` (현재 disabled) |

---

## 🚧 2·3공정 연결 지점 (향후 확장)

현재 세션 16 기준 구현은 **1공정 (시장 조사 → 보고서 1)** 만 완성. 2·3공정은 "준비 중" 페이지로 처리하되, 보고서 1의 데이터가 2·3공정의 입력이 되도록 설계.

### 보고서 1 → 보고서 2 (FOB 역산) 연결
- **입력**: 블록 4-2의 가격 포지셔닝 데이터
- **처리**: Logic A (공공 입찰 역산) / Logic B (민간 소매 역산)
- **출력**: 보고서 2 (수출 전략 제안서)
- **공정 잠금**: 보고서 1 완료 후에만 "[2공정 실행]" 버튼 활성화

### 보고서 1 → 보고서 3 (파트너 매칭) 연결
- **입력**: panama_distributors 4건 + Case 판정 결과
- **처리**: AHP 기반 PSI 점수화 (엔진⑥)
- **출력**: 보고서 3 (파트너 Top 10 리스트)
- **공정 잠금**: 보고서 1·2 완료 후에만 "[3공정 실행]" 버튼 활성화

---

## ⚠ 절대 원칙 (플로우 협상 불가)

1. **분석 응답 시간 1~3분 허용** — 분석 시점에 L2 크롤링 통합 (세션 12 결정, 기존 10초 SLA 폐기)
2. **단계별 진행 표시 UI 필수** — 사용자 인내심 확보, 발견 데이터 실시간 노출
3. **12시간 캐시 강제** — IP 차단 회피, `panama_report_cache` 활용
4. **강제 새로고침 버튼 제공** — 사용자가 즉시 풀 크롤링 가능
5. **L3(web_search)는 해법 C 의미 게이트 트리거** — 시간 규칙 단독 판정 금지. `docs/research/freshness_2gate_architecture.md` 참조. Phase 2 로드맵.
6. **공정 잠금 구조** — 1 → 2 → 3 순차 실행, 중간 스킵 불가
7. **사용자는 분석 근거 데이터를 보유할 필요 없음** — 시스템이 자동 수집·구조화
8. **PDF는 @react-pdf/renderer 또는 Puppeteer** — Phase 2에서 결정
9. **한국어 UI + 한국어 보고서** — 영문 병기는 회사명·정부기관명·INN만
10. **`pa_collected_at` 등 timestamp는 DB 실제값만 사용, 하드코딩 금지** (세션 13)

---

## 📌 세션 히스토리

- **세션 7 (2026-04-12)**: 달강이 전체 플로우 설명 + 구조 확정. 인사이트 선행 → 본문 분석 → 근거 후행 원칙.
- **세션 11 (2026-04-12)**: 다이어그램 Phase B 주석 패치 + 절대원칙 §3 교체. 해법 C (AI 2단계 게이트) 명시. 9:1 + 3계층 표현 통일.
- **세션 12 (2026-04-12)**: 10초 SLA 폐기, 분석 1~3분 허용. L2 크롤링 분석 시점 통합 결정. 12시간 캐시·강제 새로고침 버튼·단계별 진행 표시 UI 의무화.
- **세션 13 (2026-04-12)**: 거시 카드 정밀화 (성장률 IQVIA 단일 표기, 인구·보건 파싱 fix). 규제 마일스톤 카드 신규.
- **세션 16 (2026-04-13)**: 용어 체계 이중 축 정립 (수집 시점 L1/L2/L3 + 데이터 채널 Phase A/B). 분석 시점 흐름 다이어그램 갱신. 8단계 진행 표시 명시.
- **세션 19 (2026-04-15)**: 신 8제품 전면 재구성 (Rosumeg, Atmeg, Ciloduo, Gastiin CR, Omethyl, Sereterol, Gadvoa, Hydrine). UUID 8개 재사용. Gemini 교차검증 기반 파나마 우선 2개 (Rosumeg + Omethyl).
- **세션 20 (2026-04-15)**: PanamaCompra V3 수동 PDF 16건 INSERT (Rosumeg 5·Hydrine 3·Ciloduo 3·Atmeg 2·Sereterol 3). Colombia Socrata 109건 + SuperXtra 15건 적재. panama 테이블 175행 도달.
- **세션 22 (2026-04-16)**: Gaceta Oficial Ley 419 de 2024 박제 + MINSA WLA 고시 박제. Anthropic 크레딧 문제 대두.
- **세션 23 (2026-04-16, D-8)**: 중간안 D-1 환율 런타임 복원 + D-2 GitHub Actions 조건부 크롤러 도입. 2공정 UI/API 완성. 보고서 생성 전체 로직 박제 (이 문서 최상단). Rosumeg Tier 매칭 라벨 정정 SQL. Rx/OTC 엄격 분리 원칙 추가. 신선도 가교 구조 확정 (런타임 마킹 + 수동 재크롤링).

---

**본 문서는 UPharma Export AI의 사용자 여정 근거이며, W4 ~ W5 구현 시 반드시 준수해야 함.**