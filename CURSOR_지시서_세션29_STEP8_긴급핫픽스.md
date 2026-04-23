# 🔥 Cursor 긴급 핫픽스 STEP8 — 모달 먹통 + 카드 디자인 3가지

## 긴급도: ⭐⭐⭐ Critical — 발표 D-5

## 배경

STEP7 핫픽스(`073e402`) 배포 후 4가지 이슈 확인:

1. ⭐ **모달 클릭 시 화면 멈춤** (팝업 안 뜸, 스크롤 잠김, 아이콘 클릭 먹통)
2. PSI 게이지가 카드 정중앙이 아닌 우측 하단 치우침
3. Top 5 골드 카드 우상단 `🏅 TOP5` 배지가 본사 표기와 겹침
4. Top 5 카드에서 `#1 · 본사 인도` 같은 헤더 텍스트 자체가 안 보임

---

## 🔥 이슈 1: 모달 먹통 해결 ⭐ 최우선 ⭐

### 증상 (정밀 재현)

- 카드 클릭 → 화면 전체 멈춤
- 마우스 휠 작동 X
- 페이지 내 다른 버튼(예: 체크박스)은 클릭 가능
- 팝업 자체가 화면에 **안 보임**
- 이메일·지구본 아이콘도 클릭 무반응

### 원인 진단

**가장 가능성 높은 시나리오**:

STEP6에서 `createPortal`을 쓰되 `document.body` 를 타겟으로 하는 코드가 들어갔으나:
- SSR(Next.js) 환경에서 **초기 렌더 시 `document` 미존재** → 포털 타겟 null
- 또는 `createPortal` 자체를 쓰지 않고 그냥 `<div>` 반환 → 부모 DOM 안에 갇힘
- `document.body.style.overflow = 'hidden'` 는 실행되어 스크롤만 잠김

### 해결 방법

`Phase3DetailModal.tsx` 를 **클라이언트 전용 + 명시적 Portal 컴포넌트** 로 재작성.

### Phase3DetailModal.tsx 전체 교체 코드

```tsx
'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Partner, ProductId } from '@/lib/phase3/partners-data';
import { Phase3ProductMatchSection } from './Phase3ProductMatchSection';

interface Phase3DetailModalProps {
  partner: Partner | null;
  selectedProductSlug: ProductId | null;
  onClose: () => void;
}

export function Phase3DetailModal({
  partner,
  selectedProductSlug,
  onClose,
}: Phase3DetailModalProps) {
  // ⭐ SSR 안전: mounted 상태로 포털 타겟 보호
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // ⭐ ESC 키 + 스크롤 잠금 (partner 있을 때만 적용, cleanup 확실히)
  useEffect(() => {
    if (!partner) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEsc);
    
    // ⭐ 원래 overflow 값 저장 후 복원
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = originalOverflow;
    };
  }, [partner, onClose]);

  // ⭐ 렌더링 조건 분기: mounted + partner 모두 있어야 렌더
  if (!mounted || !partner) return null;

  // PSI 5대 요소 배점
  const scores = [
    { label: '매출규모 (Revenue)', value: partner.revenueScore, weight: 0.35 },
    { label: '파이프라인 (Pipeline)', value: partner.pipelineAvgScore, weight: 0.28 },
    { label: '제조소 보유 (Manufacturing)', value: partner.manufacturingScore, weight: 0.20 },
    { label: '수입 경험 (Import Exp.)', value: partner.importExperienceScore, weight: 0.12 },
    { label: '약국체인 운영 (Pharmacy)', value: partner.pharmacyChainScore, weight: 0.05 },
  ];

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 (sticky) */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-700">#{partner.rank}</span>
            {partner.rank <= 5 && <span>🏅</span>}
            <h2 className="text-lg font-bold text-slate-900">{partner.partnerName}</h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-base font-semibold text-amber-700">
              PSI {partner.basePSI}
            </span>
            <button
              onClick={onClose}
              aria-label="닫기"
              className="text-slate-500 hover:text-slate-900 text-xl leading-none w-8 h-8 flex items-center justify-center rounded hover:bg-slate-100"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ㅗ자 블록: 상단 2열 */}
        <div className="grid grid-cols-2 border-b border-slate-200">
          <div className="p-4 border-r border-slate-200">
            <h3 className="text-sm font-bold text-slate-700 mb-3">🏢 기본 정보</h3>
            <div className="space-y-2 text-sm">
              <InfoRow icon="📍" label="소재지" value={partner.address} />
              <InfoRow
                icon="✉"
                label="이메일"
                value={partner.email}
                isLink={!!partner.email}
                href={partner.email ? `mailto:${partner.email}` : null}
              />
              <InfoRow icon="📞" label="연락처" value={partner.phone} />
              <InfoRow
                icon="🌐"
                label="웹사이트"
                value={partner.website}
                isLink={!!partner.website}
                href={partner.website}
              />
              <InfoRow icon="📋" label="MINSA" value={partner.minsaLicense} />
            </div>
          </div>

          <div className="p-4">
            <h3 className="text-sm font-bold text-slate-700 mb-3">📊 5대 요소 현황</h3>
            <div className="space-y-2 text-sm">
              <FactorRow icon="💰" label="매출규모" value={partner.fiveFactorsDescription.revenue} />
              <FactorRow icon="🏭" label="제조소 보유" value={partner.fiveFactorsDescription.manufacturing} />
              <FactorRow icon="💊" label="약국체인 운영" value={partner.fiveFactorsDescription.pharmacyChain} />
              <FactorRow icon="📦" label="파이프라인" value={partner.fiveFactorsDescription.pipeline} />
              <FactorRow icon="🌍" label="수입 경험" value={partner.fiveFactorsDescription.importExperience} />
            </div>
          </div>
        </div>

        {/* PSI 배점 + 기업 소개 */}
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-bold text-slate-700 mb-3">📊 PSI 배점</h3>

          <div className="font-mono text-xs bg-white p-4 rounded border border-slate-200 mb-4">
            <div className="space-y-1.5">
              {scores.map((s) => (
                <div key={s.label} className="flex justify-between">
                  <span className="text-slate-600">{s.label}</span>
                  <span className="text-slate-900">
                    {s.value}점 × {(s.weight * 100).toFixed(0)}% ={' '}
                    <strong>{(s.value * s.weight).toFixed(1)}</strong>
                  </span>
                </div>
              ))}
              <div className="border-t border-slate-300 my-2" />
              <div className="flex justify-between font-bold text-slate-900">
                <span>총점 (PSI)</span>
                <span className="text-amber-700 text-base">{partner.basePSI}</span>
              </div>
            </div>
          </div>

          <h3 className="text-sm font-bold text-slate-700 mb-2">💡 기업 소개</h3>
          <div className="text-sm text-slate-700 whitespace-pre-line">
            {partner.companyDescription}
          </div>
        </div>

        {/* 8제품 매칭 */}
        <div className="p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3">💊 8제품 매칭</h3>
          <Phase3ProductMatchSection
            partner={partner}
            selectedProductSlug={selectedProductSlug}
          />
        </div>
      </div>
    </div>
  );

  // ⭐ createPortal로 document.body에 직접 렌더링
  return createPortal(modalContent, document.body);
}

// --- 헬퍼 컴포넌트 (기존 유지) ---

interface InfoRowProps {
  icon: string;
  label: string;
  value: string | null;
  isLink?: boolean;
  href?: string | null;
}

function InfoRow({ icon, label, value, isLink, href }: InfoRowProps) {
  return (
    <div className="flex items-start gap-2">
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-slate-500">{label}</div>
        {isLink && href ? (
          <a
            href={href}
            target={href.startsWith('mailto:') ? undefined : '_blank'}
            rel={href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
            className="text-blue-600 hover:underline break-all"
          >
            {value || '정보 없음'}
          </a>
        ) : (
          <div className="text-slate-700 break-all">{value || '정보 없음'}</div>
        )}
      </div>
    </div>
  );
}

interface FactorRowProps {
  icon: string;
  label: string;
  value: string;
}

function FactorRow({ icon, label, value }: FactorRowProps) {
  return (
    <div className="flex items-start gap-2">
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-slate-700">{value}</div>
      </div>
    </div>
  );
}
```

### 핵심 수정 포인트

1. **`mounted` 상태 추가** — SSR 안전 가드
2. **`createPortal(modalContent, document.body)`** — 명시적 포털 사용
3. **`z-[9999]`** — 다른 요소보다 확실히 위
4. **cleanup 로직 강화** — `partner` 없으면 `useEffect` early return
5. **overflow 복원** — 원래 값 저장 후 복원 (빈 문자열로 덮어쓰지 않음)

---

## 🎨 이슈 2: PSI 게이지 정중앙 배치

### 원인

상단 텍스트 블록(헤더 + 회사명 + 그룹명)이 게이지 공간을 침범해서 `flex-1` 이 제대로 작동 안 함.

### 해결 방법

`Phase3PartnerCard.tsx` 상단 블록 **고정 높이 확보** + `min-h-0` 로 flex 동작 보장.

### 수정 코드

```tsx
{/* ⭐ 상단: 고정 높이 + 순위 라벨 */}
<div className="text-[10px] font-medium mb-[6px] mt-[2px] min-h-[14px]" 
     style={{ color: style.subText }}>
  #{currentRank} · 본사 {homeCountry}
</div>

{/* ⭐ 회사명 블록: 고정 높이 확보 */}
<div className="min-h-[50px]">
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
</div>

{/* ⭐ 게이지 영역: min-h-0 + flex-1 로 정중앙 확보 */}
<div className="flex-1 min-h-0 flex items-center justify-center">
  <div className="relative w-[82px] h-[82px]">
    {/* ... 기존 게이지 SVG */}
  </div>
</div>
```

---

## 🎨 이슈 3: Top 5 배지 vs 본사 표기 겹침 해결

### 원인

`🏅 TOP5` 배지가 `absolute top-0 right-0`로 우상단 붙어있는데, 그 아래 본사 표기(`#1 · 본사 인도`)가 같은 라인에 나옴. 배지 폭만큼 본사 표기가 가려짐.

### 해결 방법 (2가지 중 택 1)

#### 방법 A: 배지를 좀 더 작게 + 본사 표기에 우측 패딩

```tsx
{/* 배지 축소 */}
<div
  className="absolute top-0 right-0 text-[9px] font-medium px-[6px] py-[2px] rounded-bl-md"
  style={{
    background: style.badgeBg,
    color: style.badgeText,
  }}
>
  {isTop5 ? '🏅 TOP5' : `🥈 #${currentRank}`}
</div>

{/* 본사 표기 영역에 우측 패딩 (배지 피하기) */}
<div className="text-[10px] font-medium mb-[6px] pr-[55px]" 
     style={{ color: style.subText }}>
  #{currentRank} · 본사 {homeCountry}
</div>
```

#### 방법 B: 배지와 본사 표기를 같은 줄에 배치 (왼쪽 본사 · 오른쪽 배지) ⭐ 추천

```tsx
{/* ⭐ 상단 줄: 왼쪽 본사 + 오른쪽 배지 (flex 정렬) */}
<div className="flex items-center justify-between mb-[6px] mt-[-4px] mr-[-4px]">
  <div className="text-[10px] font-medium" style={{ color: style.subText }}>
    #{currentRank} · 본사 {homeCountry}
  </div>
  <div
    className="text-[9px] font-medium px-[6px] py-[2px] rounded-bl-md rounded-tr-lg"
    style={{
      background: style.badgeBg,
      color: style.badgeText,
    }}
  >
    {isTop5 ? '🏅 TOP5' : `🥈 #${currentRank}`}
  </div>
</div>
```

**방법 B의 장점**: 
- `absolute` 배지 제거 → 레이아웃 자연스러움
- 본사 표기 가려짐 문제 원천 차단
- 더 깔끔

**⭐ 방법 B 사용 권장**

---

## 🎨 이슈 4: Top 5 카드 헤더 "본사 XX" 표기 보존

방법 B를 적용하면 자동 해결됨. 헤더가 배지 왼쪽에 확실히 노출되므로 `#1 · 본사 인도` 문구가 모든 카드에서 보임.

---

## Phase3PartnerCard.tsx 전체 교체 코드 (이슈 2·3·4 통합 적용)

```tsx
'use client';

import { motion } from 'framer-motion';
import type { PartnerWithPSI } from '@/logic/phase3/types';
import { formatPartnerName, formatPanamaAddress } from '@/logic/phase3/phase3_partner_card_formatters';

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
  const isTop5 = currentRank <= 5;
  const psi = partner.dynamic_psi;
  const homeCountry = partner.partner_meta?.countryName ?? '';
  const panamaAddress = formatPanamaAddress(partner.partner_meta?.address ?? '');
  
  const circumference = 213.6;
  const progress = circumference * (1 - psi / 100);

  const style = isTop5 ? GOLD_STYLE : SILVER_STYLE;

  return (
    <motion.button
      layout
      layoutId={`p3-${partner.partner_id}`}
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
        {/* ⭐ 상단 줄: 왼쪽 본사 표기 + 오른쪽 배지 (같은 줄) */}
        <div className="flex items-start justify-between mb-[6px] -mt-[4px] -mx-[4px]">
          <div className="text-[10px] font-medium pl-[4px] pt-[4px]" style={{ color: style.subText }}>
            #{currentRank} · 본사 {homeCountry}
          </div>
          <div
            className="text-[9px] font-medium px-[6px] py-[3px] rounded-bl-md rounded-tr-lg shrink-0"
            style={{
              background: style.badgeBg,
              color: style.badgeText,
            }}
          >
            {isTop5 ? '🏅 TOP5' : `🥈 #${currentRank}`}
          </div>
        </div>

        {/* ⭐ 회사명 블록: min-h 확보 */}
        <div className="min-h-[50px]">
          <div
            className="text-[20px] font-medium leading-[1.1] mb-[3px] tracking-tight whitespace-pre-line"
            style={{ color: style.mainText }}
          >
            {formatPartnerName(partner.partner_meta?.partnerName ?? '')}
          </div>
          <div className="text-[11px]" style={{ color: style.subText }}>
            {partner.partner_meta?.groupName 
              ? partner.partner_meta.groupName.replace(/\s*\([^)]*\)/, '')
              : ''}
          </div>
        </div>

        {/* ⭐ 게이지: flex-1 + min-h-0 으로 정중앙 확보 */}
        <div className="flex-1 min-h-0 flex items-center justify-center">
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

        {/* 좌하단 */}
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
  bg: '#D3D1C7',
  border: '#5F5E5A',
  badgeBg: '#2C2C2A',
  badgeText: '#F1EFE8',
  mainText: '#2C2C2A',
  subText: '#444441',
  bodyText: '#5F5E5A',
  gaugeBg: 'rgba(44, 44, 42, 0.2)',
  gaugeFill: '#2C2C2A',
  divider: 'rgba(44, 44, 42, 0.4)',
} as const;
```

**주요 변경 포인트**:
- 회사명 폰트 22px → 20px (본사 표기와 배지 한 줄 배치 후 공간 확보)
- 상단 라인 flex 정렬 (본사 왼쪽 / 배지 오른쪽)
- 회사명 블록 `min-h-[50px]` 고정
- 게이지 `flex-1 min-h-0` 로 정중앙 보장

---

## 작업 순서

```
1. Phase3DetailModal.tsx 전체 교체 (createPortal + mounted 가드)
2. Phase3PartnerCard.tsx 전체 교체 (헤더 flex 배치 + 게이지 중앙)
3. 로컬 빌드: rm -rf .next && npm run build
4. 커밋 + 푸시
```

---

## 커밋 메시지

```
fix(phase3): 모달 createPortal 복구 + 카드 헤더 배치·게이지 정중앙

- Phase3DetailModal: createPortal(document.body) 명시 적용,
  mounted 상태 가드로 SSR 안전, z-[9999]로 계층 보장,
  overflow 원복 로직 강화 (빈 문자열 대신 원래 값 저장)
- Phase3PartnerCard: 상단 라인을 flex 2열(본사 표기 / TOP5 배지)로
  재배치하여 배지가 본사 표기 가리는 문제 해결,
  회사명 블록 min-h-[50px] 고정,
  게이지 영역 flex-1 min-h-0 로 정중앙 배치 보장,
  회사명 22px → 20px 조정 (공간 균형)
```

---

## ⚠️ Cursor 주의사항

1. **`createPortal` import 필수**: `import { createPortal } from 'react-dom';`
2. **`'use client'` 지시어 필수** (Next.js App Router)
3. **`mounted` 상태 없이 createPortal 쓰면 SSR 에러** 가능 → 반드시 포함
4. **`document.body.style.overflow` 복원 시 원래 값 저장**: 빈 문자열로 덮어쓰면 부모 CSS 무효화
5. **모달 내부 `onClick={(e) => e.stopPropagation()}`**: 외부 클릭 닫기 방지
6. **`Phase3PartnerCard` 회사명 폰트 22px → 20px** 조정 이유: 본사·배지 헤더 한 줄 배치 후 공간 부족
7. **`Phase3Container.tsx` 의 모달 렌더링 위치 확인**: 
   - `LayoutGroup` 밖에 두되
   - 컴포넌트 트리 최상위에 배치
   - `<Phase3DetailModal partner={selectedPartner} ... />` 구조

---

## 완료 보고 사항

1. 수정 파일 목록
2. 로컬 빌드 성공 여부
3. 커밋 해시
4. 자가 검증:
   - 카드 클릭 시 모달 팝업 정상 오픈? (개발 모드에서 확인)
   - 게이지 정중앙 배치?
   - Top 5 카드 헤더 "본사 XX" 표기 정상?

---

## 배포 후 달강님 검증 포인트

1. ✅ 카드 클릭 → 화면 중앙 모달 팝업
2. ✅ 모달 뒤 배경 어두움 (bg-black/60)
3. ✅ ESC 키로 모달 닫힘
4. ✅ 배경 클릭으로 모달 닫힘
5. ✅ 모달 안 내용 클릭은 닫힘 없음
6. ✅ 게이지가 카드 정중앙
7. ✅ Top 5 카드 헤더 "#1 · 본사 인도" 정상 노출
8. ✅ `🏅 TOP5` 배지가 헤더 가리지 않음
9. ✅ ✉ 🌐 아이콘 정상 작동 (모달 안 열림)
10. ✅ 마우스 휠 스크롤 정상
