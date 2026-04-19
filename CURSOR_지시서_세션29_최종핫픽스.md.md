# 🚨 Cursor 최종 통합 핫픽스 — 3공정 UI 5대 이슈 전면 해결

## 긴급도: 발표 D-5, 최종 확정 디자인 반영

## 배경

`c523cba` 배포 후 달강님 UI 확인 + 디자인 레퍼런스 합의 → **5대 이슈 전부 해결** 필요.

1. ⭐ 카드 클릭 시 모달이 **팝업 오버레이** 아닌 **리스트 하단 인라인**
2. "📊 PSI 계산식" 수식에 항목 명칭 누락
3. 11~20위 리스트 "접기/펼치기" 토글 작동 안 함
4. ⭐ Top 5 카드 골드 배경 사라짐
5. ⭐ **카드 전면 재설계** — 레퍼런스 비율 1:1.4, PSI 원형 게이지, 본사·운영 분리, 금/은 단색

## 작업 원칙

- **Plan A**: 기존 코드 보존, 지정 변경점만 수정
- **any 타입 절대 금지**
- 외부 링크 `target="_blank" rel="noopener noreferrer"` 필수
- `target="_blank"` 없을 때: `e.stopPropagation()` 필수 (카드 클릭과 충돌 방지)
- 발표 D-5, 다른 기능 건드리지 말 것

## 작업 전 필수 확인

1. `src/lib/phase3/partners-data.ts` 에 `oneLineIntro`, `fiveFactorsDescription`, `companyDescription` 필드 존재 여부 확인
2. 기존 `Phase3PartnerCardShell.tsx` 위치 확인 (또는 `PartnerCard.tsx`)
3. `Phase3DetailModal.tsx` 현재 렌더링 구조 확인

---

## 작업 1: 모달을 팝업 오버레이로 변경 ⭐ 최우선

### 현재 증상

카드 클릭 → 11~20위 리스트 바로 아래에 모달 내용이 **인라인 섹션**으로 렌더링됨. 스크롤 많이 내려야 보임.

### 원인 추정

`Phase3DetailModal`이 `fixed inset-0 z-50` 오버레이 구조가 아니라, 그냥 `<div>` 로 리스트 하단에 append 되어 있음.

### 수정 내용

`Phase3DetailModal.tsx` 전체를 아래 구조로 교체:

```tsx
'use client';

import { useEffect } from 'react';
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
  // ESC 키 + 배경 스크롤 잠금
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (partner) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [partner, onClose]);

  if (!partner) return null;

  // PSI 5대 요소 배점 계산
  const scores = [
    { label: '매출규모 (Revenue)', value: partner.revenueScore, weight: 0.35 },
    { label: '파이프라인 (Pipeline)', value: partner.pipelineAvgScore, weight: 0.28 },
    { label: '제조소 보유 (Manufacturing)', value: partner.manufacturingScore, weight: 0.20 },
    { label: '수입 경험 (Import Exp.)', value: partner.importExperienceScore, weight: 0.12 },
    { label: '약국체인 운영 (Pharmacy)', value: partner.pharmacyChainScore, weight: 0.05 },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
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
          {/* 좌상: 기본 정보 */}
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

          {/* 우상: 5대 요소 정성 서술 */}
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

        {/* ㅗ자 블록: 하단 (PSI 배점 + 기업 소개) */}
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
}

// --- 헬퍼 컴포넌트 ---

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

### 부모 컴포넌트 연결 확인

`Phase3Container.tsx` (또는 상위 컴포넌트):

```tsx
const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
const selectedPartner = selectedPartnerId 
  ? partners.find(p => p.partner_id === selectedPartnerId) 
  : null;

// 모달은 fixed overlay이므로 DOM 트리 어디에 두든 무방
// 다만 부모에 overflow:hidden이나 transform이 없어야 함
return (
  <div>
    <Phase3Top10Grid onCardClick={setSelectedPartnerId} ... />
    <Phase3RankList onRowClick={setSelectedPartnerId} ... />
    
    {selectedPartner && (
      <Phase3DetailModal
        partner={selectedPartner.partner_meta}
        selectedProductSlug={selectedProductSlug}
        onClose={() => setSelectedPartnerId(null)}
      />
    )}
  </div>
);
```

**주의**: `Phase3DetailModal`의 prop인 `partner`는 `partners-data.ts`의 원본 `Partner` 타입이 들어가야 함 (`companyDescription`, `fiveFactorsDescription` 등 v2 필드 필요). `PartnerWithPSI`가 아니라 원본 `Partner` 객체를 전달.

## 작업 2: 카드 전면 재설계 ⭐ 최우선

### 신규 파일: `Phase3PartnerCard.tsx`

기존 `Phase3PartnerCardShell.tsx`를 **대체**. 아래 코드 그대로 복사:

```tsx
'use client';

import type { PartnerWithPSI } from '@/logic/phase3/types';

interface Phase3PartnerCardProps {
  partner: PartnerWithPSI;
  onClick: () => void;
}

export function Phase3PartnerCard({ partner, onClick }: Phase3PartnerCardProps) {
  const isTop5 = partner.hc_display.hc_catalog_rank <= 5;
  const psi = partner.dynamic_psi;
  const rank = partner.hc_display.hc_catalog_rank;
  const homeCountry = partner.partner_meta.countryName;
  const panamaAddress = formatPanamaAddress(partner.partner_meta.address);
  
  // 게이지 계산: 반지름 34 → 둘레 ≈ 213.6
  const circumference = 213.6;
  const progress = circumference * (1 - psi / 100);

  // 스타일 분기
  const style = isTop5 ? GOLD_STYLE : SILVER_STYLE;

  return (
    <button
      onClick={onClick}
      className="w-full text-left cursor-pointer transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-400 rounded-xl"
      style={{ aspectRatio: '1 / 1.4' }}
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
          {isTop5 ? '🏅 TOP5' : `🥈 #${rank}`}
        </div>

        {/* 상단: 순위 + 본사 */}
        <div className="text-[10px] font-medium mb-[6px]" style={{ color: style.subText }}>
          #{rank} · 본사 {homeCountry}
        </div>

        {/* 회사명 (대형) */}
        <div
          className="text-[22px] font-medium leading-[1.1] mb-[3px] tracking-tight"
          style={{ color: style.mainText }}
        >
          {formatPartnerName(partner.partner_meta.partnerName)}
        </div>
        <div className="text-[11px]" style={{ color: style.subText }}>
          {partner.partner_meta.groupName 
            ? partner.partner_meta.groupName.replace(/\s*\([^)]*\)/, '')
            : ''}
        </div>

        {/* 게이지 정중앙 (flex: 1) */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative w-[82px] h-[82px]">
            <svg width="82" height="82" viewBox="0 0 82 82" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="41" cy="41" r="34" fill="none" stroke={style.gaugeBg} strokeWidth="7" />
              <circle
                cx="41"
                cy="41"
                r="34"
                fill="none"
                stroke={style.gaugeFill}
                strokeWidth="7"
                strokeDasharray={circumference}
                strokeDashoffset={progress}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-[26px] font-medium leading-none" style={{ color: style.mainText }}>
                {psi}
              </div>
              <div className="text-[9px] font-medium mt-[2px]" style={{ color: style.subText }}>
                PSI
              </div>
            </div>
          </div>
        </div>

        {/* 좌하단: 파나마시티 + 한 줄 소개 */}
        <div className="text-[12px] leading-[1.45] font-medium mb-[6px]" style={{ color: style.mainText }}>
          <div className="mb-[3px]">📍 {panamaAddress}</div>
          <div className="font-normal text-[11px]" style={{ color: style.bodyText }}>
            {partner.partner_meta.oneLineIntro}
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
            {partner.partner_meta.email && (
              <a
                href={`mailto:${partner.partner_meta.email}`}
                onClick={(e) => e.stopPropagation()}
                className="text-[18px] leading-none hover:opacity-70"
                title={partner.partner_meta.email}
              >
                ✉
              </a>
            )}
            {partner.partner_meta.website && (
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
    </button>
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
  bg: '#E8E7E1',
  border: '#888780',
  badgeBg: '#5F5E5A',
  badgeText: '#F1EFE8',
  mainText: '#2C2C2A',
  subText: '#444441',
  bodyText: '#5F5E5A',
  gaugeBg: 'rgba(68, 68, 65, 0.2)',
  gaugeFill: '#5F5E5A',
  divider: 'rgba(44, 44, 42, 0.3)',
} as const;

// --- 포맷 헬퍼 ---

/**
 * 회사명이 긴 경우 2줄로 분리 표시
 * 예: "SEVEN PHARMA, S.A." → "SEVEN\nPHARMA"
 */
function formatPartnerName(name: string): string {
  // "S.A." / ", S.A." / " S.A." 등 법인 표기 제거
  const cleaned = name.replace(/,?\s*S\.?A\.?$/i, '').trim();
  
  // 긴 이름은 공백 기준 2줄 분리 (20자 이상)
  if (cleaned.length > 20 && cleaned.includes(' ')) {
    const mid = Math.floor(cleaned.length / 2);
    const spaceAfterMid = cleaned.indexOf(' ', mid - 3);
    if (spaceAfterMid > 0 && spaceAfterMid < cleaned.length - 3) {
      return cleaned.slice(0, spaceAfterMid) + '\n' + cleaned.slice(spaceAfterMid + 1);
    }
  }
  return cleaned;
}

/**
 * 주소에서 파나마 운영 거점만 추출
 * 예: "Farmazona, José D. Bazán, ..., Zona Libre de Colón" → "파나마시티 ZLC"
 * 예: "Ciudad de Panamá (Menafar 법인)" → "파나마시티"
 */
function formatPanamaAddress(address: string): string {
  if (address.includes('Zona Libre de Colón') || address.includes('ZLC')) {
    return '파나마시티 ZLC';
  }
  if (address.includes('Costa del Este')) {
    return '파나마시티 Costa del Este';
  }
  if (address.includes('MMG Tower')) {
    return '파나마시티 MMG Tower';
  }
  // 기본: 파나마시티로 통일
  return '파나마시티';
}
```

**`formatPartnerName` 주의**: 회사명에 `\n`이 들어가려면 `whitespace-pre-line` 클래스 추가 필요. 위 코드에 이미 반영되어야 함 — 회사명 `<div>` 에 `whitespace-pre-line` 클래스 추가:

```tsx
<div
  className="text-[22px] font-medium leading-[1.1] mb-[3px] tracking-tight whitespace-pre-line"
  style={{ color: style.mainText }}
>
  {formatPartnerName(partner.partner_meta.partnerName)}
</div>
```

### Grid 레이아웃 수정

`Phase3Top10Grid.tsx` (또는 동급 컴포넌트):

```tsx
export function Phase3Top10Grid({ partners, onCardClick }: Props) {
  return (
    <div className="grid grid-cols-5 gap-2 max-[1023px]:grid-cols-2 max-[640px]:grid-cols-1">
      {partners.map((partner) => (
        <Phase3PartnerCard
          key={partner.partner_id}
          partner={partner}
          onClick={() => onCardClick(partner.partner_id)}
        />
      ))}
    </div>
  );
}
```

**gap-2 (8px)** 로 설정. 카드 5개 × 220px + 갭 4개 × 8px = 약 1132px 적정.

## 작업 3: 11~20위 리스트 토글 작동 복구

### 현재 증상

"접기" 텍스트 보이는데 클릭해도 실제로 접히지 않음.

### 수정 내용

`Phase3RankList.tsx` 전체 교체:

```tsx
'use client';

import { useState } from 'react';
import type { PartnerWithPSI } from '@/logic/phase3/types';
import { Phase3PartnerListRow } from './Phase3PartnerListRow';

interface Phase3RankListProps {
  partners: PartnerWithPSI[];
  onRowClick: (partnerId: string) => void;
}

export function Phase3RankList({ partners, onRowClick }: Phase3RankListProps) {
  const [isOpen, setIsOpen] = useState(true); // 기본 펼침

  return (
    <div className="mt-6">
      {/* 토글 헤더 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors"
      >
        <span className="font-semibold text-slate-700">
          {isOpen ? '▼' : '▶'} 11~20위 · 후보 리스트
        </span>
        <span className="text-xs text-slate-500">
          {isOpen ? '접기' : `펼치기 (${partners.length}개)`}
        </span>
      </button>

      {/* 조건부 렌더링 */}
      {isOpen && (
        <div className="mt-2 space-y-2">
          {partners.map((partner) => (
            <Phase3PartnerListRow
              key={partner.partner_id}
              partner={partner}
              onClick={() => onRowClick(partner.partner_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

### 검증

배포 후 "▼ 접기" 클릭 → 10개 아이템 사라지고 "▶ 펼치기 (10개)"로 변경 → 다시 클릭 시 복구.

## 작업 4: PSI 계산식 → PSI 배점 (항목 명시)

**작업 1 내부에 이미 포함됨.** `Phase3DetailModal`의 하단 블록에서 처리 완료.

확인 포인트: `scores` 배열의 순서는 **세션 27 가중치 우선순위 공식** 따라야 함:
1. 매출 35%
2. 파이프라인 28%
3. 제조 20%
4. 수입경험 12%
5. 약국체인 5%

## 작업 5: Top 5 골드 배경 복구

**작업 2 내부에 이미 포함됨.** `GOLD_STYLE` 상수의 `bg: '#FAEEDA'` 로 연한 골드 복구.

## 작업 6: 기타 보존 사항 (절대 건드리지 말 것)

- 체크박스 가중치 `(35%)` 라벨
- 상단 선택 제품 배너
- PDF 다운로드 버튼
- "파트너 매칭" 버튼 활성화 로직
- 1·2공정 미완료 시 노란 안내 박스
- 스테퍼 `isExecuting` 조건부 렌더링 (`finally` 블록 포함)
- `hardcoded-partner-mapper.ts` 순위 보존 로직

## 작업 순서

```
1. Phase3DetailModal.tsx 전체 교체 (팝업 오버레이 + PSI 배점)
2. Phase3PartnerCard.tsx 신규 작성 (또는 Phase3PartnerCardShell 대체)
3. Phase3Top10Grid.tsx 에서 신규 카드 컴포넌트 사용
4. Phase3RankList.tsx 토글 상태 추가
5. Phase3Container.tsx 에서 모달 연결 확인
6. 로컬 빌드: rm -rf .next && npm run build
7. 커밋 + 푸시
```

## 커밋 메시지

```
feat(phase3): 카드·모달·리스트 최종 재설계 (세션 29 통합 핫픽스)

- Phase3PartnerCard 신규: 비율 1:1.4, PSI 원형 게이지 정중앙, 
  Top 5 골드(#FAEEDA)/6~10위 은색(#E8E7E1) 단색 테마
- 본사·운영 분리 표기: 상단 "본사 XX" / 좌하단 📍 파나마시티
- 회사명 22px 대형, formatPartnerName으로 긴 이름 2줄 분리
- 접점 아이콘 18px 확대 (이메일 mailto / 웹사이트 새 탭)
- Phase3DetailModal: fixed inset-0 팝업 오버레이 + ESC 키 닫기 + 
  배경 스크롤 잠금
- 모달 하단: "PSI 배점" 5대 요소별 계산식 + 기업 소개
- Phase3RankList: useState 토글 복구, 기본 펼침 상태
- 파나마시티 표기 한글 통일 (formatPanamaAddress)
- Grid 5열 배치 (gap-2), 태블릿 2열, 모바일 1열

보존: 체크박스 가중치 %, 선택 제품 배너, PDF 버튼, 파트너 매칭 버튼,
스테퍼 조건부 렌더링, hardcoded-partner-mapper 순위 보존 로직
```

## 완료 보고 사항

1. 수정·신규 파일 목록
2. 로컬 빌드 성공 여부
3. 커밋 해시
4. 빌드 로그 스크린샷 (에러 없음 확인용)

## ⚠️ Cursor 주의사항

- `partner.partner_meta.oneLineIntro` / `partner.partner_meta.fiveFactorsDescription` / `partner.partner_meta.companyDescription` 이 존재하는지 먼저 확인. 없으면 `partners-data.ts` 파일이 v2 버전이 아닐 수 있음.
- `PartnerWithPSI` 타입에서 `partner_meta` 가 원본 `Partner` 전체를 담고 있는지 확인. 없으면 매퍼(`hardcoded-partner-mapper.ts`) 수정 필요.
- `aspect-ratio: 1 / 1.4` 브라우저 호환성 이슈 없음 (Chrome/Safari/Firefox 전부 지원, 2021+).
- 회사명 2줄 분리 시 `whitespace-pre-line` 누락 주의.
