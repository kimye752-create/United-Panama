# 파나마 보고서 1장 설계 명세 (Report 1 Spec)

> **세션 10 / 2026-04-12 패치**
> 파나마 1공정 시장 분석 보고서 — INN 1개당 1페이지 완결 구조
> W4 (Next.js 프론트 + 보고서 렌더링) 구현의 근거 문서
> 팀 공유용 · 수정 시 반드시 달강·PM 합의 필요
> **세션 10 변경**: 블록 5-3 "데이터 수집 시점" 코드 블록 → 해법 C 명시 (3계층 표현 통일)

---

## 🎯 설계 철학 — 3원칙

### 1. 인사이트 선행, 근거 후행 (Insight-First Structure)
- 팀원 호주 양식은 "관련 사이트"가 상단에 있어 심사위원의 15초를 URL 읽기에 소모시킴
- 파나마 보고서는 **"판정 한 줄 → 두괄식 3줄 → 본문 분석 → 근거·출처"** 순서 엄수
- 참조 URL은 반드시 **블록 5 (보고서 하단)** 에만 배치

### 2. McKinsey 컨설팅 보고서 구조
- 결론 → 핵심 근거 → 본문 분석 → 데이터 출처
- 데이터 나열이 아닌 "스토리가 있는 보고서"
- 심사위원 인지 패턴(15초 내 결론 전달)에 정확히 일치

### 3. Supabase 신뢰도를 시각적으로 증명
- 블록 5-1의 "출처 × 건수 × 신뢰도 테이블"이 계층형 수집 아키텍처의 결정체
- Gemini 단독으로는 절대 불가능한 기술적 차별화 포인트
- 출처별 confidence 값을 투명하게 노출하여 신뢰성 입증

---

## 📋 보고서 1장 구조 — 5개 블록

### 【블록 1】 헤더 — 제품 식별
```
브랜드명 | WHO INN | 함량·제형 | HS 코드 | Case 분류 | confidence
```

**필드 정의**:
- **브랜드명**: product-dictionary.ts의 kr_brand_name (예: "하이드린 캡슐")
- **WHO INN**: who_inn_en (예: "Hydroxyurea 500mg")
- **함량·제형**: 제품별 표준 함량과 제형 (예: "500mg Capsule")
- **HS 코드**: 3003 / 3004 / 2941 중 매칭
- **Case 분류**: A / B / C (자동 판정)
- **confidence**: Case 판정 엔진 출력 0.0~1.0

---

### 【블록 2】 핵심 판정 — 한 줄 결론 (최대 크기)

다음 3개 상태 중 하나를 큰 타이포그래피로 표시:

```
🟢 수출 가능 (Case A: 공공조달 + 민간 병행)
🟡 수출 조건부 (Case B: 민간 약국 채널 우선)
🔴 수출 불가 (Case C: 재평가 대기)
```

**시각 기준**:
- 폰트 크기: 본문의 2.5배 이상
- 상태별 색상: 🟢 emerald-600 / 🟡 amber-500 / 🔴 red-600
- 블록 2는 보고서 전체에서 가장 눈에 띄는 요소여야 함

---

### 【블록 3】 두괄식 판정 근거 — 3줄 요약

번호 매긴 3줄 리스트. 각 줄은 정량 수치 또는 등재 여부 등 **팩트 기반**이어야 함.

**예시 (Hydroxyurea / Case A)**:
```
1. WHO EML 2023 + PAHO Strategic Fund 등재 → 국제기구 조달 트랙 즉시 활용 가능
2. 한-중미 FTA 관세 0% + ITBMS 면세 → FOB 대비 최종가 경쟁력 최상위
3. 한국 위생선진국 지정(2023.6.28)으로 MINSA 등록 $500 / 0.5~1개월 간소화
```

**작성 원칙**:
- 각 줄에 최소 1개 정량 수치(%, $, 날짜) 포함
- 한 줄 30자 이내 (한 줄로 끝나야 가독성 확보)
- 추상적 표현 금지 ("유리하다", "좋다" 등 배제 — "관세 0%" 식으로)

---

### 【블록 4】 시장 진출 전략 — 본문 분석

4개 서브 섹션:

#### 4-1. 진입 채널 권고
- **우선 채널**: 공공조달 / 민간약국 / 병행 중 택일
- **단계별 진입 로드맵**: 1단계(초기 6개월) → 2단계(6~18개월) → 3단계(18개월+)
- **근거**: panama_distributors의 target_market 분포 기반

#### 4-2. 가격 포지셔닝
- **공공조달 낙찰가 범위**: panama WHERE pa_price_type='tender_award' 통계
- **민간 소매가 범위**: panama WHERE pa_price_type IN ('retail_normal','retail_promo') 통계
- **경쟁사 가격 대비 위치**: panama WHERE pa_notes LIKE '%COMPETITOR%' 참조
- 데이터 없는 경우: "데이터 수집 중" 명시 (추정값 금지)

#### 4-3. 유통 파트너 후보
- panama_distributors에서 target_market 매칭 업체 리스트
- 예: Feduro (both), Celmar (both), Haseth (public 전문), Astur (both)
- 3공정 AHP 엔진⑥ 결과가 있으면 ahp_psi_score 순으로 정렬

#### 4-4. 리스크 & 조건
- **선결 조건**: 등록 기간, 인증 요건, 초기 투자
- **잠재 리스크**: 경쟁 구도, 환율, 규제 변화
- **경쟁 구도**: Medipan / Rigar / GSK (현지 제조·다국적 임포터)
- **CDMO 전환 가능성**: 현지 제조사를 경쟁사가 아닌 파트너로 전환하는 옵션

---

### 【블록 5】 근거 & 출처 — 보고서 하단 (절대 상단 배치 금지)

#### 5-1. 참조 데이터 테이블 (Supabase 실적재)

```
┌──────────────┬────────┬──────────┐
│ 출처         │ 건수   │ 신뢰도    │
├──────────────┼────────┼──────────┤
│ World Bank   │ 1건    │ 0.95     │
│ WHO EML      │ 1건    │ 0.90     │
│ PAHO         │ 1건    │ 0.90     │
│ KOTRA        │ 1건    │ 0.85     │
│ ITA          │ 1건    │ 0.90     │
│ MOTIE        │ 1건    │ 0.85     │
│ PubMed       │ 1건    │ 0.90     │
│ PanamaCompra │ 0건    │ —        │
│ ACODECO      │ 1건    │ 0.75     │
│ MINSA        │ 0건    │ —        │
│ CSS          │ 0건    │ —        │
│ Arrocha      │ 0건    │ —        │
│ Metro Plus   │ 0건    │ —        │
│ Gemini seed  │ 12건   │ 0.70     │
└──────────────┴────────┴──────────┘
```

**구현**: `SELECT pa_source, COUNT(*), AVG(confidence) FROM panama GROUP BY pa_source`

#### 5-2. 참조 사이트 — 카테고리 4개로 묶기

**▸ 공공조달**
- PanamaCompra OCDS API (엔드포인트)
- PAHO Strategic Fund
- MINSA faddi

**▸ 규제·등재**
- WHO Essential Medicines List 2023
- PAHO Strategic Fund Formulary
- CABAMED 가격통제 리스트 (ACODECO)

**▸ 시장 거시**
- World Bank Panama Country Data
- KOTRA 2024 파나마 무역관 보고서
- ITA Panama Healthcare Commercial Guide

**▸ 규제 프레임워크**
- 한-중미 FTA (MOTIE, 2021.3.1 발효)
- 한국 위생선진국 지정 (MINSA, 2023.6.28)
- PubMed 임상 문헌 (INN별)

#### 5-3. 데이터 수집 시점

```
최종 수집: 2026-04-12
수집 방식: L1 정적 seed (사용자 검증) + L2 조건부 크롤러
의미적 신선도 판정: Phase 2 로드맵 — 해법 C (AI 2단계 게이트 아키텍처)
  - 설계 문서: docs/research/freshness_2gate_architecture.md
  - 시간 규칙 단독 판정 폐기, 휴리스틱+LLM Judge+web_search 3단계
L3 web_search 보강: Phase 2 구현 후 활성화 예정
```

---

## 🧠 Case 판정 엔진 명세

### 입력 인터페이스 (src/logic/case_judgment.ts)

```typescript
interface JudgmentInput {
  productId: string;            // 8 INN UUID
  emlWho: boolean;              // panama_eml.pa_eml_listed
  emlPaho: boolean;             // panama_eml.pa_paho_procurable
  emlMinsa: boolean;            // panama_eml.pa_minsa_essential
  panamacompraCount: number;    // panama WHERE pa_source='panamacompra'
  privateRetailCount: number;   // panama WHERE pa_source IN ('arrocha','metroplus')
  cabamedRegulated: boolean;    // panama WHERE pa_source='acodeco' AND pa_decree_listed=true
  distributorCount: number;     // panama_distributors WHERE target_market IN ('public','both')
}

interface JudgmentResult {
  case: 'A' | 'B' | 'C';
  verdict: '가능' | '조건부' | '불가';
  confidence: number;           // 0.0~1.0
  reasoning: string[];          // 두괄식 3줄 (블록 3 입력)
  risks: string[];              // 리스크 목록 (블록 4-4 입력)
}
```

### 판정 규칙 (단순 규칙 기반, 논리 명확)

#### Case A — 공공조달 즉시 진입 가능
**조건**: `emlWho && emlPaho && distributorCount >= 2`
**Verdict**: 🟢 가능
**Confidence**: 0.90
**Reasoning 템플릿**:
- "WHO EML + PAHO Strategic Fund 이중 등재"
- "한-중미 FTA 관세 0% + ITBMS 면세"
- "유통 파트너 {distributorCount}개 확보"

**Risks**:
- `panamacompraCount === 0` → "PanamaCompra 최근 낙찰 0건 → MINSA 직접 제안 루트 필요"

#### Case B — 민간 채널 진입
**조건**: `privateRetailCount > 0 || distributorCount >= 1`
**Verdict**: 🟡 조건부
**Confidence**: 0.75
**Reasoning 템플릿**:
- "민간 약국 채널 실데이터 확보 {privateRetailCount}건" (또는 유통 파트너 보유)
- "한국 위생선진국 지정으로 등록 $500/0.5~1개월"
- "파나마 국민 70% CSS 가입, 1인당 의료비 $1,557.81(World Bank/WHO GHED 2023)"

**Risks**:
- "공공조달 트랙 미확보 → 민간 유통사 의존 리스크"

#### Case C — 진입 불가 또는 대기
**조건**: 위 두 조건 모두 미충족
**Verdict**: 🔴 불가
**Confidence**: 0.65
**Reasoning 템플릿**:
- "EML 등재 없음 + 민간 채널 가격 데이터 없음"
- "공공조달 낙찰 이력 없음"
- "유통 파트너 매칭 실패"

**Risks**:
- "세션 8+에서 Arrocha/Metro Plus 크롤링 완료 후 재평가 필요"

---

## 📊 8개 INN 예측 판정 (세션 7 기준)

세션 6 골든 데이터 + pa_panamacompra 실측 결과 기반:

| # | INN | WHO EML | PAHO | Distributor | PanamaCompra | 예측 Case | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | Hydroxyurea | ✅ | ✅ | 4 | 0 | **A** | 🟢 가능 |
| 2 | Cilostazol | ❌ | ❌ | 4 | 0 | **B** | 🟡 조건부 |
| 3 | Itopride | ❌ | ❌ | 4 | 0 | **B** | 🟡 조건부 |
| 4 | Aceclofenac | ❌ | ❌ | 4 | 0 | **B** | 🟡 조건부 |
| 5 | Rabeprazole | ❌ | ❌ | 4 | 0 | **B** | 🟡 조건부 |
| 6 | Erdosteine | ❌ | ❌ | 4 | 0 | **B** | 🟡 조건부 |
| 7 | Omega-3 ee | ❌ | ❌ | 4 | 0 | **B** | 🟡 조건부 |
| 8 | Levodropropizine | ❌ | ❌ | 4 | 0 | **B** | 🟡 조건부 |

### 🎯 한 방 결론 (발표장 핵심 메시지)

> **"파나마 8개 품목 중 공공조달 즉시 진입은 Hydroxyurea 1개, 나머지 7개는 민간 약국 채널 조건부 진입"**

- 단일 결론 구조로 심사위원 기억에 남기기 용이
- 8개 데이터가 모두 동일한 결론으로 나오지 않는다는 것 자체가 **판정 엔진이 작동하고 있다는 증거**
- 세션 8+에서 Arrocha/Metro Plus 크롤링 완료 시 Case B 품목들의 confidence가 0.75 → 0.85 상승 예상

---

## 🎨 UI 디자인 가이드

### 스타일 결정: A안 — 의료 보고서 스타일
- 배경: 화이트
- 포인트 컬러: 네이비 (슬레이트-800)
- 블록 구분: 얇은 회색 선 (슬레이트-200)
- 폰트: Pretendard (한글) + Inter (영문)
- 구현: Tailwind CSS 단독

### 상태 컬러 (블록 2)
- 🟢 Case A: `text-emerald-600 bg-emerald-50 border-emerald-200`
- 🟡 Case B: `text-amber-600 bg-amber-50 border-amber-200`
- 🔴 Case C: `text-red-600 bg-red-50 border-red-200`

### 타이포그래피 계층
- H1 (보고서 제목): `text-3xl font-bold`
- H2 (블록 헤더): `text-xl font-semibold`
- 판정 한 줄 (블록 2): `text-4xl font-bold` (가장 큼)
- 본문: `text-base leading-relaxed`
- 근거 테이블: `text-sm font-mono`

---

## 📄 PDF 출력 규격 (W5 엔진⑦)

### 페이지 구성
- **커버 페이지** (1장): 국가명 + 보고서 생성 일자 + 8 INN 요약 표
- **INN별 보고서** (8장): 각 INN당 1페이지 = 블록 1~5 전체
- **총 페이지 수**: 9장

### 기술 스택 결정
- **@react-pdf/renderer** 선택 (puppeteer 대신)
- 이유: React 컴포넌트로 선언적 작성 가능, Vercel 서버리스 환경 호환, 폰트 embedding 쉬움
- 한글 폰트: Pretendard TTF 번들 포함 필수

### 파일명 규격
```
UPharma_Panama_Report_{YYYYMMDD}_{INN}.pdf
예: UPharma_Panama_Report_20260412_Hydroxyurea.pdf
```

### 통합 PDF 옵션
- 8개 INN 전체 다운로드 시: `UPharma_Panama_Report_Full_20260412.pdf` (9페이지)
- 개별 INN 다운로드 시: 해당 INN 1페이지만

---

## ⚠ 절대 원칙 (보고서 설계 협상 불가)

1. **참조 사이트는 절대 블록 1~4에 배치 금지** — 블록 5에만 존재
2. **판정 문장(블록 2)은 한 줄** — 다음 줄로 넘어가지 않도록 타이포그래피 조정
3. **reasoning 3줄은 정량 수치 필수** — 추상적 표현 금지
4. **데이터 없는 경우 "수집 중" 명시** — 추정값 또는 mock 데이터 금지
5. **confidence는 반드시 표시** — 신뢰도 투명성이 차별화 포인트
6. **Case 판정은 규칙 기반** — LLM 판단 금지 (재현성 확보)
7. **한국어 보고서** — 회사명·정부기관명·약품명만 원어 병기 가능

---

## 🔗 관련 파일 (W4 구현 시 생성 예정)

| 파일 | 역할 | 블록 |
|---|---|---|
| `src/logic/case_judgment.ts` | Case 판정 엔진 | 블록 2, 3, 4-4 |
| `src/logic/fetch_panama_data.ts` | Supabase 출처별 집계 조회 | 블록 5-1 |
| `src/logic/distributor_matcher.ts` | 유통 파트너 매칭 | 블록 4-3 |
| `app/panama/page.tsx` | 파나마 국가 페이지 | 전체 진입점 |
| `components/Report1.tsx` | 보고서 1 렌더링 | 전체 5개 블록 |
| `components/CaseBadge.tsx` | 블록 2 판정 배지 | 블록 2 |
| `components/SourceTable.tsx` | 근거 테이블 | 블록 5-1 |
| `lib/pdf/Report1Document.tsx` | @react-pdf/renderer | W5 PDF 출력 |

---

## 📌 세션 히스토리

- **세션 7 / 2026-04-12 03:00 무렵**: 팀원 호주 보고서 양식 분석 후 파나마 버전 설계 확정
- **피드백 제공자**: 달강 (김예환)
- **핵심 피드백**: "참조 사이트는 보고서 초두에 있으면 안 됨. 인사이트 먼저 나오고 근거는 후반부에"
- **이 피드백이 전체 설계 철학의 근간이 됨**
- **세션 10 / 2026-04-12**: 블록 5-3 코드 블록 패치. 해법 C (AI 의미 게이트) 명시. 9:1 + 3계층 표현 통일 (L1 정적 seed / L2 조건부 크롤러 / L3 web_search). 본격 구현은 Phase 2 로드맵 (세션 10+).

---

**본 문서는 파나마 1공정 보고서의 설계 근거이며, W4 구현 시 Cursor는 반드시 이 명세를 준수해야 함.**