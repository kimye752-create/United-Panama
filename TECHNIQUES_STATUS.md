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

## 변경 이력

- Session 7 W0: 최초 문서화 (인프라 스프린트 킥오프).
- Session 7 W1: SAND·ComEM·stealth_setup·공공 3종 크롤러·preload_public 반영.
- Session 7 W2: XGrammar Skeleton·Phase B stub 3종·민간 2종 Skeleton·매트릭스 재정렬.
