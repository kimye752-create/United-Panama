# 10가지 크롤링 기법 — 적용 현황 매트릭스 (Session 7)

> 출처: `ARCHITECTURE.md` § 10가지 크롤링 기법.  
> 분류: **실구현 5** / **Skeleton 2** / **Phase B 연기 3** (Session 7 W2 반영)

## 요약

| 분류 | 개수 | 번호 |
|------|------|------|
| 실구현 | 5 | ③ SAND, ④ ComEM, ⑦ Polite, ⑧ HTML Preproc, ⑨ EBNF |
| Skeleton | 2 | ⑤ XGrammar(`xgrammar_enforcer`), ⑩ Resource Blocking(`stealth_setup`) |
| Phase B 연기 | 3 | ① WebWalker, ② Wrapper Maintenance, ⑥ Atomic Calibration |

---

## 상세 매트릭스 (W2 동기화)

| # | 기법 | 상태 | 구현·참조 위치 |
|---|------|------|----------------|
| ① | WebWalker | 🔴 **Phase B 연기 (W2 stub)** | `src/agents/webwalker_core.ts` — `exploreWithWebWalker` throw |
| ② | Wrapper Maintenance | 🔴 **Phase B 연기 (W2 stub)** | `src/agents/wrapper_maintenance.ts` — `runWrapperMaintenance` throw |
| ③ | SAND | 🟢 **구현 완료 (W1)** | `src/cleansing/sand_outlier.ts` — IQR |
| ④ | ComEM | 🟢 **구현 완료 (W1)** | `src/cleansing/comem_matcher.ts` |
| ⑤ | XGrammar | 🟡 **Skeleton 완료 (W2)** | `src/utils/xgrammar_enforcer.ts` — 포스트 파싱 검증 |
| ⑥ | Atomic Calibration | 🔴 **Phase B 연기 (W2 stub)** | `src/utils/atomic_factchecker.ts` — `verifyAtomicClaim` throw |
| ⑦ | Polite Scraping | 🟢 **구현 완료 (W1)** | `src/crawler/stealth_setup.ts` + preload 크롤러 |
| ⑧ | HTML Preprocessing | ✅ **완성 (세션 2)** | `src/utils/html_preprocessor.ts` |
| ⑨ | EBNF Constrained Extraction | ✅ **완성 (세션 6)** | `src/utils/ebnf_schemas.ts` |
| ⑩ | Lightweight Resource Blocking | 🟡 **Skeleton (W1)** | `src/crawler/stealth_setup.ts` — `applyResourceBlocking` |

---

## 실구현 범위 보조 (1공정)

- **Seed 적재**: `load_macro` / `load_eml` / `load_market_intel` — 정적 JSON → Supabase.
- **거시 크롤러**: `pa_worldbank`, `pa_ita`, `pa_kotra`, `pa_motie`, `pa_pubmed`.
- **공공 OCDS**: `pa_panamacompra.ts` — `/api/v1/releases` 실측 기준.
- **공공 규제·기금**: `pa_acodeco.ts`, `pa_minsa.ts`(Skeleton), `pa_css.ts` + `preload_public.ts`.
- **민간 소매(Skeleton)**: `pa_arrocha.ts`, `pa_metroplus.ts` + `preload_private.ts` (`--dry-run`만).

---

## Phase 2 로드맵 — AI 기반 의미적 신선도 판정 2단계 게이트 (해법 C)

> 세션 8 신규 추가. 9:1 정적/실시간 분리 (3계층 세분화: L1 정적 seed 약 85% / L2 조건부 우리 크롤러 약 10% / L3 Anthropic API web_search 약 5%) 구조에서 L3 트리거를 담당하는 게이트 설계.

| 항목 | 상태 | 위치 |
|---|---|---|
| 설계 문서 | ✅ 박제 완료 (세션 8) | `docs/research/freshness_2gate_architecture.md` |
| 인터페이스 스켈레톤 | 🔴 세션 9 작업 | `src/logic/freshness_checker.ts` |
| Phase 1 휴리스틱 | 🔴 Phase 2 로드맵 | 정규식+메타데이터, staleScore 가중치 |
| Phase 1.5 LLM Judge | 🔴 Phase 2 로드맵 | Haiku, max_tokens 극단 제한 |
| Phase 2 web_search | 🔴 Phase 2 로드맵 | Anthropic, allowed_domains 강제 |
| 야간 배치 분리 | 🔴 운영 진입 시 | 10초 SLA 회피 목적 |

**핵심 원칙**:
- 시간 규칙 단독 판정 금지 (False Negative 방지 — 2025.1 MINSA 행정령 케이스: WLA 국가 의약품 10영업일 자동승인이 도입되었으나, 기존 "6~12개월" 텍스트가 그대로 남아있을 시 시스템이 폐지된 구형 절차를 "현재 사실"로 출력하게 됨)
- 차등 TTL: 정적 컬럼 3년+ / 변동 컬럼 3개월 / 초고위험 90일 default-deny
- staleScore ≥70 → Phase 2 직행, 0<score<70 → LLM Judge, 0 → 통과
- 흐름: Phase 1 휴리스틱 → Phase 1.5 LLM Judge → Phase 2 web_search
- 본격 구현은 Phase 2 로드맵 (세션 10+). 세션 9는 인터페이스 스켈레톤만 작업

### 엔진⑦ PDF 자동 생성 — Phase 2 이월

| 항목 | 상태 |
|---|---|
| PDF API A안 구조 | ✅ 완성 (세션 12) |
| react-pdf + 한글 폰트 | 🔴 Phase 2 |
| 폰트 번들링 전략 | 🔴 Phase 2 (Puppeteer 대체 검토) |
| 9페이지 통합 PDF | 🔴 Phase 2 |

세션 12 시도 이력: Pretendard TTF/OTF, PretendardStd, Noto Sans KR woff, Nanum Gothic woff — 모두 react-pdf v4.4.1 + 한글 호환성 이슈로 실패.

다음 세션 우선 시도:
1. Puppeteer + 웹 화면 PDF 캡처 (서버리스 환경 호환성 재검증)
2. PDFKit 직접 사용 + 시스템 폰트
3. 외부 PDF 생성 API (DocRaptor, PDFShift 등)

---

## 변경 이력

- Session 7 W0: 최초 문서화 (인프라 스프린트 킥오프).
- Session 7 W1: SAND·ComEM·stealth_setup·공공 3종 크롤러·preload_public 반영.
- Session 7 W2: XGrammar Skeleton·Phase B stub 3종·민간 2종 Skeleton·매트릭스 재정렬.
- Session 7 W4: Next.js 14·보고서 1장 UI·Case 판정·Supabase 조회(`src/logic/*`, `app/panama/*`).
- Session 8: 해법 C (AI 의미 게이트) Phase 2 로드맵 섹션 신규 추가. `docs/research/freshness_2gate_architecture.md` 박제 완료.
- Session 12: 엔진⑦ PDF Phase 2 이월 표·시도 이력·다음 우선순위 박제 (`ARCHITECTURE.md` 세션 12 블록과 연동).