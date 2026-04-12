# AI 기반 의미적 데이터 신선도 판정 — 2단계 게이트 아키텍처 (해법 C)

> **출처**: 달강(김예환) 외부 딥리서치 보고서 (2026-04-12 확보)
> **본 문서**: 풀버전 압축 박제본. 우리 프로젝트 적용 가능한 핵심 로직만 추출.
> **상태**: Phase 2 로드맵 (세션 10+ 본격 구현). 세션 8~9 시점에는 설계 통합만.
> **연관 결정**: 핸드오프_세션7.md § 0-4 결정 1 (해법 C 채택)

---

## 1. 본질 — 왜 해법 C인가

- **문제**: 정적 DB의 39건 seed가 시간이 지나면 의미적으로 부패(Semantic Decay)함. 그러나 매 쿼리마다 전수 web_search 호출은 10초 SLA + 비용 양쪽 위반.
- **기각된 해법 A/B**: 시간 규칙만으로 freshness 판정 → "텍스트는 깔끔한데 법령이 바뀐" 케이스(False Negative) 못 잡음. 가장 위험한 실패 모드.
- **채택된 해법 C**: 정규식·메타데이터 휴리스틱(Phase 1) → 모호 시 경량 LLM Judge(Phase 1.5) → 확정 시 web_search(Phase 2). 비용 0에 가까운 선별로 대다수 통과시키고 의심 케이스만 깊게 검사.

---

## 2. 2단계 게이트 흐름

```
[Phase 1] 정규식 + 메타데이터 휴리스틱 (비용 0, ms 단위)
   ↓ staleScore 계산
   ├─ score ≥ 70  → Phase 2 직행 (확정 stale)
   ├─ 0 < score < 70 → Phase 1.5 진입 (모호)
   └─ score = 0  → 통과 (정적 DB 그대로 사용)

[Phase 1.5] Haiku LLM Judge (모호 구간 한정)
   - max_tokens 극단 제한, temperature=0
   - 응답: "STALE" / "FRESH" 단일 토큰
   ↓
   ├─ STALE → Phase 2
   └─ FRESH → 통과

[Phase 2] Anthropic web_search (확정된 경우만)
   - allowed_domains 강제: minsa.gob.pa, panamacompra.gob.pa, who.int, paho.org
   - max_uses=3 강제
   - 동적 필터링으로 HTML 토큰 폭발 방지
```

---

## 3. Phase 1 — staleScore 가중치 테이블

| 시그널 | 점수 | 감지 방법 | 근거 |
|---|---|---|---|
| MINSA 등록 4.5년 경과 | **+100** | `pa_registry_date` 기준 월수 계산 | MINSA 위생등록 5년 만료 강제 |
| PanamaCompra 가격 3개월 초과 | **+80** | `pa_price_public` 존재 + `updated_at` 차이 | CSS 텐더 휘발성 |
| 미완료 상태어 | **+60** | `pa_notes` 키워드: "pending", "검토 중", "draft", "expected", "진행 중" | 상태 전이 지시어 |
| 명시적 과거연도 | **+50** | `pa_notes` 정규식: `\b(201[0-9]|202[0-4])\b` | 2년 이상 시간 격차 |

**판정 분기**:
- `score ≥ 70` → Phase 2 직행
- `0 < score < 70` → Phase 1.5 LLM Judge
- `score = 0` → 통과

---

## 4. 파나마 도메인 5대 절대 규칙

1. **MINSA 위생등록 = 5년 만료**. 4년 6개월 경과 시점부터 강제 stale.
2. **PanamaCompra 가격 = 3개월 휘발성**. CSS 텐더는 수 주 단위 변동.
3. **WHO EML = 2년 주기**. 최신 24차 = 2025.9 발표. 2023 EML 기준 분석은 2026 시점 stale.
4. **WLA 자동승인 키워드 부재 = 치명적 stale**. 2025.1 MINSA 행정령 2호로 WLA 국가 의약품은 10영업일 자동승인. 기존 "6~12개월" 텍스트가 그대로면 가장 위험한 False Negative.
5. **FTA 관세율 = 매년 1월 1일 단계 인하**. 연도 바뀌면 무조건 갱신 대상.

---

## 5. 차등 TTL 거버넌스 (False Positive 방지)

| 컬럼 유형 | TTL | 예시 |
|---|---|---|
| 정적 속성 | 3년+ | `pa_product_name_local`, 회사 연혁, 역사적 사실 |
| 변동 시장 데이터 | 3개월 | `pa_price_public`, `pa_stock_status` |
| 초고위험 규제·관세 | 90일 default-deny | MINSA 행정령, FTA 관세율, 등록 절차 |

**핵심**: 1995년 같은 역사적 연도가 텍스트에 있어도 컬럼 유형이 "정적"이면 stale 판정 면제. 반대로 규제 컬럼은 휴리스틱이 통과시켜도 90일 후 강제 stale.

---

## 6. 우리 시스템 적용 시점 — Phase 2 로드맵 (세션 10+)

- **세션 8 (현재)**: 본 문서 박제 + ARCHITECTURE.md / REPORT1_SPEC.md / USER_FLOW.md / TECHNIQUES_STATUS.md / CURSOR_INSTRUCTIONS.md 5개 파일에 "해법 C 채택, Phase 2 구현 예정" 명시
- **세션 9**: `src/logic/freshness_checker.ts` 인터페이스 스켈레톤 작성 (Phase 1/1.5/2 분기 골격만)
- **세션 10+**: 본 박제본 § 3 가중치 테이블 그대로 구현. Phase 2 web_search 호출은 야간 배치로 분리하여 10초 SLA 회피
- **운영 단계 진입 시**: 글로벌 캐시 갱신 로직 추가 (한 사용자가 갱신한 데이터는 즉시 모든 사용자에 반영)

---

## 7. 의도적 제외 사항 (박제 안 함)

- 학술 레퍼런스 풀버전 (TeCFaP, CodecFlow, Elastic-Cache 등) → 발표 방어 시 1줄 인용만
- 한국 vs 파나마 데이터 거버넌스 비교 (서론용 분량)
- TypeScript 의사코드 풀버전 → 우리는 우리 스타일로 구현
- Mitigation 5.1~5.3 풀버전 → 차등 TTL + Default-Deny 2가지만 § 5에 박제

---

## 8. ⚠ 구현 전 검증 필요 사항

- **Anthropic web_search 도구명**: 딥리서치 원본은 `web_search_20260209`로 표기. 실제 호출 가능한 정확한 툴명·파라미터는 구현 직전에 docs.anthropic.com에서 1회 검증 필수.
- **Haiku 모델 ID**: 원본은 `claude-3-haiku-20240307`. 우리는 최신 Haiku로 교체 검토 필요.
- **allowed_domains 화이트리스트**: 우리 `src/utils/source_whitelist.ts` (CURSOR_INSTRUCTIONS D6)와 통합 필요.

---

**본 문서는 Phase 2 로드맵의 설계 근거이며, 세션 10+ 구현 시 반드시 § 3 가중치 테이블과 § 4 5대 규칙을 준수해야 함.**
