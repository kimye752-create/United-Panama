# 10가지 크롤링 기법 — 적용 현황 매트릭스 (Session 23)

> 출처: `ARCHITECTURE.md` § 10가지 크롤링 기법.
> 분류: **실구현 5** / **Skeleton 2** / **Phase 2 연기 3** (Session 16 마무리 반영, Session 23 중간안 D-1·D-2 추가)

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
[2] 환율 EXIM API 런타임 호출 (L3 5%, 실시간)  ✅ D-1 복원
[3] 신선도 판정 (Haiku Judge, 5%)
[4] DB 신선도 상태 갱신 (pa_freshness_status 마킹 → 다음 GitHub Actions에서 자동 재크롤링)
[5] Case 판정 + entryFeasibility (규칙 기반, 10%)
[6] 프롬프트 조립 (rawDataDigest + 제품 dictionary)
[7] Haiku API 호출 (보고서 5블록 합성)  🔴 현재 크레딧 문제로 fallback 중
[8] panama_report_cache 저장 (24h TTL)
[9] Response JSON → Report1.tsx A4 WYSIWYG 렌더링
```

### 🔄 신선도 가교 흐름 (세션 23 확정)

```
[런타임 분석] → Haiku가 "이 데이터 오래됐음" 판정 → pa_freshness_status = 'stale_confirmed' 마킹
              ↓
[달강님 주 1회] GitHub Actions 수동 실행 → v_stale_items VIEW가 stale 항목 자동 선별
              ↓
해당 항목만 Colombia/SuperXtra/ACODECO 재크롤링 → pa_freshness_status = 'fresh' 복원
```

---

## 요약

| 분류 | 개수 | 번호 |
|------|------|------|
| 실구현 | 5 | ③ SAND, ④ ComEM, ⑦ Polite, ⑧ HTML Preproc, ⑨ EBNF |
| Skeleton | 2 | ⑤ XGrammar(`xgrammar_enforcer`), ⑩ Resource Blocking(`stealth_setup`) |
| Phase 2 연기 | 3 | ① WebWalker, ② Wrapper Maintenance, ⑥ Atomic Calibration |

---

## 상세 매트릭스

| # | 기법 | 상태 | 구현·참조 위치 |
|---|------|------|----------------|
| ① | WebWalker | 🔴 **Phase 2 연기** | `src/agents/webwalker_core.ts` — `exploreWithWebWalker` throw |
| ② | Wrapper Maintenance | 🔴 **Phase 2 연기** | `src/agents/wrapper_maintenance.ts` — `runWrapperMaintenance` throw |
| ③ | SAND | 🟢 **구현 완료** | `src/cleansing/sand_outlier.ts` — IQR |
| ④ | ComEM | 🟢 **구현 완료** | `src/cleansing/comem_matcher.ts` |
| ⑤ | XGrammar | 🟡 **Skeleton 완료** | `src/utils/xgrammar_enforcer.ts` — 포스트 파싱 검증 |
| ⑥ | Atomic Calibration | 🔴 **Phase 2 연기** | `src/utils/atomic_factchecker.ts` — `verifyAtomicClaim` throw |
| ⑦ | Polite Scraping | 🟢 **구현 완료** | `src/crawler/stealth_setup.ts` + preload 크롤러 |
| ⑧ | HTML Preprocessing | ✅ **완성** | `src/utils/html_preprocessor.ts` (실측 76.3% 토큰 절감) |
| ⑨ | EBNF Constrained Extraction | ✅ **완성** | `src/utils/ebnf_schemas.ts` |
| ⑩ | Lightweight Resource Blocking | 🟡 **Skeleton** | `src/crawler/stealth_setup.ts` — `applyResourceBlocking` |

---

## 실구현 범위 (1공정, 세션 16 마무리 시점)

### L1 정적 seed (메인, 적재 정상)
- `load_macro` — round1_macro.json
- `load_eml` — round2_eml.json (16건)
- `load_market_intel` — round3_market_intel.json (panama_distributors 4건)
- `load_regulatory_milestones` — 규제 마일스톤 2건 (세션 13)
- `load_prevalence` — round4_prevalence.json (세션 16, 9건 = 8 INN + MACRO)
- `load_paho_reference_prices` — PAHO 권역 단가 (세션 16)

### L2 거시 크롤러 (정상 작동)
- pa_worldbank, pa_ita, pa_kotra, pa_motie, pa_pubmed (5종)

### L2 Phase A 크롤러 (적재 0건 — 진단·후퇴 완료)
| 사이트 | 코드 상태 | 라이브 응답 | 적재 | 상태 |
|---|---|---|---|---|
| PanamaCompra OCDS | 완성 (424줄, 세션 16 명세 정정) | 200 OK | 0건 | 8 INN 부재 진단 완료 (7,500건 0매칭) |
| MINSA faddi | 스켈레톤 (72줄) | — | 0건 | CSRF 미구현 |
| CSS | 부분 (149줄) | 403 + Cloudflare | 0건 | 차단 (Phase 2) |
| ACODECO | 정상 | — | 2건 | **세션 17 1순위 — 153품목 확장** |

### L2 Phase A 규제 (세션 16 신규 발견, 세션 17 진입 예정)
| 사이트 | URL | 우선순위 |
|---|---|---|
| **DNFD 공공 조회 포털** | tramites-minsa.panamadigital.gob.pa | 🔴 세션 17 2순위 |
| **DNFD 공식 사이트** | dnfd.minsa.gob.pa | 🟡 세션 17 3순위 |

### L2 Phase B 크롤러 (적재 0건, Arrocha·Metro Plus 후퇴)
| 사이트 | 세션 16 라이브 검증 | 결정 |
|---|---|---|
| Arrocha | Shopify ✅, /products.json 200 ✅, **의약품 컬렉션 차단 🔴** | 후퇴 (Phase 2) |
| Metro Plus | WordPress/WooCommerce (Shopify 가설 기각) | 후퇴 (Phase 2) |
| El Javillo, Revilla, FarmaValue, Saba, Super 99, Riba Smith | 미검증 | 세션 17 작업 10 (정찰) |

### 정제·인프라
- SAND IQR 이상치 — 적용
- ComEM 스페인어 정규화 — 적용
- Polite Scraping 1.5~3초 딜레이 — 적용
- HTML Preprocessing 76.3% 절감 — 실측
- EBNF JSON 강제 — 적용

### 프론트·보고서
- Next.js 14 App Router + Tailwind v3 + Pretendard
- 보고서 1장 5블록 (REPORT1_SPEC 준수)
- LLM 3단 체인 (Opus → Sonnet → fallback)
- panama_report_cache 24h TTL
- Vercel 베타 배포 (`united-panama.vercel.app`)
- **세션 16 버그 4종 + 잘림 + scope footer 모두 통과**

---

## 세션 16 보고서 품질 강화 — 통과 항목

| # | 항목 | 통과 결과 |
|---|---|---|
| 1 | 역학 INN 교차오염 (H.pylori) | ✅ product_id 엄격 필터 |
| 2 | 파트너 이름 중복 (Haseth 3회 등) | ✅ dedupe + 시스템 프롬프트 룰 |
| 3 | PAHO $0.188 누락 | ✅ paho_reference_prices.ts 주입 |
| 4 | 보건지출 $1,547 → $1,557.81 | ✅ World Bank/WHO GHED 2023 |
| 5 | prevalence 8 INN 신규 적재 | ✅ gemini_prevalence (5건 파나마 실측) |
| 6 | 판정근거 1·5번 잘림 (100자) | ✅ `[200,100,100,100,250]` 차등 |
| 7 | Aceclofenac scope=latam_average | ✅ 본문 분리 + footer 표시 |

---

## Phase 2 로드맵 — AI 기반 의미적 신선도 판정 2단계 게이트 (해법 C)

> 세션 8 박제. L3 web_search 트리거를 담당하는 게이트 설계.

| 항목 | 상태 | 위치 |
|---|---|---|
| 설계 문서 | ✅ 박제 완료 | `docs/research/freshness_2gate_architecture.md` |
| 인터페이스 스켈레톤 | 🔴 미작성 | `src/logic/freshness_checker.ts` |
| Phase 1 휴리스틱 | 🔴 Phase 2 로드맵 | 정규식+메타데이터, staleScore 가중치 |
| Phase 1.5 LLM Judge | 🔴 Phase 2 로드맵 | Haiku, max_tokens 극단 제한 |
| Phase 2 web_search | 🔴 Phase 2 로드맵 | Anthropic, allowed_domains 강제 |

**핵심 원칙**:
- 시간 규칙 단독 판정 금지 (False Negative 방지 — 2025.1 MINSA 행정령 케이스)
- 차등 TTL: 정적 컬럼 3년+ / 변동 컬럼 3개월 / 초고위험 90일 default-deny
- staleScore ≥70 → Phase 2 직행, 0<score<70 → LLM Judge, 0 → 통과

---

## 엔진⑦ PDF 자동 생성 — Phase 2 이월

| 항목 | 상태 |
|---|---|
| PDF API A안 구조 | ✅ 완성 (세션 12) |
| react-pdf + 한글 폰트 | 🔴 Phase 2 (5회 시도 실패) |
| 9페이지 통합 PDF | 🔴 Phase 2 |

세션 12 시도 이력: Pretendard TTF/OTF, PretendardStd, Noto Sans KR woff, Nanum Gothic woff — 모두 react-pdf v4.4.1 + 한글 호환성 이슈로 실패.

다음 세션 우선 시도:
1. Puppeteer + 웹 화면 PDF 캡처
2. PDFKit 직접 사용 + 시스템 폰트
3. 외부 PDF 생성 API (DocRaptor, PDFShift 등)

---

## 세션 17 작업 큐 (12개, 32~42시간)

| 순서 | 작업 | 시간 | 성공 측정 |
|---|---|---|---|
| 🔴 1 | ACODECO PDF 파서 | 4~6h | 50건+ INSERT |
| 🔴 2 | DNFD 공공 조회 포털 (Playwright) | 3~4h | 자사 8 INN 등록 8행 |
| 🟡 3 | DNFD 공식 사이트 (정적) | 2~3h | 5건+ INSERT |
| 🟡 4 | FarmaValue Playwright | 2~3h | 8 INN 매칭 가격 |
| 🟡 5 | INN 빠른 전환 탭 UI | 2~3h | 발표 임팩트 |
| 🟡 6 | Perplexity API + 보고서 3페이지 | 3~4h | 학술 8편 |
| 🟢 7 | data_reconciler 6규칙 | 4~5h | 충돌 자동 해결 |
| 🟢 8 | ATC 코드 + product_matcher 5단계 | 3~4h | 매칭 위계 |
| 🟢 9 | product-dictionary form/strength | 2h | CR/일반 구분 |
| 🟢 10 | 신규 6사 라이브 검증 | 2h | 정찰 |
| 🟢 11 | ITA RAG 추출 | 2~3h | 거시 자동 갱신 |
| 🟢 12 | 보고서 2페이지 (데이터 투명성) | 3h | 5개 블록 |

---

## 변경 이력

- Session 7 W0~W4: 최초 문서화, 보고서 1장 UI 완성.
- Session 8: 해법 C (AI 의미 게이트) Phase 2 로드맵 박제.
- Session 12: 엔진⑦ PDF Phase 2 이월. 시스템 프롬프트 금지어 14종.
- Session 13: 거시 카드 정밀화, 규제 마일스톤 시드 신규.
- **Session 16**: 용어 체계 이중 축 정립 (L1/L2/L3 + Phase A/B). PanamaCompra 명세 정정. **버그 4종 수정 + 잘림 fix + scope footer + prevalence 8 INN 신규 적재**. Arrocha·Metro Plus 정찰·후퇴 결정. DNFD 신규 발견 (3 사이트). 사이트 19개 → 23개 매트릭스 확장. 절대원칙 18·19·20 신규 (실제 INSERT 측정 + product_id 엄격 + 판정근거 차등 maxLength).
- **Session 19 (2026-04-15)**: 신 8제품 전면 재구성 (Rosumeg, Atmeg, Ciloduo, Gastiin CR, Omethyl, Sereterol, Gadvoa, Hydrine). UUID 8개 재사용. product-dictionary.ts 필드 확장 (atc4_code, secondary_atc4, is_combination_drug, hs_code, therapeutic_area, formulation, patent_tech, panama_target).
- **Session 20 (2026-04-15)**: PanamaCompra V3 수동 PDF 16건 (Rosumeg 5·Hydrine 3·Ciloduo 3·Atmeg 2·Sereterol 3). Colombia Socrata 109건 + SuperXtra 15건 적재. panama 테이블 175행 도달. PanamaCompra V3 자동화 포기 확정.
- **Session 22 (2026-04-16)**: Gaceta Oficial Ley 419 de 2024 박제. MINSA WLA 고시 박제. Anthropic 크레딧 문제 대두.
- **Session 23 (2026-04-16, D-8)**: 중간안 D-1 환율 런타임 복원 + D-2 GitHub Actions 조건부 크롤러 도입. 2공정 LLM Generator + UI 완성 (Haiku 단일화). 보고서 생성 전체 로직 박제 (이 문서 최상단). 신선도 가교 구조 확정. v_stale_items VIEW + freshness_refresh_runner.ts + freshness_refresh.yml 신규. Rosumeg Tier 매칭 라벨 정정 SQL. Rx/OTC 엄격 분리 원칙 추가.