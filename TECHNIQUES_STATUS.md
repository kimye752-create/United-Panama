# 10가지 크롤링 기법 — 적용 현황 매트릭스 (Session 16)

> 출처: `ARCHITECTURE.md` § 10가지 크롤링 기법.
> 분류: **실구현 5** / **Skeleton 2** / **Phase 2 연기 3** (Session 16 반영)

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

## 실구현 범위 (1공정, 세션 16 시점)

### L1 정적 seed (메인, 적재 정상)
- `load_macro` — round1_macro.json
- `load_eml` — round2_eml.json (16건)
- `load_market_intel` — round3_market_intel.json (panama_distributors 4건 포함)
- `load_regulatory_milestones` — 규제 마일스톤 2건 (세션 13)

### L2 거시 크롤러 (정상 작동)
- `pa_worldbank` (GDP·인구·보건지출)
- `pa_ita`, `pa_kotra`, `pa_motie`, `pa_pubmed`

### L2 Phase A 크롤러 (적재 0건)
| 사이트 | 코드 상태 | 라이브 응답 | 적재 |
|---|---|---|---|
| PanamaCompra OCDS | 완성 (424줄, 세션 16 명세 정정) | 200 OK | **0건** — 7,500건 샘플 8 INN 0매칭 |
| MINSA faddi | 스켈레톤 (72줄) | — | **0건** |
| CSS | 부분 (149줄) | 403 + Cloudflare 챌린지 | **0건** |
| ACODECO | 정상 | — | 2건 |

### L2 Phase B 크롤러 (적재 0건, 후퇴 검토 중)
| 사이트 | 코드 상태 | 세션 16 실측 | 적재 |
|---|---|---|---|
| Arrocha | 스켈레톤 (55줄, dry-run) | 200 OK, cf-mitigated 헤더 없음 | **0건** |
| Metro Plus | 스켈레톤 (43줄) | DNS 실패 (네트워크 의존) | **0건** |

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

---

## Phase 2 로드맵 — AI 기반 의미적 신선도 판정 2단계 게이트 (해법 C)

> 세션 8 신규 추가. L3 web_search 트리거를 담당하는 게이트 설계.

| 항목 | 상태 | 위치 |
|---|---|---|
| 설계 문서 | ✅ 박제 완료 (세션 8) | `docs/research/freshness_2gate_architecture.md` |
| 인터페이스 스켈레톤 | 🔴 미작성 | `src/logic/freshness_checker.ts` |
| Phase 1 휴리스틱 | 🔴 Phase 2 로드맵 | 정규식+메타데이터, staleScore 가중치 |
| Phase 1.5 LLM Judge | 🔴 Phase 2 로드맵 | Haiku, max_tokens 극단 제한 |
| Phase 2 web_search | 🔴 Phase 2 로드맵 | Anthropic, allowed_domains 강제 |
| 야간 배치 분리 | 🔴 운영 진입 시 | 응답 시간 회피 목적 |

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
| 폰트 번들링 전략 | 🔴 Phase 2 (Puppeteer 대체 검토) |
| 9페이지 통합 PDF | 🔴 Phase 2 |

세션 12 시도 이력: Pretendard TTF/OTF, PretendardStd, Noto Sans KR woff, Nanum Gothic woff — 모두 react-pdf v4.4.1 + 한글 호환성 이슈로 실패.

다음 세션 우선 시도:
1. Puppeteer + 웹 화면 PDF 캡처 (서버리스 환경 호환성 재검증)
2. PDFKit 직접 사용 + 시스템 폰트
3. 외부 PDF 생성 API (DocRaptor, PDFShift 등)

---

## 세션 17+ 신규 작업 큐 (세션 12~13 결정, 미착수)

| 작업 | 시간 | 비고 |
|---|---|---|
| data_reconciler.ts 4규칙 | 2h | 신규 vs 기존 충돌 판단 |
| product-dictionary.ts 보강 | 2h | form/strength/unit 다중 필터 |
| product_matcher.ts 5단계 위계 | 2~3h | Exact/Strong/Partial/Form Mismatch/INN Only |
| 보고서 4-2 가격 포지셔닝 개선 | 1h | 매칭 등급 UI |
| 보고서 2페이지 (데이터 투명성) | 3h | 5개 블록 신설 |
| Perplexity API + 보고서 3페이지 | 3~4h | INN 5건 + 거시 3건 |

---

## 변경 이력

- Session 7 W0: 최초 문서화.
- Session 7 W1: SAND·ComEM·stealth_setup·공공 3종 크롤러·preload_public 반영.
- Session 7 W2: XGrammar Skeleton·Phase B stub 3종·민간 2종 Skeleton·매트릭스 재정렬.
- Session 7 W4: Next.js 14·보고서 1장 UI·Case 판정·Supabase 조회.
- Session 8: 해법 C (AI 의미 게이트) Phase 2 로드맵 섹션 신규 추가.
- Session 12: 엔진⑦ PDF Phase 2 이월 표·시도 이력·다음 우선순위 박제.
- Session 13: 거시 카드 정밀화, 규제 마일스톤 시드 신규.
- Session 16: 용어 체계 이중 축 정립 (수집 시점 L1/L2/L3 + 데이터 채널 Phase A/B). PanamaCompra 명세 정정 반영. L2 크롤러 적재 0건 현황 + 8 INN 부재 발견 박제. Phase 2 → "Phase 2 로드맵" 표현 통일 (시점 Phase B와 혼동 방지).