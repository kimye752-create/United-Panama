# 🚨 Cursor 긴급 핫픽스 STEP9 — Hydration 에러 근본 해결

## 긴급도: ⭐⭐⭐ Critical — 발표 D-5, 3공정 핵심 기능 전체 장애

## 배경

STEP6·7·8 반복 수정에도 모달 팝업 미작동 지속. 
Console 진단 결과 **React Error #418, #423, #425 (Hydration Mismatch)** 3종 동시 발생 확인.

## 근본 원인

Next.js App Router + SSR 환경에서:
- `Phase3DetailModal` 의 `mounted` 가드 useEffect가 **서버 렌더와 클라이언트 렌더 불일치** 유발
- framer-motion LayoutGroup 이 hydration 실패 후 **카드 DOM을 하단으로 재배치**
- 결과: 모달이 렌더되어도 보이지 않고, 카드만 아래로 이동한 것처럼 보임

## 해결 전략

`dynamic import + ssr: false` 로 모달을 **클라이언트 전용 컴포넌트** 로 전환.
SSR 자체를 차단하여 hydration mismatch 원천 제거.

---

## 작업 1: Phase3DetailModal dynamic import 전환

### 1-1. Phase3Container.tsx 수정

**현재 (정적 import)**:
```tsx
import { Phase3DetailModal } from './Phase3DetailModal';
```

**변경 (dynamic ssr:false)**:
```tsx
import dynamic from 'next/dynamic';

const Phase3DetailModal = dynamic(
  () => import('./Phase3DetailModal').then(mod => ({ default: mod.Phase3DetailModal })),
  { ssr: false }
);
```

기존 정적 import 문 삭제. dynamic 변수가 대체.

### 1-2. Phase3DetailModal.tsx 에서 mounted 상태 완전 제거

**삭제할 코드**:
```tsx
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
  return () => {
    setMounted(false);
  };
}, []);
```

**렌더링 조건 수정**:

현재:
```tsx
if (!mounted || partner === null) {
  return null;
}
```

수정:
```tsx
if (partner === null) {
  return null;
}
```

**유지할 것**:
- ESC 키 useEffect
- document.body.style.overflow 잠금/원복 로직
- createPortal(modalContent, document.body)

**제거해도 됨**:
- useState import (더 이상 사용 안 함)

---

## 작업 2: layoutId 네임스페이스 분리

### 2-1. Phase3PartnerCard.tsx

```tsx
// 현재
layoutId={`p3-${partner.partner_id}`}

// 변경
layoutId={`p3-card-${partner.partner_id}`}
```

### 2-2. Phase3PartnerListRow.tsx

```tsx
// 현재
layoutId={`p3-${partner.partner_id}`}

// 변경
layoutId={`p3-list-${partner.partner_id}`}
```

### 트레이드오프

- ❌ 카드↔리스트 간 morph 애니메이션 포기 (11위→10위 시 변형 효과 상실)
- ✅ Top 10 내부 재정렬 애니메이션 유지
- ✅ 11~20위 리스트 내부 재정렬 애니메이션 유지
- ✅ 모달 정상 작동 (최우선)

---

## 작업 3: 게이지 정중앙 정렬 수정

Phase3PartnerCard.tsx 의 게이지 중심 숫자 영역 전체 교체:

```tsx
<div className="absolute inset-0 flex items-center justify-center">
  <div className="flex flex-col items-center justify-center" style={{ lineHeight: 1 }}>
    <motion.div
      key={psi}
      initial={{ opacity: 0.5, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="text-[24px] font-medium"
      style={{ color: style.mainText, lineHeight: 1 }}
    >
      {typeof psi === 'number' ? psi.toFixed(1).replace(/\.0$/, '') : psi}
    </motion.div>
    <div 
      className="text-[9px] font-medium mt-[3px]" 
      style={{ color: style.subText, lineHeight: 1 }}
    >
      PSI
    </div>
  </div>
</div>
```

### 핵심 변경

- 폰트 26px → 24px (링 안에 잘 들어가도록)
- `lineHeight: 1` 명시 (baseline 정렬 문제 해결)
- `flex flex-col items-center justify-center` 이중 센터링

---

## 작업 4: tsconfig.json paths 확인 (참고용)

현재 Phase3DetailModal.tsx import:
```tsx
import type { Partner, ProductId } from "@/src/lib/phase3/partners-data";
```

`@/src/lib/...` 경로가 표준인지 확인.
다른 파일들의 import 경로와 일치하는지 검토.

tsconfig.json 의 paths 섹션만 그대로 출력해서 보여주기.
불일치 발견 시 별도 수정 (선택).

---

## 작업 5: 빌드 + 푸시

```bash
rm -rf .next
npm run build
```

빌드 성공 후 커밋:
```
fix(phase3): 모달 dynamic ssr:false 전환으로 hydration error 해결 + layoutId 분리 + 게이지 중앙 정렬
```

origin/main 푸시.

---

## ⚠️ 절대 건드리지 말 것

- `hardcoded-partner-mapper.ts` 순위 보존 로직
- `Phase3RankList` useState 토글 상태
- `partners-data.ts`
- `Phase3ProductMatchSection.tsx`
- 3단계 안내 박스 (STEP7 완성분)

---

## 완료 보고 사항

1. `tsconfig.json` paths 섹션 내용
2. `Phase3Container.tsx` 의 dynamic import 적용 부분 전체 코드
3. `Phase3DetailModal.tsx` 의 mounted 제거 후 파일 맨 위 15줄
4. `Phase3PartnerCard.tsx` 와 `Phase3PartnerListRow.tsx` 의 layoutId 변경 전후
5. 빌드 성공 여부
6. 커밋 해시 + origin/main 푸시 완료 확인

---

## 배포 후 달강님 검증 포인트

### 필수 (모달)
1. ✅ 카드 클릭 → 화면 중앙 팝업 오버레이
2. ✅ 모달 뒤 배경 어두움 (bg-black/60)
3. ✅ ESC 키로 모달 닫힘
4. ✅ 배경 클릭으로 모달 닫힘
5. ✅ F12 Console React 에러 #418/#423/#425 **전부 사라짐**

### 필수 (카드)
6. ✅ 게이지 숫자 정중앙 배치
7. ✅ Top 5 헤더 "#1 · 본사 인도" 정상 노출
8. ✅ 🏅 TOP5 배지와 헤더 겹침 없음
9. ✅ 실버 카드가 골드와 명확히 구분

### 필수 (재정렬)
10. ✅ 체크박스 변경 시 Top 10 내부 부드럽게 재정렬
11. ✅ 11~20위 리스트 내부 부드럽게 재정렬
12. ✅ 재정렬 후 currentRank 라벨 자리와 일치

### 트레이드오프 인지
- ❌ Top 10↔11~20 경계 넘는 이동은 깜박으로 교체 (morph 포기)
- ❌ 모달 초기 로드 시 약 50~100ms 지연 (dynamic 특성)

둘 다 발표 시연에서 인지 불가능한 수준.
