# 10가지 크롤링 기법 — 적용 현황 매트릭스 (Session 16)

> 출처: `ARCHITECTURE.md` § 10가지 크롤링 기법.
> 분류: **실구현 5** / **Skeleton 2** / **Phase 2 연기 3** (Session 16 마무리 반영)

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