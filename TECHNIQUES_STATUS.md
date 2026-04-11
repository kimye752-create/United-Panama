# 10가지 크롤링 기법 — 적용 현황 매트릭스 (Session 7)

> 출처: `ARCHITECTURE.md` § 10가지 크롤링 기법.  
> 분류: **실구현 5** / **Skeleton 2** / **Phase B 연기 3**

## 요약

| 분류 | 개수 | 번호 |
|------|------|------|
| 실구현 | 5 | ⑦, ⑧, ⑨ + preload API 파이프라인(거시/공공 OCDS) |
| Skeleton | 2 | ⑤, ⑩ (ARCHITECTURE 경로·설계만, 통합 파일 미비) |
| Phase B 연기 | 3 | ①, ②, ③ (에이전트·정제 레이어 미도입) |

---

## 상세 매트릭스

| # | 기법 | 상태 | 구현·참조 위치 |
|---|------|------|----------------|
| ① | WebWalker | **Phase B** | `src/agents/webwalker_core.ts` 미생성 |
| ② | Wrapper Maintenance | **Phase B** | `src/agents/wrapper_maintenance.ts` 미생성 |
| ③ | SAND | **Phase B** | `src/cleansing/sand_outlier.ts` 미생성 |
| ④ | ComEM | **Phase B** | `src/cleansing/comem_matcher.ts` 미생성 |
| ⑤ | XGrammar | **Skeleton** | `src/utils/xgrammar_enforcer.ts` 미생성 (설계만) |
| ⑥ | Atomic Calibration | **Phase B** | `src/utils/atomic_factchecker.ts` 미생성 |
| ⑦ | Polite Scraping | **실구현** | `src/crawlers/preload/*.ts` (지연·UA·재시도 패턴), `pa_panamacompra.ts` |
| ⑧ | HTML Preprocessing | **실구현** | `src/utils/html_preprocessor.ts` |
| ⑨ | EBNF Constrained Extraction | **실구현** | `src/utils/ebnf_schemas.ts` |
| ⑩ | Lightweight Resource Blocking | **Skeleton** | ARCHITECTURE상 `src/crawler/stealth_setup.ts` — 저장소 내 미구축, Playwright 프리로드와 별도 통합 예정 |

---

## 실구현 범위 보조 (1공정)

- **Seed 적재**: `load_macro` / `load_eml` / `load_market_intel` — 정적 JSON → Supabase.
- **거시 크롤러**: `pa_worldbank`, `pa_ita`, `pa_kotra`, `pa_motie`, `pa_pubmed`.
- **공공 OCDS**: `pa_panamacompra.ts` — `/api/v1/releases` 실측 기준.

---

## 변경 이력

- Session 7 W0: 최초 문서화 (인프라 스프린트 킥오프).
