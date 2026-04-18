# Cursor 지시서 — 메인프리뷰 페이지 (1·2·3공정 통합 설계)

> **작성**: Claude (Opus 4.7) · **작성일**: 2026-04-18 (D-6) · **세션**: 25
> **목적**: 메인프리뷰 페이지의 1·2·3공정 박스를 팀장 UI 기반 + 우리 차별점 3가지 반영하여 전면 재구현
> **선행조건**: 세션 24 커밋 `9812dc1` (사이트 2탭 구조·OpenStreetMap·뉴스 카드) 푸시 완료 상태

---

## 📌 Cursor 먼저 읽을 것

1. `ARCHITECTURE.md` — 세션 16 마무리본
2. `docs/handoffs/핸드오프_세션24.md` — 최신 결정사항
3. `src/config/product-dictionary.ts` — 신 8제품 UUID 매핑
4. 본 지시서 (메인프리뷰 전면 재구현)

---

## 🎯 작업 범위 3가지

### 1. 1공정 박스 — 완료 토스트 문구 교체 (경량 수정)
### 2. 2공정 박스 — 공공/민간 버튼 제거 + 탭 전환 방식 도입 (중량 수정)
### 3. 3공정 박스 — 신규 전면 구현 (중량 신규)

---

## 1. 1공정 박스 수정

### 변경사항: 완료 토스트 문구만 교체

**기존**:
```
✅ Sereterol Activair 분석 완료 — 판정: 조건부. 상세 결과는 보고서 탭에서 확인하세요.
```

**변경 후** (등급 표시 명확화):
```
✅ {제품명} 시장조사 분석 완료 — 판정: {등급}. 상세 보고서는 [보고서] 탭에서 확인하세요.
```

**등급 매핑** (기존 entryFeasibility 로직 그대로 활용):
- `A_immediate` → "즉시 진입 가능"
- `B_short_term` → "단기 진입 가능"
- `C_mid_term` → "중기 진입 (WLA 트랙)"
- `D_long_term` → "장기 진입 (시장 교육 필요)"
- `F_blocked` → "진출 불가"
- `unknown` → "판정 보류"

### 수정 대상 파일
- `app/panama/MainPreview.tsx` (또는 동등 메인프리뷰 컴포넌트)

### 구현 포인트
```typescript
// 기존 토스트 텍스트 조합 함수 찾아서 교체
const gradeDisplayMap: Record<EntryFeasibility["grade"], string> = {
  A_immediate: "즉시 진입 가능",
  B_short_term: "단기 진입 가능",
  C_mid_term: "중기 진입 (WLA 트랙)",
  D_long_term: "장기 진입 (시장 교육 필요)",
  F_blocked: "진출 불가",
  unknown: "판정 보류",
};

const buildPhase1ToastMessage = (
  productName: string,
  grade: EntryFeasibility["grade"],
): string => {
  const gradeLabel = gradeDisplayMap[grade];
  return `✅ ${productName} 시장조사 분석 완료 — 판정: ${gradeLabel}. 상세 보고서는 [보고서] 탭에서 확인하세요.`;
};
```

---

## 2. 2공정 박스 수정 — 공공/민간 버튼 제거 + 탭 전환 도입

### 2.1 UI 구조 변경

**기존 (팀장 버전)**:
```
분석 보고서 선택: [드롭다운]
시장 선택 및 분석 실행:
  [공공 시장] [민간 시장]  ← 택1
  [▶ AI 가격 분석 실행]   ← 선택한 시장만 분석
  ↓
결과: 3개 시나리오 카드 (공격/평균/보수) — 1개 시장만
```

**변경 후 (우리 버전)**:
```
분석 보고서 선택: [드롭다운]
[▶ AI 가격 분석 실행]  ← 단일 버튼, 2개 루트 동시 산출
  ↓
진행 체크포인트: PDF 추출 → 가격 추출 → AI 분석 → 보고서 생성
  ↓
결과 영역:
  ┌ [공공 시장] [민간 시장] ─── 탭 전환 ───┐
  │                                        │
  │ (선택된 탭 내용)                        │
  │ 공격(1위)  평균(2위)  보수(3위)         │
  │ SGD 9.95  SGD 11.85  SGD 12.95         │
  │ ▸ 역산·옵션 편집 (각 카드)              │
  └────────────────────────────────────────┘

참조가 테이블: (기존 유지)

[📄 수출가격전략 보고서 다운로드]
```

### 2.2 백엔드 API 변경

**기존 엔드포인트**: `POST /api/panama/phase2` with body `{ market: "public" | "private" }` → 단일 결과

**변경 후**: 2가지 중 하나 선택
- **권장(A)**: 같은 엔드포인트 유지, body의 `market` 제거 → 내부에서 public·private 병렬 처리 후 양쪽 다 반환
- **(B) 백엔드 변경 부담 시**: 프론트에서 `market=public`, `market=private` 2번 병렬 호출 후 합성

**권장 A안 응답 스키마**:
```typescript
interface Phase2Response {
  product_id: string;
  product_name: string;
  reference_prices: ReferencePriceRow[];
  public_market: {
    scenarios: {
      aggressive: ScenarioCard;  // 공격
      average: ScenarioCard;      // 평균
      conservative: ScenarioCard; // 보수
    };
    logic: string;  // "Logic A (공공조달)"
    formula: string; // "FOB = 낙찰가 × (1 - 마진 - 관세 - VAT)"
  };
  private_market: {
    scenarios: {
      aggressive: ScenarioCard;
      average: ScenarioCard;
      conservative: ScenarioCard;
    };
    logic: string;  // "Logic B (민간소매)"
    formula: string; // "FOB = 소매가 × (1 - 약국마진 - 도매마진 - VAT)"
  };
}

interface ScenarioCard {
  rank: 1 | 2 | 3;
  price_sgd: number;     // 원본 통화
  price_usd: number;     // USD 환산
  price_krw: number;     // KRW 환산
  basis: string;         // 근거 텍스트
  calculation: string;   // 계산식 (SGD 13.21 × 0.897 = SGD 11.85)
  markdown_rate: number; // 할인율 (0.897)
}
```

### 2.3 프론트 탭 컴포넌트 구현

```typescript
// components/Phase2ResultTabs.tsx
import { useState } from "react";

interface Phase2ResultTabsProps {
  result: Phase2Response;
}

export function Phase2ResultTabs({ result }: Phase2ResultTabsProps) {
  const [activeTab, setActiveTab] = useState<"public" | "private">("public");
  const activeMarket =
    activeTab === "public" ? result.public_market : result.private_market;

  return (
    <div className="phase2-result">
      {/* 탭 헤더 */}
      <div className="tab-header flex border-b mb-4">
        <button
          onClick={() => setActiveTab("public")}
          className={`tab-btn ${activeTab === "public" ? "active" : ""}`}
        >
          공공 시장 (Logic A)
        </button>
        <button
          onClick={() => setActiveTab("private")}
          className={`tab-btn ${activeTab === "private" ? "active" : ""}`}
        >
          민간 시장 (Logic B)
        </button>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="tab-content">
        <div className="scenario-cards grid grid-cols-3 gap-4">
          <ScenarioCard scenario={activeMarket.scenarios.aggressive} label="공격" />
          <ScenarioCard scenario={activeMarket.scenarios.average} label="평균" />
          <ScenarioCard scenario={activeMarket.scenarios.conservative} label="보수" />
        </div>

        <div className="logic-info mt-4 text-sm text-gray-600">
          <p><strong>{activeMarket.logic}</strong></p>
          <p>적용 공식: {activeMarket.formula}</p>
        </div>
      </div>
    </div>
  );
}
```

### 2.4 2공정 PDF 보고서 구조 (A4 1페이지 유지, 공공+민간 이원 표시)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
파나마 수출 가격 전략 보고서 (2공정)
2026-04-18 · {제품명} · 판정: {등급}
시장: 공공+민간 이원 분석
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 원 가격 (기준 가격)
   기준 가격 | SGD 11.85
   산정 방식 | AI 분석 (Claude Haiku)
   시장 구분 | 공공+민간 이원 분석

2. 적용된 계산 공식
   Logic A (공공): FOB = 낙찰가 × (1 - 마진 - 관세 - VAT)
   Logic B (민간): FOB = 소매가 × (1 - 약국마진 - 도매마진 - VAT)

3. 공공 시장 시나리오 (Logic A)
   [공격 1위] SGD 9.95 (12.63 USD)
     근거: {...} / 계산식: SGD 13.21 × 0.754
   [평균 2위] SGD 11.85 (15.05 USD)
     근거: {...} / 계산식: SGD 13.21 × 0.897
   [보수 3위] SGD 12.95 (16.44 USD)
     근거: {...} / 계산식: SGD 13.21 × 0.980

4. 민간 시장 시나리오 (Logic B)
   [공격 1위] SGD 8.50 (10.78 USD)
     근거: {...} / 계산식: ...
   [평균 2위] SGD 10.20 (12.95 USD)
     근거: {...} / 계산식: ...
   [보수 3위] SGD 11.80 (14.97 USD)
     근거: {...} / 계산식: ...

5. AI 분석 근거
   {Haiku 분석 텍스트 — 공공·민간 공통 인사이트}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2.5 수정 대상 파일 요약

| 파일 | 변경 내용 |
|---|---|
| `app/panama/MainPreview.tsx` | 2공정 박스 공공/민간 버튼 제거, 단일 분석 버튼 |
| `components/Phase2ResultTabs.tsx` | 신규 — 탭 전환 결과 컴포넌트 |
| `app/api/panama/phase2/route.ts` | 응답 스키마 변경 — public·private 병렬 처리 |
| `src/llm/phase2_generator.ts` | Haiku 호출 시 공공·민간 양쪽 시나리오 생성 |
| `lib/phase2_pdf_template.ts` | PDF 생성 로직 공공+민간 이원 표시 |

---

## 3. 3공정 박스 — 신규 전면 구현

### 3.1 박스 기본 구조

```
┌─ 03 바이어 발굴 ─────────────────────────────────┐
│ Top 10 바이어 리스트 · 시장조사·수출가격전략 완료 │
│ 후 활성화                                         │
│                                                   │
│ [분석 보고서 선택: 드롭다운 (1·2공정 완료본만)]    │
│                                   [▶ 파트너 발굴 실행] │
│                                                   │
│ [진행 체크포인트] (분석 실행 후)                    │
│   ○ 1차 수집 → ○ 2차 심층 → ○ 프로필 생성 → ○ 점수화 │
│                                                   │
│ [평가 항목 선택 — 중요 항목 체크 (다중 선택)]       │
│   ☑ ① 매출규모 (기본 체크)                         │
│   ☐ ② 파이프라인 (동일 성분·유사 의약품 취급 이력) │
│   ☐ ③ 제조소 보유 여부 (GMP 인증)                   │
│   ☐ ④ 수입 경험 여부                                │
│   ☐ ⑤ 해당 국가 약국 체인 운영 여부                 │
│                                                   │
│ [Top 10 기업 카드 그리드]                           │
│   1위: ALFARMA S.A.          [▼ 상세보기]          │
│   2위: SEVEN PHARMA PANAMA   [▼ 상세보기]          │
│   ...                                             │
│   10위: {기업명}              [▼ 상세보기]          │
│                                                   │
│ [📄 바이어 리스트 다운로드]  ← 분석 완료 후 활성화 │
└───────────────────────────────────────────────────┘
```

### 3.2 DB 스키마 신규

```sql
-- 기업 마스터 테이블 (1차 수집 데이터 + 2차 심층 결과 통합)
CREATE TABLE IF NOT EXISTS panama_partner_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  company_name_normalized TEXT NOT NULL,  -- 중복 제거용 정규화명

  -- 1차 수집 (연락처 & 기본)
  phone TEXT,
  email TEXT,
  address TEXT,
  website TEXT,
  source_primary TEXT,  -- 'pharmchoices' | 'cphi_japan' | 'dnb_panama'
  collected_primary_at TIMESTAMPTZ,

  -- 2차 심층 수집 (정량·정성)
  revenue_usd NUMERIC,              -- 매출 규모 (USD)
  employee_count INTEGER,            -- 임직원 수
  founded_year INTEGER,              -- 설립연도
  therapeutic_areas TEXT[],          -- 취급 치료영역
  gmp_certified BOOLEAN,             -- GMP 제조시설 보유
  import_history BOOLEAN,            -- 수입 이력
  import_history_detail TEXT,        -- 수입 상세
  public_procurement_wins INTEGER,   -- 공공조달 낙찰 건수
  pharmacy_chain_operator BOOLEAN,   -- 약국 체인 운영
  mah_capable BOOLEAN,               -- MAH 가능
  korea_partnership BOOLEAN,         -- 한국 거래 경험
  korea_partnership_detail TEXT,     -- 한국 거래 상세
  source_secondary TEXT[],           -- 2차 수집 출처 URL 배열
  collected_secondary_at TIMESTAMPTZ,

  -- 점수화 (런타임 계산 후 캐시)
  score_revenue NUMERIC,         -- ① 매출규모
  score_pipeline NUMERIC,        -- ② 파이프라인
  score_gmp NUMERIC,             -- ③ 제조소
  score_import NUMERIC,          -- ④ 수입 경험
  score_pharmacy_chain NUMERIC,  -- ⑤ 약국 체인
  score_total_default NUMERIC,   -- 종합 점수 (기본 가중치)

  -- 메타
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (company_name_normalized)
);

CREATE INDEX idx_partner_score_default
  ON panama_partner_candidates (score_total_default DESC);
```

### 3.3 데이터 소스 3개 (사전 적재)

| 소스 | URL | 예상 건수 | 비고 |
|---|---|---|---|
| **PharmChoices** | `pharmchoices.com/full-list-of-pharmaceutical-companies-in-panama/` | 30~38사 | 파나마 제약사 전체 목록 + 연락처 |
| **CPHI Japan** | `informa-japan.com/cphifcj/complist/en/index.php` | 글로벌 → 파나마 필터 | 글로벌 제약 유통사 DB |
| **D&B Panama Pharma** | `dnb.com/...파나마 의약품 카테고리` | 54사 | 회사 프로필·매출·임직원 정량 데이터 |

**중복 제거 후 예상**: 70~80사

### 3.4 API 라우트 구조

```typescript
// app/api/panama/phase3/route.ts
export async function POST(req: NextRequest) {
  const { product_id, report_id } = await req.json();

  // 1. 1차 수집 (DB 조회)
  const candidates = await fetchPartnerCandidatesFromDB();

  // 2. 2차 심층 수집 (미수집 기업만, 런타임)
  const enrichedCandidates = await Promise.all(
    candidates.map(async (c) => {
      if (c.collected_secondary_at === null) {
        return await enrichCandidateWithLLM(c);  // Haiku 호출
      }
      return c;
    }),
  );

  // 3. 제품 기준 점수화
  const scoredCandidates = await scoreCandidates(
    enrichedCandidates,
    product_id,  // 제품 정보 기반 파이프라인 일치도 계산
  );

  // 4. Top 10 선정 (기본 정렬: 매출 규모 내림차순)
  const top10 = scoredCandidates
    .sort((a, b) => (b.score_revenue ?? 0) - (a.score_revenue ?? 0))
    .slice(0, 10);

  return NextResponse.json({
    product_id,
    top10,
    all_candidates_count: candidates.length,
    generated_at: new Date().toISOString(),
  });
}
```

### 3.5 점수화 로직 (`src/logic/partner_scorer.ts`)

```typescript
// 5개 항목별 0~100점 계산
export interface PartnerScores {
  revenue: number;      // ① 매출규모
  pipeline: number;     // ② 파이프라인
  gmp: number;          // ③ 제조소
  import: number;       // ④ 수입 경험
  pharmacy_chain: number; // ⑤ 약국 체인
}

export function scoreRevenue(revenueUsd: number | null): number {
  if (revenueUsd === null) return 0;
  // $100M 이상: 100점, $10M: 50점, $1M: 20점 (로그 스케일)
  if (revenueUsd >= 100_000_000) return 100;
  if (revenueUsd >= 10_000_000) return 50 + (revenueUsd / 100_000_000) * 50;
  if (revenueUsd >= 1_000_000) return 20 + (revenueUsd / 10_000_000) * 30;
  return (revenueUsd / 1_000_000) * 20;
}

export function scorePipeline(
  candidate: PartnerCandidate,
  productInn: string,
  productAtc4: string,
): number {
  // 취급 치료영역 매칭
  // 동일 INN 취급 이력: 100점
  // 동일 ATC4 취급: 80점
  // 동일 치료영역: 60점
  // 의약품 카테고리 취급: 40점
  // 무관: 0점
  // (LLM 2차 수집 결과 therapeutic_areas 기반 판정)
  return calculatePipelineMatch(candidate, productInn, productAtc4);
}

export function scoreGmp(gmpCertified: boolean | null): number {
  if (gmpCertified === true) return 100;
  if (gmpCertified === false) return 0;
  return 0; // 미수집
}

export function scoreImport(
  importHistory: boolean | null,
  importDetail: string | null,
): number {
  if (importHistory === true) {
    // 상세가 있고 의약품 언급이면 100, 일반 언급이면 70
    if (importDetail?.includes("pharmaceutical") || importDetail?.includes("의약품")) {
      return 100;
    }
    return 70;
  }
  return 0;
}

export function scorePharmacyChain(isOperator: boolean | null): number {
  return isOperator === true ? 100 : 0;
}

// 클라이언트 사이드 재정렬용 가중치 조합
export function calculateCompositeScore(
  scores: PartnerScores,
  checkedItems: Set<"revenue" | "pipeline" | "gmp" | "import" | "pharmacy_chain">,
): number {
  // 체크된 항목은 가중치 1.0, 체크 안 된 항목은 0.2
  const weights = {
    revenue: checkedItems.has("revenue") ? 1.0 : 0.2,
    pipeline: checkedItems.has("pipeline") ? 1.0 : 0.2,
    gmp: checkedItems.has("gmp") ? 1.0 : 0.2,
    import: checkedItems.has("import") ? 1.0 : 0.2,
    pharmacy_chain: checkedItems.has("pharmacy_chain") ? 1.0 : 0.2,
  };

  const weightedSum =
    scores.revenue * weights.revenue +
    scores.pipeline * weights.pipeline +
    scores.gmp * weights.gmp +
    scores.import * weights.import +
    scores.pharmacy_chain * weights.pharmacy_chain;

  const weightTotal =
    weights.revenue +
    weights.pipeline +
    weights.gmp +
    weights.import +
    weights.pharmacy_chain;

  return weightedSum / weightTotal;
}
```

### 3.6 프론트 컴포넌트 (`components/Phase3PartnerDiscovery.tsx`)

```typescript
"use client";

import { useState, useMemo } from "react";
import { calculateCompositeScore } from "@/src/logic/partner_scorer";

type EvaluationCriterion =
  | "revenue"
  | "pipeline"
  | "gmp"
  | "import"
  | "pharmacy_chain";

interface Phase3PartnerDiscoveryProps {
  productId: string;
  top10Initial: PartnerCandidate[];
  isAnalysisComplete: boolean;
}

export function Phase3PartnerDiscovery({
  productId,
  top10Initial,
  isAnalysisComplete,
}: Phase3PartnerDiscoveryProps) {
  // 기본 체크 상태: 매출규모만
  const [checkedItems, setCheckedItems] = useState<Set<EvaluationCriterion>>(
    new Set(["revenue"]),
  );
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const toggleCriterion = (c: EvaluationCriterion) => {
    const next = new Set(checkedItems);
    if (next.has(c)) {
      next.delete(c);
    } else {
      next.add(c);
    }
    setCheckedItems(next);
  };

  // 체크 조합 변경 시 클라이언트 사이드 재정렬
  const sortedTop10 = useMemo(() => {
    return [...top10Initial]
      .map((candidate) => ({
        ...candidate,
        composite_score: calculateCompositeScore(
          {
            revenue: candidate.score_revenue ?? 0,
            pipeline: candidate.score_pipeline ?? 0,
            gmp: candidate.score_gmp ?? 0,
            import: candidate.score_import ?? 0,
            pharmacy_chain: candidate.score_pharmacy_chain ?? 0,
          },
          checkedItems,
        ),
      }))
      .sort((a, b) => b.composite_score - a.composite_score);
  }, [top10Initial, checkedItems]);

  if (!isAnalysisComplete) {
    return (
      <div className="phase3-empty">
        <p>파트너 발굴 실행 버튼을 눌러 분석을 시작하세요.</p>
      </div>
    );
  }

  return (
    <div className="phase3-container">
      {/* 평가 항목 체크박스 */}
      <div className="evaluation-criteria mb-6">
        <h4 className="font-bold mb-2">평가 항목 선택 (다중 선택 가능)</h4>
        <div className="criteria-grid grid grid-cols-1 md:grid-cols-2 gap-2">
          <CriterionCheckbox
            label="① 매출규모"
            checked={checkedItems.has("revenue")}
            onToggle={() => toggleCriterion("revenue")}
          />
          <CriterionCheckbox
            label="② 파이프라인 (동일 성분·유사 의약품 취급 이력)"
            checked={checkedItems.has("pipeline")}
            onToggle={() => toggleCriterion("pipeline")}
          />
          <CriterionCheckbox
            label="③ 제조소 보유 여부 (GMP 인증)"
            checked={checkedItems.has("gmp")}
            onToggle={() => toggleCriterion("gmp")}
          />
          <CriterionCheckbox
            label="④ 수입 경험 여부"
            checked={checkedItems.has("import")}
            onToggle={() => toggleCriterion("import")}
          />
          <CriterionCheckbox
            label="⑤ 해당 국가 약국 체인 운영 여부"
            checked={checkedItems.has("pharmacy_chain")}
            onToggle={() => toggleCriterion("pharmacy_chain")}
          />
        </div>
      </div>

      {/* Top 10 카드 그리드 */}
      <div className="top10-grid space-y-3">
        {sortedTop10.map((candidate, idx) => (
          <PartnerCard
            key={candidate.id}
            rank={idx + 1}
            candidate={candidate}
            isExpanded={expandedCard === candidate.id}
            onToggleExpand={() =>
              setExpandedCard(expandedCard === candidate.id ? null : candidate.id)
            }
          />
        ))}
      </div>

      {/* 다운로드 버튼 */}
      <div className="download-actions mt-6">
        <button
          onClick={() => triggerDownload(productId, Array.from(checkedItems))}
          className="btn-primary"
        >
          📄 바이어 리스트 다운로드
        </button>
      </div>
    </div>
  );
}
```

### 3.7 PartnerCard 컴포넌트 (접힘/펼침)

```typescript
// components/PartnerCard.tsx
interface PartnerCardProps {
  rank: number;
  candidate: PartnerCandidate & { composite_score: number };
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function PartnerCard({
  rank,
  candidate,
  isExpanded,
  onToggleExpand,
}: PartnerCardProps) {
  return (
    <div className="partner-card border rounded-lg p-4 bg-white">
      {/* 접힘 상태 */}
      <div className="card-header flex items-center justify-between">
        <div>
          <span className="rank-badge">{rank}위</span>
          <span className="company-name font-bold ml-2">
            🏢 {candidate.company_name}
          </span>
          <span className="channel ml-2 text-sm text-gray-600">
            📍 파나마 · 💼 {deriveChannelLabel(candidate)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="score-badge">
            ⭐ {candidate.composite_score.toFixed(1)}
          </span>
          <button onClick={onToggleExpand} className="expand-btn">
            {isExpanded ? "▲ 접기" : "▼ 상세보기"}
          </button>
        </div>
      </div>

      {/* 펼침 상태 */}
      {isExpanded && (
        <div className="card-body mt-4 pt-4 border-t">
          {/* 1차 수집 */}
          <section className="mb-4">
            <h5 className="font-bold mb-2">📋 1차 수집 — 연락처 & 기본 정보</h5>
            <ul className="text-sm space-y-1">
              <li>전화: {candidate.phone ?? "(미수집)"}</li>
              <li>이메일: {candidate.email ?? "(미수집)"}</li>
              <li>소재지: {candidate.address ?? "(미수집)"}</li>
              <li>
                웹사이트:{" "}
                {candidate.website ? (
                  <a href={candidate.website} target="_blank" rel="noreferrer">
                    {candidate.website}
                  </a>
                ) : (
                  "(미수집)"
                )}
              </li>
              <li className="text-gray-500 text-xs">
                출처: {candidate.source_primary} (
                {formatDate(candidate.collected_primary_at)})
              </li>
            </ul>
          </section>

          {/* 2차 심층 수집 */}
          <section className="mb-4">
            <h5 className="font-bold mb-2">🔍 2차 심층 수집 — 정량·정성</h5>
            <ul className="text-sm space-y-1">
              <li>
                매출 규모:{" "}
                {candidate.revenue_usd
                  ? `$${formatCurrency(candidate.revenue_usd)}`
                  : "(미수집)"}
              </li>
              <li>임직원 수: {candidate.employee_count ?? "(미수집)"}</li>
              <li>설립연도: {candidate.founded_year ?? "(미수집)"}</li>
              <li>
                취급 치료영역:{" "}
                {candidate.therapeutic_areas?.join(", ") ?? "(미수집)"}
              </li>
              <li>
                GMP 제조시설:{" "}
                {candidate.gmp_certified === true
                  ? "O"
                  : candidate.gmp_certified === false
                    ? "X"
                    : "(미수집)"}
              </li>
              <li>
                수입 이력:{" "}
                {candidate.import_history === true
                  ? `O — ${candidate.import_history_detail ?? ""}`
                  : "(미수집)"}
              </li>
              <li>
                공공조달 낙찰: {candidate.public_procurement_wins ?? "(미수집)"}
              </li>
              <li>
                약국 체인: {candidate.pharmacy_chain_operator === true ? "O" : "X"}
              </li>
              <li>
                MAH 가능: {candidate.mah_capable === true ? "O" : "(미수집)"}
              </li>
              <li>
                한국 거래:{" "}
                {candidate.korea_partnership === true
                  ? `O — ${candidate.korea_partnership_detail ?? ""}`
                  : "(미수집)"}
              </li>
              <li className="text-gray-500 text-xs">
                출처: {candidate.source_secondary?.join(", ") ?? "-"}
              </li>
            </ul>
          </section>

          {/* 항목별 점수 */}
          <section>
            <h5 className="font-bold mb-2">📊 평가 항목별 점수</h5>
            <div className="score-grid grid grid-cols-5 gap-2 text-center text-sm">
              <ScoreCell label="① 매출" score={candidate.score_revenue} />
              <ScoreCell label="② 파이프라인" score={candidate.score_pipeline} />
              <ScoreCell label="③ 제조소" score={candidate.score_gmp} />
              <ScoreCell label="④ 수입" score={candidate.score_import} />
              <ScoreCell label="⑤ 약국체인" score={candidate.score_pharmacy_chain} />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
```

### 3.8 2차 심층 수집 (LLM 호출)

```typescript
// src/llm/partner_enrichment.ts
import { getAnthropicClient } from "../utils/anthropic_client";

const ENRICHMENT_TOOL = {
  name: "enrich_partner_profile",
  description: "파나마 제약 기업의 심층 정보를 JSON 스키마로 추출",
  input_schema: {
    type: "object",
    properties: {
      revenue_usd: { type: "number", description: "연 매출 USD (불명 시 null)" },
      employee_count: { type: "integer" },
      founded_year: { type: "integer" },
      therapeutic_areas: {
        type: "array",
        items: { type: "string" },
        description: "취급 치료영역 (예: 종양학, 순환기, 호흡기)",
      },
      gmp_certified: { type: "boolean" },
      import_history: { type: "boolean" },
      import_history_detail: { type: "string" },
      public_procurement_wins: { type: "integer" },
      pharmacy_chain_operator: { type: "boolean" },
      mah_capable: { type: "boolean" },
      korea_partnership: { type: "boolean" },
      korea_partnership_detail: { type: "string" },
      source_urls: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["revenue_usd"],
  },
};

export async function enrichCandidateWithLLM(
  candidate: PartnerCandidate,
): Promise<PartnerCandidate> {
  const anthropic = getAnthropicClient();

  // 구글 검색 + 홈페이지 fetch (Playwright 또는 fetch)
  const searchResults = await searchCompanyInfo(candidate.company_name);
  const websiteContent = candidate.website
    ? await fetchWebsiteContent(candidate.website)
    : "";

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1500,
    tools: [ENRICHMENT_TOOL],
    tool_choice: { type: "tool", name: "enrich_partner_profile" },
    messages: [
      {
        role: "user",
        content: `
파나마 제약 기업 "${candidate.company_name}"의 심층 프로필을 추출하시오.

[홈페이지 내용]
${websiteContent.slice(0, 3000)}

[구글 검색 결과]
${searchResults.slice(0, 5).map((r) => `- ${r.title}: ${r.snippet}`).join("\n")}

불명확한 필드는 null로 두시오. 추정 금지. 출처 URL은 확인 가능한 것만 포함.
        `.trim(),
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return candidate;
  }

  const enriched = toolUse.input as Record<string, unknown>;

  return {
    ...candidate,
    revenue_usd: toFiniteNumber(enriched.revenue_usd),
    employee_count: toFiniteNumber(enriched.employee_count),
    // ... (나머지 필드 매핑)
    collected_secondary_at: new Date().toISOString(),
  };
}
```

### 3.9 Supabase RPC (Top 10 선정 최적화)

```sql
-- 기본 정렬: 매출 규모 내림차순 Top 10
CREATE OR REPLACE FUNCTION get_top10_partners_default()
RETURNS SETOF panama_partner_candidates
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM panama_partner_candidates
  ORDER BY
    COALESCE(score_revenue, 0) DESC,
    company_name ASC
  LIMIT 10;
$$;
```

### 3.10 다운로드 PDF 구조 (3공정)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
파나마 유망 파트너 리스트 (3공정)
2026-04-18 · {제품명}
선택 기준: {체크된 항목 나열}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Top 10 요약표]
#  │ 기업명            │ 종합 점수 │ 채널     │ 한국 거래
1  │ ALFARMA S.A.     │ 92.5     │ 수입·유통│ O
2  │ SEVEN PHARMA     │ 89.0     │ 수입·유통│ X
... (10행)

[기업별 상세 프로필 — 10페이지 분량]
페이지 1: ALFARMA S.A.
  [1차 수집]
    전화·이메일·주소·웹사이트·출처
  [2차 심층 수집]
    매출·임직원·설립연도·치료영역·GMP·수입·
    공공조달·약국체인·MAH·한국거래·출처
  [항목별 점수]
    ① 매출 85  ② 파이프라인 90  ③ 제조소 0
    ④ 수입 100  ⑤ 약국체인 0
    ※ 미수집 정보는 "(미수집)"으로 공란 표시

페이지 2~10: 동일 포맷
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 3.11 수정·신규 파일 요약

| 파일 | 용도 | 상태 |
|---|---|---|
| `app/api/panama/phase3/route.ts` | API 엔드포인트 | 신규 |
| `src/llm/partner_enrichment.ts` | 2차 심층 수집 LLM | 신규 |
| `src/logic/partner_scorer.ts` | 5개 항목 점수화 | 신규 |
| `src/logic/partner_search.ts` | 1차 수집 DB 조회 | 신규 |
| `components/Phase3PartnerDiscovery.tsx` | 3공정 전체 UI | 신규 |
| `components/PartnerCard.tsx` | 카드 컴포넌트 | 신규 |
| `components/CriterionCheckbox.tsx` | 체크박스 | 신규 |
| `components/ScoreCell.tsx` | 점수 셀 | 신규 |
| `lib/phase3_pdf_template.ts` | 3공정 PDF 생성 | 신규 |
| Supabase migration | `panama_partner_candidates` 테이블 | 신규 |
| `scripts/runners/seed_partners_pharmchoices.ts` | PharmChoices 38사 적재 | 신규 |
| `scripts/runners/seed_partners_cphi.ts` | CPHI Japan 스크랩 | 신규 |
| `scripts/runners/seed_partners_dnb.ts` | D&B Panama 54사 적재 | 신규 |

---

## 🛡️ 절대 준수 사항

1. **any 타입 금지** — 모든 함수 명시적 타입
2. **.ts(로직) / .tsx(UI) 엄격 분리**
3. **Output ≠ Application** — 파일 생성 시 "로컬 반영 별도 필요" 명시
4. **미수집 정보 = "(미수집)"** 문자열로 표시. null·빈 문자열 직접 노출 금지
5. **출처 URL 명시** — 2차 심층 수집 결과 각 필드 옆에 출처 1개 이상
6. **PSI 점수 계산은 클라이언트 사이드** — 체크박스 조작 시 API 재호출 없음, 재렌더링만
7. **한국어 주석 핵심만** — 과도한 설명 금지
8. **기본 체크 상태**: ① 매출규모만 ON (`new Set(["revenue"])`)

---

## ✅ 작업 완료 기준

### 1공정
- [ ] 완료 토스트 문구 교체 확인

### 2공정
- [ ] 공공/민간 버튼 제거 확인
- [ ] 단일 분석 버튼으로 2개 루트 동시 산출 확인
- [ ] 탭 전환으로 공공·민간 결과 전환 확인
- [ ] PDF 보고서에 공공+민간 이원 표시 확인

### 3공정
- [ ] `panama_partner_candidates` 테이블 생성 + 마이그레이션 완료
- [ ] PharmChoices 38사 사전 적재 완료 (SELECT COUNT 검증)
- [ ] CPHI Japan 파나마 필터 스크랩 적재 완료
- [ ] D&B Panama 54사 적재 완료
- [ ] 중복 제거 후 전체 기업 수 70~80사 확인
- [ ] 분석 버튼 클릭 → 진행 체크포인트 4단계 동작 확인
- [ ] 체크박스 기본 상태 ① 매출규모만 ON 확인
- [ ] 체크박스 조작 시 Top 10 순위 즉시 재정렬 (API 재호출 없음) 확인
- [ ] 카드 클릭 시 상세 프로필 펼침 확인
- [ ] 미수집 정보 "(미수집)" 문자열 표시 확인
- [ ] 바이어 리스트 PDF 다운로드 — 10페이지 상세 프로필 생성 확인

---

## 📝 CHANGELOG.md 기록용 문구

```
## [2026-04-18] Session 25 — 메인프리뷰 페이지 1·2·3공정 통합 리디자인
### Changed (1공정)
- 완료 토스트 문구에 등급 라벨 명시 ("즉시 진입 가능", "단기 진입 가능" 등)

### Changed (2공정)
- 공공/민간 시장 택1 버튼 제거
- 단일 [AI 가격 분석 실행] 버튼으로 2개 루트 (Logic A·B) 동시 산출
- 결과 화면에 공공/민간 탭 전환 UI 도입
- API 응답 스키마 변경: public_market + private_market 병렬 반환
- 2공정 PDF 보고서 공공+민간 이원 표시

### Added (3공정)
- panama_partner_candidates 테이블 신규 생성 (1차+2차 수집 통합 스키마)
- PharmChoices 38사, CPHI Japan, D&B Panama 54사 사전 적재 스크립트 3종
- 2차 심층 수집 LLM 로직 (Haiku 기반 enrich_partner_profile tool)
- 5개 항목 점수화 로직 (매출·파이프라인·GMP·수입·약국체인)
- 체크박스 기반 Top 10 실시간 재정렬 (클라이언트 사이드 가중치 재계산)
- 기업 카드 클릭 시 1차+2차 통합 상세 프로필 펼침
- 바이어 리스트 PDF 다운로드 (Top 10 요약표 + 10페이지 상세)
```

---

## 🚀 Action Request

이해했으면 "세션 25 메인프리뷰 전면 리디자인 착수합니다. 1공정 토스트 교체부터 진행하겠습니다."라고 답하고, 순서대로 진행하시오.

**작업 순서 권장**:
1. 1공정 토스트 (15분)
2. 2공정 공공/민간 버튼 제거 + 탭 (2~3h)
3. 3공정 DB 테이블 생성 + 데이터 적재 스크립트 (3~4h)
4. 3공정 API + 점수화 로직 (2~3h)
5. 3공정 UI 컴포넌트 (3~4h)
6. 3공정 PDF 생성 (1~2h)

**총 예상**: 12~16시간 (D-6 완료 목표 기준 당일 마감 가능)
