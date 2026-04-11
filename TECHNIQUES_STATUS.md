# 10가지 크롤링 기법 — 적용 현황 매트릭스 (Session 7)

> 출처: `ARCHITECTURE.md` § 10가지 크롤링 기법.  
> 분류: **실구현 7** / **Skeleton 1** / **Phase B 연기 2** (Session 7 W1 반영)

## 요약

| 분류 | 개수 | 번호 |
|------|------|------|
| 실구현 | 7 | ③, ④, ⑦, ⑧, ⑨ + preload(거시·공공 OCDS·공공 3종 runner) |
| Skeleton | 1 | ⑤ (XGrammar 파일 미생성) |
| Phase B 연기 | 2 | ①, ② (에이전트 미도입) |

---

## 상세 매트릭스

| # | 기법 | 상태 | 구현·참조 위치 |
|---|------|------|----------------|
| ① | WebWalker | **Phase B** | `src/agents/webwalker_core.ts` 미생성 |
| ② | Wrapper Maintenance | **Phase B** | `src/agents/wrapper_maintenance.ts` 미생성 |
| ③ | SAND | **실구현** | `src/cleansing/sand_outlier.ts` — IQR 이상치 |
| ④ | ComEM | **실구현** | `src/cleansing/comem_matcher.ts` — Levenshtein + 스페인어 정규화 |
| ⑤ | XGrammar | **Skeleton** | `src/utils/xgrammar_enforcer.ts` 미생성 |
| ⑥ | Atomic Calibration | **Phase B** | `src/utils/atomic_factchecker.ts` 미생성 |
| ⑦ | Polite Scraping | **실구현** | `src/crawler/stealth_setup.ts` + 공공/거시 preload |
| ⑧ | HTML Preprocessing | **실구현** | `src/utils/html_preprocessor.ts` |
| ⑨ | EBNF Constrained Extraction | **실구현** | `src/utils/ebnf_schemas.ts` |
| ⑩ | Lightweight Resource Blocking | **Skeleton** | `stealth_setup.applyResourceBlocking` — Playwright 연동은 호출부에서 |

---

## 실구현 범위 보조 (1공정)

- **Seed 적재**: `load_macro` / `load_eml` / `load_market_intel` — 정적 JSON → Supabase.
- **거시 크롤러**: `pa_worldbank`, `pa_ita`, `pa_kotra`, `pa_motie`, `pa_pubmed`.
- **공공 OCDS**: `pa_panamacompra.ts` — `/api/v1/releases` 실측 기준.
- **공공 규제·기금**: `pa_acodeco.ts`, `pa_minsa.ts`(Skeleton), `pa_css.ts` + `scripts/runners/preload_public.ts`.

---

## 변경 이력

- Session 7 W0: 최초 문서화 (인프라 스프린트 킥오프).
- Session 7 W1: SAND·ComEM·stealth_setup·공공 3종 크롤러·preload_public 반영.
