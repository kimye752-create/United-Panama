# 🚨 Cursor 긴급 핫픽스 STEP7 — 동적 순위 + 애니메이션 복구

## 긴급도: ⭐⭐⭐ Critical — 발표 D-5, 3공정 핵심 기능 회귀

## 배경

STEP6 핫픽스(`4d5ae69` + `9e3e397`) 배포 확인 결과 **핵심 기능 2가지 회귀 + 디자인 일부 이탈** 확인.

---

## 🔥 확인된 Critical 이슈 3가지

### 이슈 1: 체크박스 가중치 변경 시 카드 재정렬 애니메이션 사라짐 ⭐

**증상**: 체크박스 해제·선택 시 카드가 부드럽게 이동하지 않고, 값만 번쩍 바뀜.

**원인**: STEP6에서 `LayoutGroup` 제거. 지시서 문장("LayoutGroup 제거")이 모달 구조 관련 맥락이었는데 재정렬 애니메이션용 LayoutGroup까지 같이 제거된 것으로 추정.

**해결**: `framer-motion`의 `LayoutGroup` + `layoutId` 복구.

### 이슈 2: 카드 순위 라벨이 원본 카탈로그 순위로 고정 ⭐

**증상**: 체크박스 해제 시 PSI 점수는 재정렬되지만 카드에 표시되는 순위(`#7`, `#87` 등)가 원본 순위 그대로 남아있음. 예를 들어:
- **3번째 자리**에 "#8 ROCHE SERVICIOS" 카드가 놓임
- Top 5 골드 배지가 **원본 1~5위**에만 부여되고, 현재 상위 5개 자리 기준이 아님

**원인**: `partner.hc_display.hc_catalog_rank`를 그대로 표시. 재정렬된 **배열 인덱스 기반 동적 순위**를 사용해야 함.

**해결**: 카드 컴포넌트가 `currentRank` prop를 받아 배열 인덱스로 렌더링.

### 이슈 3: 카드 디자인이 세션 29 지시서와 이탈

**증상**:
- 헤더 "본사 XX" 표기 누락 (그냥 국기만 작게)
- 회사명 폰트 목표 22px인데 실제 훨씬 작음
- 6~10위 은색 카드 색상이 골드와 거의 구분 안 됨
- 게이지 위치가 중앙이 아닌 우측 치우침

**원인**: STEP6에서 `Phase3PartnerCard.tsx` 신규 작성 시 지시서 일부만 반영.

**해결**: 카드 컴포넌트 재정비 (아래 완성된 코드 사용).

---

## 작업 원칙

- Plan A: 원본 보존 + 지정 변경만
- any 타입 금지
- `framer-motion` 이미 `package.json`에 있는지 확인. 없으면 설치 `npm install framer-motion`
- 기존 카드 크기·비율(`aspect-ratio: 1 / 1.4`) 유지
- 모달·리스트·토글 등 STEP6에서 완성된 다른 기능은 건드리지 말 것

---

## 작업 1: LayoutGroup 복구 (애니메이션 재활성화) ⭐ 최우선

### 수정 대상: `Phase3Container.tsx`

### 현재 (추정)

```tsx
return (
  <div>
    <Phase3Top10Grid ... />
    <Phase3RankList ... />
    {selectedPartner && <Phase3DetailModal ... />}
  </div>
);
```

### 변경

```tsx
import { LayoutGroup } from 'framer-motion';

return (
  <div>
    {/* ⭐ 카드 영역 전체를 LayoutGroup으로 감싸기 */}
    <LayoutGroup>
      <Phase3Top10Grid ... />
      <Phase3RankList ... />
    </LayoutGroup>
    
    {/* 모달은 portal이라 LayoutGroup 밖에 둬도 무방 */}
    {selectedPartner && <Phase3DetailModal ... />}
  </div>
);
```

**주의**: 이미 `LayoutGroup` import가 STEP6에서 완전히 제거되었다면 다시 import 추가 필요.

---

## 작업 2: 동적 순위 props 전달 ⭐ 최우선

### 수정 대상: `Phase3Top10Grid.tsx`

### 현재 (추정)

```tsx
<Phase3PartnerCard
  key={partner.partner_id}
  partner={partner}
  onClick={() => onCardClick(partner.partner_id)}
/>
```

### 변경

```tsx
{partners.map((partner, index) => (
  <Phase3PartnerCard
    key={partner.partner_id}
    partner={partner}
    currentRank={index + 1}  // ⭐ 배열 인덱스 기반 동적 순위
    onClick={() => onCardClick(partner.partner_id)}
  />
))}
```

### 같은 원칙으로 `Phase3RankList.tsx` / `Phase3PartnerListRow.tsx`

11~20위 리스트도 동일하게 `index + 11` 로 전달:

```tsx
{partners.map((partner, index) => (
  <Phase3PartnerListRow
    key={partner.partner_id}
    partner={partner}
    currentRank={index + 11}  // ⭐ 11위부터 시작
    onClick={() => onRowClick(partner.partner_id)}
  />
))}
```

---

## 작업 3: Phase3PartnerCard.tsx 전체 재작성 ⭐ 최우선

STEP6에서 작성된 현재 카드 파일을 **아래 코드로 완전히 교체**.

```tsx
'use client';

import { motion } from 'framer-motion';
import type { PartnerWithPSI } from '@/logic/phase3/types';

interface Phase3PartnerCardProps {
  partner: PartnerWithPSI;
  currentRank: number;
  onClick: () => void;
}

export function Phase3PartnerCard({ 
  partner, 
  currentRank,
  onClick 
}: Phase3PartnerCardProps) {
  // ⭐ isTop5 판정: 원본 hc_catalog_rank 아닌 currentRank 기반
  const isTop5 = currentRank <= 5;
  
  const psi = partner.dynamic_psi;
  const homeCountry = partner.partner_meta?.countryName ?? '';
  const panamaAddress = formatPanamaAddress(partner.partner_meta?.address ?? '');
  
  // 게이지 계산: 반지름 34 → 둘레 ≈ 213.6
  const circumference = 213.6;
  const progress = circumference * (1 - psi / 100);

  const style = isTop5 ? GOLD_STYLE : SILVER_STYLE;

  return (
    <motion.button
      layout
      layoutId={partner.partner_id}
      transition={{ layout: { duration: 0.4, ease: 'easeOut' } }}
      onClick={onClick}
      className="w-full text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-400 rounded-xl"
      style={{ aspectRatio: '1 / 1.4' }}
      whileHover={{ scale: 1.02 }}
    >
      <div
        className="w-full h-full p-[14px] flex flex-col rounded-xl border-[1.5px] relative overflow-hidden"
        style={{
          background: style.bg,
          borderColor: style.border,
        }}
      >
        {/* 우상단 배지 */}
        <div
          className="absolute top-0 right-0 text-[10px] font-medium px-2 py-[3px] rounded-bl-lg"
          style={{
            background: style.badgeBg,
            color: style.badgeText,
          }}
        >
          {isTop5 ? '🏅 TOP5' : `🥈 #${currentRank}`}
        </div>

        {/* 상단: 순위 + 본사 */}
        <div className="text-[10px] font-medium mb-[6px]" style={{ color: style.subText }}>
          #{currentRank} · 본사 {homeCountry}
        </div>

        {/* 회사명 대형 */}
        <div
          className="text-[22px] font-medium leading-[1.1] mb-[3px] tracking-tight whitespace-pre-line"
          style={{ color: style.mainText }}
        >
          {formatPartnerName(partner.partner_meta?.partnerName ?? '')}
        </div>
        <div className="text-[11px]" style={{ color: style.subText }}>
          {partner.partner_meta?.groupName 
            ? partner.partner_meta.groupName.replace(/\s*\([^)]*\)/, '')
            : ''}
        </div>

        {/* 게이지 정중앙 */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative w-[82px] h-[82px]">
            <svg 
              width="82" 
              height="82" 
              viewBox="0 0 82 82" 
              style={{ transform: 'rotate(-90deg)' }}
            >
              <circle 
                cx="41" 
                cy="41" 
                r="34" 
                fill="none" 
                stroke={style.gaugeBg} 
                strokeWidth="7" 
              />
              <motion.circle
                cx="41"
                cy="41"
                r="34"
                fill="none"
                stroke={style.gaugeFill}
                strokeWidth="7"
                strokeDasharray={circumference}
                strokeLinecap="round"
                initial={false}
                animate={{ strokeDashoffset: progress }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.div
                key={psi}
                initial={{ opacity: 0.5, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="text-[26px] font-medium leading-none"
                style={{ color: style.mainText }}
              >
                {typeof psi === 'number' ? psi.toFixed(1).replace(/\.0$/, '') : psi}
              </motion.div>
              <div className="text-[9px] font-medium mt-[2px]" style={{ color: style.subText }}>
                PSI
              </div>
            </div>
          </div>
        </div>

        {/* 좌하단: 파나마시티 + 한 줄 소개 */}
        <div className="text-[12px] leading-[1.45] font-medium mb-[6px]" style={{ color: style.mainText }}>
          <div className="mb-[3px]">📍 {panamaAddress}</div>
          <div className="font-normal text-[11px] line-clamp-1" style={{ color: style.bodyText }}>
            {partner.partner_meta?.oneLineIntro ?? ''}
          </div>
        </div>

        {/* 하단 CTA */}
        <div
          className="flex justify-between items-center pt-[6px] border-t"
          style={{ borderColor: style.divider }}
        >
          <span className="text-[10.5px] font-medium" style={{ color: style.subText }}>
            상세 →
          </span>
          <div className="flex gap-[10px]">
            {partner.partner_meta?.email && (
              <a
                href={`mailto:${partner.partner_meta.email}`}
                onClick={(e) => e.stopPropagation()}
                className="text-[18px] leading-none hover:opacity-70"
                title={partner.partner_meta.email}
              >
                ✉
              </a>
            )}
            {partner.partner_meta?.website && (
              <a
                href={partner.partner_meta.website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[18px] leading-none hover:opacity-70"
                title={partner.partner_meta.website}
              >
                🌐
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  );
}

// --- 스타일 상수 ---

const GOLD_STYLE = {
  bg: '#FAEEDA',
  border: '#EF9F27',
  badgeBg: '#BA7517',
  badgeText: '#FAEEDA',
  mainText: '#412402',
  subText: '#854F0B',
  bodyText: '#633806',
  gaugeBg: 'rgba(132, 79, 11, 0.2)',
  gaugeFill: '#BA7517',
  divider: 'rgba(132, 79, 11, 0.3)',
} as const;

const SILVER_STYLE = {
  bg: '#D3D1C7',      // ⭐ 더 진한 실버로 변경 (골드와 구분 강화)
  border: '#5F5E5A',  // ⭐ 더 진한 경계
  badgeBg: '#2C2C2A',
  badgeText: '#F1EFE8',
  mainText: '#2C2C2A',
  subText: '#444441',
  bodyText: '#5F5E5A',
  gaugeBg: 'rgba(44, 44, 42, 0.2)',
  gaugeFill: '#2C2C2A',
  divider: 'rgba(44, 44, 42, 0.4)',
} as const;

// --- 포맷 헬퍼 (동일 위치에 유지) ---

function formatPartnerName(name: string): string {
  const cleaned = name.replace(/,?\s*S\.?A\.?$/i, '').replace(/\s*\(Free Zone\)$/i, '').trim();
  
  if (cleaned.length > 18 && cleaned.includes(' ')) {
    const mid = Math.floor(cleaned.length / 2);
    const spaceAfterMid = cleaned.indexOf(' ', mid - 3);
    if (spaceAfterMid > 0 && spaceAfterMid < cleaned.length - 3) {
      return cleaned.slice(0, spaceAfterMid) + '\n' + cleaned.slice(spaceAfterMid + 1);
    }
  }
  return cleaned;
}

function formatPanamaAddress(address: string): string {
  if (!address) return '파나마시티';
  if (address.includes('Zona Libre de Colón') || address.includes('ZLC')) return '파나마시티 ZLC';
  if (address.includes('Costa del Este')) return '파나마시티 Costa del Este';
  if (address.includes('MMG Tower')) return '파나마시티 MMG';
  return '파나마시티';
}
```

---

## 작업 4: 리스트 행도 동적 순위 적용

### 수정 대상: `Phase3PartnerListRow.tsx`

```tsx
'use client';

import { motion } from 'framer-motion';
import type { PartnerWithPSI } from '@/logic/phase3/types';

interface Phase3PartnerListRowProps {
  partner: PartnerWithPSI;
  currentRank: number;
  onClick: () => void;
}

export function Phase3PartnerListRow({ 
  partner, 
  currentRank,
  onClick 
}: Phase3PartnerListRowProps) {
  return (
    <motion.button
      layout
      layoutId={partner.partner_id}
      transition={{ layout: { duration: 0.4, ease: 'easeOut' } }}
      onClick={onClick}
      className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xs font-bold text-slate-700">#{currentRank}</span>
        <span className="text-xs text-slate-400">· {partner.partner_meta?.countryCode ?? ''}</span>
        <span className="font-semibold text-slate-800 truncate">
          {partner.partner_meta?.partnerName ?? ''}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-sm font-semibold">
            {typeof partner.dynamic_psi === 'number' 
              ? partner.dynamic_psi.toFixed(1).replace(/\.0$/, '') 
              : partner.dynamic_psi}
          </div>
          <div className="text-xs text-slate-500">PSI</div>
        </div>
        {partner.partner_meta?.website && (
          <a
            href={partner.partner_meta.website}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-slate-400 hover:text-blue-600"
          >
            🌐
          </a>
        )}
      </div>
    </motion.button>
  );
}
```

---

## 작업 5: framer-motion 설치 확인

터미널에서:

```bash
npm list framer-motion
```

없으면 설치:

```bash
npm install framer-motion
```

---

## 작업 순서

```
1. framer-motion 설치 확인
2. Phase3Container.tsx에 LayoutGroup 추가
3. Phase3Top10Grid.tsx에서 currentRank 전달
4. Phase3RankList.tsx에서 currentRank 전달 (index + 11)
5. Phase3PartnerCard.tsx 전체 교체 (동적 순위 + motion + 실버 색상 강화)
6. Phase3PartnerListRow.tsx 수정 (motion.button + currentRank)
7. 로컬 빌드: rm -rf .next && npm run build
8. 커밋 + 푸시
```

---

## 커밋 메시지

```
fix(phase3): 동적 순위 + 재정렬 애니메이션 복구 + 실버 카드 대비 강화

- Phase3Container: LayoutGroup 복구 (framer-motion 재정렬 애니메이션)
- Phase3Top10Grid / Phase3RankList: currentRank prop 전달 (배열 인덱스 기반)
- Phase3PartnerCard: motion.button + layoutId로 부드러운 재정렬,
  currentRank 기반 isTop5 판정 (원본 hc_catalog_rank 대신),
  실버 카드 색상 강화 (#D3D1C7 + 진한 경계)
- Phase3PartnerListRow: motion.button 적용, currentRank 사용
- 게이지 strokeDashoffset도 motion으로 smooth transition
```

---

## 검증 포인트 (배포 후 달강님 확인)

1. ✅ 체크박스 해제 시 카드가 부드럽게 이동 (촤르륵 애니메이션)
2. ✅ 재정렬 후 **현재 1~5위 자리**의 카드가 골드
3. ✅ 재정렬 후 **현재 6~10위 자리**의 카드가 실버
4. ✅ 카드 헤더 `#N` 이 실제 현재 자리와 일치
5. ✅ 실버 카드가 골드와 명확히 구분됨 (더 진한 회색 톤)
6. ✅ PSI 값 변경 시 게이지 링도 부드럽게 애니메이션
7. ✅ 모달 팝업 여전히 정상 작동
8. ✅ 11~20위 토글 여전히 정상 작동
9. ✅ 모든 카드 `#N · 본사 XX` 표기 정상

---

## ⚠️ Cursor 주의사항

1. `LayoutGroup` import가 STEP6에서 완전히 제거됐을 수 있음. `framer-motion`에서 다시 import 추가.
2. `currentRank` prop 추가는 **3개 파일**에 걸쳐 진행 (Grid + RankList + Card). 일관되게 전달할 것.
3. `isTop5` 판정은 반드시 **`currentRank <= 5`** 로 할 것. `hc_catalog_rank` 사용 금지.
4. 실버 색상 `#D3D1C7`은 세션 29 합의안 v4 기준. 이전 `#E8E7E1`(너무 밝음)로 돌리지 말 것.
5. 모달(`Phase3DetailModal.tsx`)은 STEP6에서 완성됐으므로 **건드리지 말 것**.
6. 리스트 토글 상태(`Phase3RankList.tsx`의 `useState`)도 STEP6 완성분이므로 보존.

---

## 완료 보고 사항

1. 수정 파일 목록
2. 로컬 빌드 성공 여부 (에러 없음)
3. `framer-motion` 버전
4. 커밋 해시
5. 검증 포인트 9개 중 몇 개 스스로 확인 가능한지
