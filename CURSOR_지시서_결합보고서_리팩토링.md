# Cursor 지시서 — 결합 보고서 시스템 리팩토링

**프로젝트**: United Panama (UPharma Export AI)  
**작성일**: 2026-04-21 (D-6, 발표 D-Day: 2026-04-24)  
**세션**: 27  
**작업 범위**: 3개 단계별 보고서 + 결합본 자동 생성 시스템 구축

---

## ⚠ Cursor 작업 시작 전 필독

1. **이 지시서는 대대적 리팩토링 작업**이다. 반드시 **Step 0 DB 백업을 먼저 수행**하고 완료 확인 후 Step 1 진입한다.
2. 각 Step은 **순서대로 진행**하되, Step 내 번호는 병렬 진행 가능.
3. 모든 파일 변경은 CHANGELOG.md에 기록.
4. `any` 타입 절대 금지. 명시적 타입 사용.
5. `.ts`(로직) / `.tsx`(UI) 분리 원칙 준수.
6. 기존 파일 수정 시 **삭제 금지 → 주석 처리 후 대체안 제시**.
7. 작업 완료 시 각 Step의 "완료 기준" 체크리스트 전부 만족 확인.

---

## 📦 Step 0: DB 백업 (절대 필수, 최우선)

### 0-1. Supabase 대시보드 수동 백업

1. Supabase Dashboard 접속 → 현재 프로젝트 선택
2. `Project Settings` → `Database` → `Backups` 이동
3. `Create manual backup` 버튼 클릭
4. 백업명: `pre-combined-report-refactor-20260421`
5. 백업 생성 완료 확인

### 0-2. 로컬 SQL 덤프 저장 (2차 안전장치)

터미널에서 실행:

```bash
# backups 디렉토리 생성
mkdir -p backups

# pg_dump 실행 (Supabase 연결 문자열 필요)
# PROJECT_REF, PASSWORD, REGION은 Supabase Settings에서 확인
pg_dump "postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres" \
  --schema=public \
  --no-owner \
  --no-acl \
  -f backups/supabase_backup_20260421_pre_combined_refactor.sql

# 파일 크기 확인 (수백 KB 이상이어야 정상)
ls -lh backups/supabase_backup_20260421_pre_combined_refactor.sql
```

### 0-3. 핵심 테이블 행 수 기록

Supabase SQL Editor에서 실행 후 결과를 `backups/row_counts_20260421.txt`에 저장:

```sql
SELECT 'panama' AS tbl, COUNT(*) AS cnt FROM panama
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'report_cache', COUNT(*) FROM report_cache;
-- 필요 시 프로젝트에 존재하는 다른 테이블도 추가
```

### 0-4. 완료 기준

- [ ] Supabase 대시보드에 manual backup 생성 확인
- [ ] 로컬 `.sql` 덤프 파일 존재 및 크기 확인 (0바이트 아님)
- [ ] `row_counts_20260421.txt` 저장 완료
- [ ] 달강에게 완료 보고 후 Step 1 진행 승인 대기

---

## 🗄 Step 1: DB 스키마 추가

### 1-1. `panama_report_session` 테이블 생성

**파일**: `scripts/ddl/panama_report_session.sql`

```sql
-- 3개 단계별 보고서 + 결합본을 관리하는 세션 테이블
-- 각 단계는 독립 실행되지만 결합본은 3개 모두 존재해야 생성됨

CREATE TABLE IF NOT EXISTS panama_report_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  country TEXT NOT NULL DEFAULT 'panama',
  
  -- 단계별 보고서 FK
  market_report_id UUID,
  pricing_public_report_id UUID,   -- 공공 시장 (양쪽 동시 생성)
  pricing_private_report_id UUID,  -- 민간 시장 (양쪽 동시 생성)
  partner_report_id UUID,
  combined_report_id UUID,          -- 최종 결합본
  
  -- 완료 타임스탬프 (created_at 순서 = 1→2→3 결합 순서 보장용)
  market_completed_at TIMESTAMPTZ,
  pricing_completed_at TIMESTAMPTZ,
  partner_completed_at TIMESTAMPTZ,
  combined_generated_at TIMESTAMPTZ,
  
  -- 결합본 다운로드 가능 여부 (원본 3개 모두 있어야 true)
  can_download_combined BOOLEAN GENERATED ALWAYS AS (
    market_completed_at IS NOT NULL
    AND pricing_completed_at IS NOT NULL
    AND partner_completed_at IS NOT NULL
  ) STORED,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_session_product 
  ON panama_report_session(product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_report_session_combined 
  ON panama_report_session(can_download_combined) 
  WHERE can_download_combined = true;

-- RLS 비활성화 (프로젝트 공통 원칙)
ALTER TABLE panama_report_session DISABLE ROW LEVEL SECURITY;

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_report_session ON panama_report_session;
CREATE TRIGGER trg_update_report_session
  BEFORE UPDATE ON panama_report_session
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 1-2. `reports` 테이블 확인/생성

프로젝트에 `reports` 테이블이 이미 있다면 스키마 일치 여부만 확인. 없다면 생성:

**파일**: `scripts/ddl/reports_table.sql`

```sql
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES panama_report_session(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('market', 'pricing_public', 'pricing_private', 'partner', 'combined')),
  pdf_storage_path TEXT,
  report_data JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_session ON reports(session_id, type);
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;
```

### 1-3. Supabase Storage 버킷 확인

Supabase Dashboard에서 `reports` 버킷 존재 확인. 없으면 생성:
- 버킷명: `reports`
- Public: false
- File size limit: 50MB

### 1-4. 완료 기준

- [ ] `panama_report_session` 테이블 생성 확인 (`SELECT * FROM panama_report_session LIMIT 1` 에러 없음)
- [ ] `reports` 테이블 확인 또는 생성 완료
- [ ] `reports` Storage 버킷 존재 확인
- [ ] 인덱스 2개 생성 확인
- [ ] RLS 비활성화 확인

---

## 🔧 Step 2: 백엔드 로직 구현

### 2-1. 타입 정의

**파일**: `src/types/report_session.ts`

```typescript
export type ReportType = 'market' | 'pricing_public' | 'pricing_private' | 'partner' | 'combined';

export interface ReportSession {
  id: string;
  product_id: string;
  country: string;
  
  market_report_id: string | null;
  pricing_public_report_id: string | null;
  pricing_private_report_id: string | null;
  partner_report_id: string | null;
  combined_report_id: string | null;
  
  market_completed_at: string | null;
  pricing_completed_at: string | null;
  partner_completed_at: string | null;
  combined_generated_at: string | null;
  
  can_download_combined: boolean;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  session_id: string;
  type: ReportType;
  pdf_storage_path: string | null;
  report_data: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface GeneratedReportListItem {
  id: string;
  type: ReportType;
  title: string;
  marketSegment?: 'public' | 'private';
  createdAt: string;
  hasPdf: boolean;
  isFinal: boolean;
}
```

### 2-2. 세션 초기화 API (시장조사 자동 생성)

**파일**: `app/api/panama/report/session/init/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateMarketReport } from '@/logic/reports/market_generator';

export async function POST(req: NextRequest) {
  try {
    const { productId, country = 'panama' } = await req.json();
    
    if (!productId) {
      return NextResponse.json(
        { error: 'PRODUCT_ID_REQUIRED' }, 
        { status: 400 }
      );
    }
    
    const supabase = createClient();
    
    // 1. 세션 생성
    const { data: session, error: sessionError } = await supabase
      .from('panama_report_session')
      .insert({ product_id: productId, country })
      .select()
      .single();
    
    if (sessionError) throw sessionError;
    
    // 2. 시장조사 보고서 생성 (LLM 호출 포함)
    const marketReport = await generateMarketReport({
      productId,
      country,
      sessionId: session.id,
    });
    
    // 3. 세션 업데이트
    await supabase
      .from('panama_report_session')
      .update({
        market_report_id: marketReport.id,
        market_completed_at: new Date().toISOString(),
      })
      .eq('id', session.id);
    
    return NextResponse.json({
      sessionId: session.id,
      marketReportId: marketReport.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'UNKNOWN_ERROR';
    console.error('[session/init] failed', { error: message });
    return NextResponse.json(
      { error: 'SESSION_INIT_FAILED', detail: message }, 
      { status: 500 }
    );
  }
}
```

### 2-3. 가격 분석 API (공공·민간 병렬 생성)

**파일**: `app/api/panama/report/pricing/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generatePricingReport } from '@/logic/reports/pricing_generator';

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    
    if (!sessionId) {
      return NextResponse.json({ error: 'SESSION_ID_REQUIRED' }, { status: 400 });
    }
    
    const supabase = createClient();
    
    // 세션 조회 (시장조사 완료 확인)
    const { data: session } = await supabase
      .from('panama_report_session')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (!session?.market_completed_at) {
      return NextResponse.json(
        { error: 'MARKET_ANALYSIS_REQUIRED' }, 
        { status: 400 }
      );
    }
    
    // 공공 + 민간 병렬 생성
    const [publicReport, privateReport] = await Promise.all([
      generatePricingReport({
        sessionId,
        marketReportId: session.market_report_id!,
        marketSegment: 'public',
      }),
      generatePricingReport({
        sessionId,
        marketReportId: session.market_report_id!,
        marketSegment: 'private',
      }),
    ]);
    
    // 세션 업데이트
    await supabase
      .from('panama_report_session')
      .update({
        pricing_public_report_id: publicReport.id,
        pricing_private_report_id: privateReport.id,
        pricing_completed_at: new Date().toISOString(),
      })
      .eq('id', sessionId);
    
    return NextResponse.json({
      publicReportId: publicReport.id,
      privateReportId: privateReport.id,
      publicData: publicReport.report_data,
      privateData: privateReport.report_data,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'UNKNOWN_ERROR';
    console.error('[report/pricing] failed', { error: message });
    return NextResponse.json(
      { error: 'PRICING_GENERATION_FAILED', detail: message }, 
      { status: 500 }
    );
  }
}
```

### 2-4. 파트너 발굴 API (비동기 결합본 트리거)

**파일**: `app/api/panama/report/partner/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generatePartnerReport } from '@/logic/reports/partner_generator';
import { generateCombinedReport } from '@/logic/reports/combined_generator';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, weightedCriteria } = await req.json();
    
    if (!sessionId) {
      return NextResponse.json({ error: 'SESSION_ID_REQUIRED' }, { status: 400 });
    }
    
    const supabase = createClient();
    
    // 세션 조회 (시장조사 + 가격 분석 완료 확인)
    const { data: session } = await supabase
      .from('panama_report_session')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (!session?.market_completed_at || !session?.pricing_completed_at) {
      return NextResponse.json(
        { error: 'PREVIOUS_STEPS_REQUIRED' }, 
        { status: 400 }
      );
    }
    
    // 1. 파트너 보고서 생성 (LLM 호출 포함, 메인 작업)
    const partnerReport = await generatePartnerReport({
      sessionId,
      productId: session.product_id,
      country: session.country,
      weightedCriteria,
    });
    
    // 2. 세션 업데이트
    await supabase
      .from('panama_report_session')
      .update({
        partner_report_id: partnerReport.id,
        partner_completed_at: new Date().toISOString(),
      })
      .eq('id', sessionId);
    
    // 3. 🔥 결합본 생성을 응답 후 백그라운드로 트리거 (after() 사용)
    //    Vercel 서버리스 함수 라이프사이클에서 안전하게 작동
    after(async () => {
      try {
        const combinedReport = await generateCombinedReport(sessionId);
        
        await supabase
          .from('panama_report_session')
          .update({
            combined_report_id: combinedReport.id,
            combined_generated_at: new Date().toISOString(),
          })
          .eq('id', sessionId);
        
        console.log('[combined-report] generated', {
          sessionId,
          reportId: combinedReport.id,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'UNKNOWN_ERROR';
        console.error('[combined-report] background generation failed', {
          sessionId,
          error: message,
        });
        // 실패해도 메인 응답에는 영향 없음
        // 사용자가 다운로드 버튼 누르면 즉석 생성 폴백이 처리
      }
    });
    
    // 4. 즉시 응답 반환 (결합본 기다리지 않음)
    return NextResponse.json({
      partnerReportId: partnerReport.id,
      combinedReportPending: true,
      partnerData: partnerReport.report_data,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'UNKNOWN_ERROR';
    console.error('[report/partner] failed', { error: message });
    return NextResponse.json(
      { error: 'PARTNER_GENERATION_FAILED', detail: message }, 
      { status: 500 }
    );
  }
}
```

### 2-5. 보고서 목록 API

**파일**: `app/api/panama/report/session/[sessionId]/list/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { GeneratedReportListItem } from '@/types/report_session';

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const supabase = createClient();
    
    // 세션의 모든 보고서 조회 (created_at 오래된순)
    const { data: reports } = await supabase
      .from('reports')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    
    const items: GeneratedReportListItem[] = (reports || []).map(r => {
      const baseTitle = getReportTitle(r.type);
      return {
        id: r.id,
        type: r.type,
        title: baseTitle,
        marketSegment: r.type === 'pricing_public' ? 'public' 
                     : r.type === 'pricing_private' ? 'private' 
                     : undefined,
        createdAt: r.created_at,
        hasPdf: !!r.pdf_storage_path,
        isFinal: r.type === 'combined',
      };
    });
    
    // 최종본은 항상 최상단 (UI에서 [최종] 배지로 강조)
    items.sort((a, b) => {
      if (a.isFinal && !b.isFinal) return -1;
      if (!a.isFinal && b.isFinal) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    return NextResponse.json({ reports: items });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'UNKNOWN_ERROR';
    return NextResponse.json(
      { error: 'LIST_FAILED', detail: message }, 
      { status: 500 }
    );
  }
}

function getReportTitle(type: string): string {
  switch (type) {
    case 'market': return '시장조사 보고서';
    case 'pricing_public': return '수출가격 전략 보고서';
    case 'pricing_private': return '수출가격 전략 보고서';
    case 'partner': return '바이어 발굴 보고서';
    case 'combined': return '최종 보고서';
    default: return '보고서';
  }
}
```

### 2-6. 개별 PDF 다운로드 API

**파일**: `app/api/panama/report/[type]/[id]/pdf/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { type: string; id: string } }
) {
  try {
    const supabase = createClient();
    
    const { data: report } = await supabase
      .from('reports')
      .select('*')
      .eq('id', params.id)
      .eq('type', params.type)
      .single();
    
    if (!report || !report.pdf_storage_path) {
      return NextResponse.json({ error: 'REPORT_NOT_FOUND' }, { status: 404 });
    }
    
    // Storage에서 PDF 다운로드
    const { data: pdfBlob, error: storageError } = await supabase.storage
      .from('reports')
      .download(report.pdf_storage_path);
    
    if (storageError || !pdfBlob) {
      throw storageError || new Error('PDF_DOWNLOAD_FAILED');
    }
    
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const filename = `${params.type}-${params.id.slice(0, 8)}.pdf`;
    
    return new Response(arrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'UNKNOWN_ERROR';
    return NextResponse.json(
      { error: 'PDF_FETCH_FAILED', detail: message }, 
      { status: 500 }
    );
  }
}
```

### 2-7. 결합본 다운로드 API (즉석 생성 폴백 포함)

**파일**: `app/api/panama/report/combined/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCombinedReport } from '@/logic/reports/combined_generator';

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('session_id');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'SESSION_ID_REQUIRED' }, { status: 400 });
    }
    
    const supabase = createClient();
    
    const { data: session } = await supabase
      .from('panama_report_session')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (!session) {
      return NextResponse.json({ error: 'SESSION_NOT_FOUND' }, { status: 404 });
    }
    
    // 케이스 1: 결합본이 이미 캐시됨 → 바로 스트리밍
    if (session.combined_report_id) {
      return await streamCombinedPDF(session.combined_report_id);
    }
    
    // 케이스 2: 원본 3개는 있지만 결합본 미생성 → 즉석 생성 폴백
    if (session.can_download_combined) {
      console.warn('[combined-report] on-demand generation', { sessionId });
      
      const combinedReport = await generateCombinedReport(sessionId);
      
      await supabase
        .from('panama_report_session')
        .update({
          combined_report_id: combinedReport.id,
          combined_generated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);
      
      return await streamCombinedPDF(combinedReport.id);
    }
    
    // 케이스 3: 원본 미완성 → 에러
    return NextResponse.json({
      error: 'INCOMPLETE_SESSION',
      missing: [
        !session.market_completed_at && 'market',
        !session.pricing_completed_at && 'pricing',
        !session.partner_completed_at && 'partner',
      ].filter(Boolean),
    }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'UNKNOWN_ERROR';
    console.error('[report/combined] failed', { error: message });
    return NextResponse.json(
      { error: 'COMBINED_FETCH_FAILED', detail: message }, 
      { status: 500 }
    );
  }
}

async function streamCombinedPDF(reportId: string): Promise<Response> {
  const supabase = createClient();
  
  const { data: report } = await supabase
    .from('reports')
    .select('pdf_storage_path')
    .eq('id', reportId)
    .single();
  
  if (!report?.pdf_storage_path) {
    throw new Error('PDF_NOT_FOUND');
  }
  
  const { data: pdfBlob } = await supabase.storage
    .from('reports')
    .download(report.pdf_storage_path);
  
  if (!pdfBlob) throw new Error('PDF_DOWNLOAD_FAILED');
  
  const arrayBuffer = await pdfBlob.arrayBuffer();
  
  return new Response(arrayBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="united-panama-final-${reportId.slice(0, 8)}.pdf"`,
    },
  });
}
```

### 2-8. 완료 기준

- [ ] 타입 정의 파일 생성 (`src/types/report_session.ts`)
- [ ] 7개 API 라우트 파일 생성
- [ ] 각 API에서 에러 처리 및 로깅 구현
- [ ] `after()` 사용해 Vercel 서버리스 라이프사이클 대응
- [ ] `tsc --noEmit`로 타입 에러 0개 확인

---

## 🧮 Step 3: 결합 로직 구현

### 3-1. Combined Report Generator (LLM 없이 병합만)

**파일**: `src/logic/reports/combined_generator.ts`

```typescript
import { createClient } from '@/lib/supabase/server';
import { renderCombinedPDF } from '@/components/reports/renderCombinedPDF';
import type { Report } from '@/types/report_session';

interface GenerateCombinedResult {
  id: string;
  session_id: string;
  type: 'combined';
  pdf_storage_path: string;
  created_at: string;
}

export async function generateCombinedReport(
  sessionId: string
): Promise<GenerateCombinedResult> {
  const supabase = createClient();
  
  // 세션 + 원본 3개 병렬 조회
  const { data: session } = await supabase
    .from('panama_report_session')
    .select('*')
    .eq('id', sessionId)
    .single();
  
  if (!session) {
    throw new Error('SESSION_NOT_FOUND');
  }
  
  if (!session.market_report_id || 
      !session.pricing_public_report_id || 
      !session.pricing_private_report_id ||
      !session.partner_report_id) {
    throw new Error('INCOMPLETE_REPORTS_FOR_COMBINATION');
  }
  
  // 4개 보고서 병렬 fetch (LLM 없음 — 단순 DB 조회)
  const [marketRpt, publicRpt, privateRpt, partnerRpt] = await Promise.all([
    fetchReportById(supabase, session.market_report_id),
    fetchReportById(supabase, session.pricing_public_report_id),
    fetchReportById(supabase, session.pricing_private_report_id),
    fetchReportById(supabase, session.partner_report_id),
  ]);
  
  // 제품 정보 조회
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', session.product_id)
    .single();
  
  // PDF 렌더링 (시간 순서대로 섹션 배치)
  const pdfBuffer = await renderCombinedPDF({
    product,
    country: session.country,
    generatedAt: new Date(),
    marketReport: marketRpt,
    publicPricingReport: publicRpt,
    privatePricingReport: privateRpt,
    partnerReport: partnerRpt,
  });
  
  // Storage에 저장
  const storagePath = `combined/${sessionId}-${Date.now()}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from('reports')
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    });
  
  if (uploadError) throw uploadError;
  
  // reports 테이블에 메타데이터 저장
  const { data: reportRecord, error: insertError } = await supabase
    .from('reports')
    .insert({
      session_id: sessionId,
      type: 'combined',
      pdf_storage_path: storagePath,
      metadata: {
        source_reports: {
          market: session.market_report_id,
          pricing_public: session.pricing_public_report_id,
          pricing_private: session.pricing_private_report_id,
          partner: session.partner_report_id,
        },
        product_id: session.product_id,
        country: session.country,
      },
    })
    .select()
    .single();
  
  if (insertError) throw insertError;
  
  return reportRecord as GenerateCombinedResult;
}

async function fetchReportById(
  supabase: ReturnType<typeof createClient>, 
  reportId: string
): Promise<Report> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .single();
  
  if (error || !data) throw error || new Error('REPORT_NOT_FOUND');
  return data as Report;
}
```

### 3-2. 완료 기준

- [ ] `combined_generator.ts` 파일 생성
- [ ] LLM 호출 없음 확인 (fetch + PDF 렌더링만)
- [ ] 4개 보고서 병렬 조회 구현
- [ ] 에러 발생 시 명시적 예외 throw
- [ ] Storage 업로드 성공 확인 로직 포함

---

## 🎨 Step 4: 프론트엔드 UI 수정

### 4-1. 수출가격 전략 섹션 (onChange 트리거 + 병렬 호출)

**파일**: `components/main-preview/PricingSection.tsx`

```typescript
'use client';

import { useState } from 'react';
import { MarketSegmentTabs } from './MarketSegmentTabs';
import { PricingCards } from './PricingCards';
import type { Product } from '@/types/product';

interface Props {
  products: Product[];
  onSessionReady?: (sessionId: string) => void;
}

export function PricingSection({ products, onSessionReady }: Props) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [marketReady, setMarketReady] = useState(false);
  const [pricingData, setPricingData] = useState<{
    public: unknown;
    private: unknown;
  } | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<'public' | 'private'>('private');
  const [loading, setLoading] = useState<'idle' | 'market' | 'pricing'>('idle');
  
  // 품목 선택 시: 시장조사 자동 트리거 (옵션 A)
  async function handleProductChange(product: Product) {
    setSelectedProduct(product);
    setMarketReady(false);
    setPricingData(null);
    setLoading('market');
    
    try {
      const res = await fetch('/api/panama/report/session/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          country: 'panama',
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.detail || data.error);
      
      setSessionId(data.sessionId);
      setMarketReady(true);
      onSessionReady?.(data.sessionId);
    } catch (err) {
      // 재시도 안내 UI 표시 (토스트 등)
      console.error('[pricing-section] market init failed', err);
    } finally {
      setLoading('idle');
    }
  }
  
  // AI 가격 분석 실행: 공공·민간 병렬 생성
  async function handleRunPricing() {
    if (!sessionId) return;
    
    setLoading('pricing');
    
    try {
      const res = await fetch('/api/panama/report/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.detail || data.error);
      
      setPricingData({
        public: data.publicData,
        private: data.privateData,
      });
    } catch (err) {
      console.error('[pricing-section] pricing failed', err);
    } finally {
      setLoading('idle');
    }
  }
  
  return (
    <section className="pricing-section">
      <header className="section-header">
        <span className="section-number">01</span>
        <h2>수출가격 전략</h2>
      </header>
      
      {/* 품목 선택 드롭다운 — onChange에서 시장조사 자동 트리거 */}
      <div className="product-selector">
        <select 
          value={selectedProduct?.id ?? ''}
          onChange={e => {
            const p = products.find(x => x.id === e.target.value);
            if (p) handleProductChange(p);
          }}
        >
          <option value="">품목 선택</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>
              [{p.category}] {p.name} · {p.ingredient}
            </option>
          ))}
        </select>
        
        <button
          disabled={!marketReady || loading !== 'idle'}
          onClick={handleRunPricing}
        >
          {loading === 'market' ? '분석 준비 중...' : 
           loading === 'pricing' ? '가격 분석 실행 중...' : 
           '▶ AI 가격 분석 실행'}
        </button>
      </div>
      
      {marketReady && !pricingData && (
        <div className="status-banner success">
          ✅ {selectedProduct?.name} 분석 완료 - 가격 분석을 진행하세요
        </div>
      )}
      
      {/* 공공/민간 탭 + 가격 카드 */}
      {pricingData && (
        <>
          <MarketSegmentTabs 
            selected={selectedSegment}
            onSelect={setSelectedSegment}
          />
          <PricingCards 
            data={selectedSegment === 'public' ? pricingData.public : pricingData.private}
          />
        </>
      )}
    </section>
  );
}
```

### 4-2. 공공/민간 탭 (표시 전환 전용)

**파일**: `components/main-preview/MarketSegmentTabs.tsx`

```typescript
'use client';

interface Props {
  selected: 'public' | 'private';
  onSelect: (segment: 'public' | 'private') => void;
}

export function MarketSegmentTabs({ selected, onSelect }: Props) {
  return (
    <div className="market-tabs">
      <div className="tab-buttons">
        <button
          className={selected === 'public' ? 'active' : ''}
          onClick={() => onSelect('public')}
        >
          공공 시장
        </button>
        <button
          className={selected === 'private' ? 'active' : ''}
          onClick={() => onSelect('private')}
        >
          민간 시장
        </button>
      </div>
      
      <p className="market-description">
        {selected === 'public'
          ? '공공 시장: ALPS 조달청 채널 · 27개 공공기관 통합구매 기준'
          : '민간 시장: 병원·약국·체인 채널 중심 유통 구조 기준'}
      </p>
    </div>
  );
}
```

### 4-3. 바이어 발굴 섹션 (우측 상단 다운로드 버튼)

**파일**: `components/main-preview/PartnerSection.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';

interface Props {
  sessionId: string | null;
}

export function PartnerSection({ sessionId }: Props) {
  const [loading, setLoading] = useState(false);
  const [partnerData, setPartnerData] = useState<unknown>(null);
  const [combinedPending, setCombinedPending] = useState(false);
  
  // 세션 상태 폴링 (결합본 생성 감지)
  const { data: session, mutate } = useSWR(
    sessionId ? `/api/panama/report/session/${sessionId}` : null,
    (url: string) => fetch(url).then(r => r.json()),
    { refreshInterval: 2000 }
  );
  
  const canDownload = session?.can_download_combined && session?.combined_report_id;
  
  async function handleRunPartner() {
    if (!sessionId) return;
    
    setLoading(true);
    setCombinedPending(false);
    
    try {
      const res = await fetch('/api/panama/report/partner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId, 
          weightedCriteria: {}, // TODO: 체크박스 상태 연결
        }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error);
      
      setPartnerData(data.partnerData);
      
      // 결합본 pending 알림 (5초 후 자동 해제)
      if (data.combinedReportPending) {
        setCombinedPending(true);
        setTimeout(() => setCombinedPending(false), 5000);
      }
    } catch (err) {
      console.error('[partner-section] failed', err);
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <section className="partner-section">
      <header className="section-header flex justify-between items-center">
        <div className="section-title">
          <span className="section-number">02</span>
          <h2>바이어 발굴</h2>
        </div>
        
        {/* 우측 상단: 최종 보고서 다운로드 버튼 */}
        <a
          href={canDownload 
            ? `/api/panama/report/combined?session_id=${sessionId}` 
            : undefined
          }
          download={canDownload}
          className={`btn-download-final ${canDownload ? 'active' : 'disabled'}`}
          onClick={e => !canDownload && e.preventDefault()}
          title={canDownload 
            ? '최종 보고서 다운로드' 
            : '시장조사 → 가격 분석 → 바이어 발굴을 모두 완료해야 다운로드 가능합니다'
          }
          aria-disabled={!canDownload}
        >
          ↓ 최종 보고서 다운로드
        </a>
      </header>
      
      <button 
        disabled={!sessionId || loading}
        onClick={handleRunPartner}
      >
        {loading ? '바이어 발굴 실행 중...' : '▶ 바이어 발굴 실행'}
      </button>
      
      {combinedPending && (
        <div className="info-banner">
          ⏳ 최종 보고서를 생성하고 있습니다. 우측 보고서 목록에 곧 추가됩니다.
        </div>
      )}
      
      {/* Top 10 파트너 리스트 렌더링 */}
    </section>
  );
}
```

### 4-4. 생성된 보고서 탭 (폴링 + [최종] 배지)

**파일**: `components/reports/ReportListPanel.tsx`

```typescript
'use client';

import { useRef, useEffect } from 'react';
import useSWR from 'swr';
import type { GeneratedReportListItem } from '@/types/report_session';

interface Props {
  sessionId: string | null;
}

export function ReportListPanel({ sessionId }: Props) {
  const prevHasFinal = useRef(false);
  
  const { data, mutate } = useSWR<{ reports: GeneratedReportListItem[] }>(
    sessionId ? `/api/panama/report/session/${sessionId}/list` : null,
    (url: string) => fetch(url).then(r => r.json()),
    { 
      refreshInterval: 2000,
      revalidateOnFocus: true,
    }
  );
  
  const reports = data?.reports ?? [];
  
  // 최종본 등장 감지 (선택적 UX)
  useEffect(() => {
    const hasFinal = reports.some(r => r.isFinal);
    if (hasFinal && !prevHasFinal.current) {
      // 토스트 알림 등
      console.log('[report-list] final report arrived');
    }
    prevHasFinal.current = hasFinal;
  }, [reports]);
  
  async function handleRemove(reportId: string) {
    // DB에서 삭제 후 목록 재조회
    await fetch(`/api/panama/report/${reportId}`, { method: 'DELETE' });
    mutate();
  }
  
  return (
    <aside className="report-list">
      <header>
        <h3>생성된 보고서</h3>
        <button className="btn-clear-all">모두 지우기</button>
      </header>
      
      <ul>
        {reports.map(report => (
          <li key={report.id} className="report-item">
            <div className="report-meta">
              <div className="report-title">
                {report.isFinal && <span className="badge badge-final">[최종]</span>}
                {report.marketSegment === 'public' && <span className="badge">[공공]</span>}
                {report.marketSegment === 'private' && <span className="badge">[민간]</span>}
                <span className="title-text">{report.title}</span>
              </div>
              <time className="report-time">
                {new Date(report.createdAt).toLocaleString('ko-KR')}
              </time>
            </div>
            
            <div className="report-actions">
              {report.hasPdf && (
                <a 
                  href={`/api/panama/report/${report.type}/${report.id}/pdf`}
                  download
                  className="btn-pdf"
                >
                  📄 PDF
                </a>
              )}
              <button 
                onClick={() => handleRemove(report.id)}
                className="btn-remove"
              >
                ×
              </button>
            </div>
          </li>
        ))}
        
        {reports.length === 0 && (
          <li className="empty-state">
            생성된 보고서가 없습니다. 품목을 선택해 분석을 시작하세요.
          </li>
        )}
      </ul>
    </aside>
  );
}
```

### 4-5. 완료 기준

- [ ] `PricingSection.tsx` — onChange에서 자동 시장조사 트리거
- [ ] `MarketSegmentTabs.tsx` — 탭 선택 시 표시만 전환
- [ ] `PartnerSection.tsx` — 우측 상단 다운로드 버튼 + pending 배너
- [ ] `ReportListPanel.tsx` — 2초 폴링 + [최종] 배지 + 개별 PDF 버튼
- [ ] 모든 컴포넌트에서 `any` 타입 사용 안 함
- [ ] 로딩/에러 상태 UI 처리

---

## 📄 Step 5: PDF 컴포넌트 (섹션 타이틀 정리)

### 5-1. Combined Report Document (PDF 결합본)

**파일**: `components/reports/CombinedReportDocument.tsx`

```typescript
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { CoverPage } from './sections/CoverPage';
import { TableOfContents } from './sections/TableOfContents';
import { MarketAnalysisSection } from './sections/MarketAnalysisSection';
import { PricingStrategySection } from './sections/PricingStrategySection';
import { PartnerDiscoverySection } from './sections/PartnerDiscoverySection';
import { AppendixSection } from './sections/AppendixSection';
import type { Report } from '@/types/report_session';

interface Props {
  product: { id: string; name: string; ingredient: string };
  country: string;
  generatedAt: Date;
  marketReport: Report;
  publicPricingReport: Report;
  privatePricingReport: Report;
  partnerReport: Report;
}

export function CombinedReportDocument(props: Props) {
  return (
    <Document
      title={`UPharma Export AI Report - ${props.product.name}`}
      author="UPharma Export AI"
      language="ko"
    >
      <CoverPage 
        product={props.product}
        country={props.country}
        generatedAt={props.generatedAt}
      />
      
      <TableOfContents />
      
      {/* 섹션 1: 시장조사 분석 — "1공정" 표현 전면 배제 */}
      <MarketAnalysisSection 
        sectionNumber={1}
        sectionTitle="시장조사 분석"
        data={props.marketReport}
      />
      
      {/* 섹션 2: 수출가격 전략 — 공공/민간 양쪽 포함 */}
      <PricingStrategySection
        sectionNumber={2}
        sectionTitle="수출가격 전략"
        publicData={props.publicPricingReport}
        privateData={props.privatePricingReport}
      />
      
      {/* 섹션 3: 파트너 발굴 및 매칭 */}
      <PartnerDiscoverySection
        sectionNumber={3}
        sectionTitle="파트너 발굴 및 매칭"
        data={props.partnerReport}
      />
      
      <AppendixSection 
        marketSources={props.marketReport.metadata}
        pricingSources={props.publicPricingReport.metadata}
        partnerSources={props.partnerReport.metadata}
      />
    </Document>
  );
}
```

### 5-2. PDF 렌더링 유틸

**파일**: `components/reports/renderCombinedPDF.ts`

```typescript
import { renderToBuffer } from '@react-pdf/renderer';
import { CombinedReportDocument } from './CombinedReportDocument';

export async function renderCombinedPDF(props: Parameters<typeof CombinedReportDocument>[0]): Promise<Buffer> {
  return await renderToBuffer(<CombinedReportDocument {...props} />);
}
```

### 5-3. 가격 섹션 (공공/민간 두 서브섹션)

**파일**: `components/reports/sections/PricingStrategySection.tsx`

```typescript
import { Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Report } from '@/types/report_session';

interface Props {
  sectionNumber: number;
  sectionTitle: string;
  publicData: Report;
  privateData: Report;
}

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Pretendard' },
  sectionTitle: { fontSize: 24, fontWeight: 700, marginBottom: 20 },
  subSectionTitle: { fontSize: 18, fontWeight: 600, marginTop: 20, marginBottom: 12 },
  note: { fontSize: 10, color: '#666', marginTop: 8 },
});

export function PricingStrategySection({ 
  sectionNumber, 
  sectionTitle, 
  publicData, 
  privateData 
}: Props) {
  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>
        {sectionNumber}. {sectionTitle}
      </Text>
      
      {/* 2-1 공공 시장 */}
      <View>
        <Text style={styles.subSectionTitle}>
          {sectionNumber}-1. 공공 시장 (ALPS 조달청 기준)
        </Text>
        {/* PricingScenarioTable 렌더링 */}
        <Text style={styles.note}>
          공공 시장: ALPS 조달청 채널 · 27개 공공기관 통합구매 기준
        </Text>
      </View>
      
      {/* 2-2 민간 시장 */}
      <View>
        <Text style={styles.subSectionTitle}>
          {sectionNumber}-2. 민간 시장 (병원·약국·체인)
        </Text>
        {/* PricingScenarioTable 렌더링 */}
        <Text style={styles.note}>
          민간 시장: 병원·약국·체인 채널 중심 유통 구조 기준
        </Text>
      </View>
      
      {/* 2-3 공공 vs 민간 비교 요약 */}
      <View>
        <Text style={styles.subSectionTitle}>
          {sectionNumber}-3. 공공 vs 민간 비교
        </Text>
        {/* ComparisonTable 렌더링 */}
      </View>
    </Page>
  );
}
```

### 5-4. 표현 원칙 점검

**모든 PDF 섹션에서 다음 표현 제거 확인**:

| 금지 표현 | 올바른 표현 |
|---|---|
| `1공정 시장조사` | `1. 시장조사 분석` |
| `2공정 가격 전략` | `2. 수출가격 전략` |
| `3공정 파트너 발굴` | `3. 파트너 발굴 및 매칭` |
| `(1공정)`, `(2공정)`, `(3공정)` | 괄호 표기 전부 제거 |

### 5-5. 완료 기준

- [ ] `CombinedReportDocument.tsx` 생성
- [ ] `renderCombinedPDF.ts` 유틸 생성
- [ ] `PricingStrategySection.tsx`에 공공/민간 서브섹션 구현
- [ ] 기존 섹션 컴포넌트에서 "1공정/2공정/3공정" 표현 제거
- [ ] 파나마어 번역 이슈 없는지 PDF 미리보기 확인
- [ ] Pretendard 폰트 정상 렌더링 확인

---

## 🧪 Step 6: 통합 테스트

### 6-1. End-to-End 시나리오

브라우저에서 다음 흐름 테스트:

1. **품목 선택** → Sereterol Activair 선택
   - 네트워크 탭에서 `/api/panama/report/session/init` 호출 확인
   - 응답에 `sessionId` 포함 확인
   - 생성된 보고서 탭에 `시장조사 보고서` 항목 등장 확인 (2초 내)

2. **"AI 가격 분석 실행"** 클릭
   - `/api/panama/report/pricing` 호출 확인
   - 응답에 `publicData`, `privateData` 둘 다 포함 확인
   - 생성된 보고서 탭에 `수출가격 전략 [공공]`, `수출가격 전략 [민간]` 2개 등장 확인
   - 화면에 저가/기준/프리미엄 3개 카드 표시 확인
   - 공공/민간 탭 전환 시 가격 숫자 변경 확인

3. **"바이어 발굴 실행"** 클릭
   - `/api/panama/report/partner` 호출 확인
   - 응답에 `combinedReportPending: true` 확인
   - "⏳ 최종 보고서 생성 중" 배너 등장 확인
   - 생성된 보고서 탭에 `바이어 발굴 보고서` 등장 (즉시)
   - 2~5초 후 `[최종] 최종 보고서` 등장 확인

4. **최종 보고서 다운로드** 버튼 (우측 상단)
   - 버튼 활성화 확인
   - 클릭 시 PDF 다운로드 시작 확인
   - PDF 열어서 다음 확인:
     - 표지 페이지 존재
     - 목차 페이지 존재
     - `1. 시장조사 분석` 섹션 (제목에 "공정" 단어 없음)
     - `2. 수출가격 전략` (공공/민간 두 서브섹션)
     - `3. 파트너 발굴 및 매칭`
     - 부록 페이지

5. **개별 PDF 다운로드**
   - 생성된 보고서 탭의 각 항목에서 PDF 버튼 클릭
   - 단독 PDF 다운로드 확인

### 6-2. 에러 시나리오 테스트

- 시장조사 완료 전 가격 분석 호출 → `MARKET_ANALYSIS_REQUIRED` 에러
- 가격 분석 완료 전 파트너 호출 → `PREVIOUS_STEPS_REQUIRED` 에러
- 결합본 미생성 상태에서 다운로드 → 즉석 생성 폴백 동작 확인

### 6-3. 완료 기준

- [ ] 전체 E2E 시나리오 통과
- [ ] 모든 에러 시나리오 정상 처리
- [ ] PDF 내부 섹션 타이틀에 "공정" 단어 0회 등장 확인
- [ ] 공공/민간 가격 둘 다 PDF에 포함됨 확인
- [ ] Vercel 배포 후 프로덕션 환경에서도 동일 시나리오 통과

---

## 📝 CHANGELOG.md 기록 항목

작업 완료 시 다음 내용 기록:

```markdown
## [2026-04-21] Combined Report System Refactoring

### Added
- `panama_report_session` 테이블: 3개 단계별 보고서 + 결합본 세션 관리
- `reports` 테이블 + Supabase Storage `reports` 버킷
- 7개 API 라우트: session/init, pricing, partner, session/:id/list, report/:type/:id/pdf, combined
- 결합 로직 모듈: `src/logic/reports/combined_generator.ts` (LLM 없이 병합)
- PDF 컴포넌트: CombinedReportDocument, PricingStrategySection (공공/민간 서브섹션)

### Changed
- `PricingSection.tsx`: 품목 선택 onChange에서 시장조사 자동 트리거
- `PartnerSection.tsx`: 우측 상단에 최종 보고서 다운로드 버튼 배치
- `ReportListPanel.tsx`: 2초 폴링으로 [최종] 배지 자동 감지
- 모든 PDF 섹션 타이틀: "1공정/2공정/3공정" → "1. 시장조사 분석 / 2. 수출가격 전략 / 3. 파트너 발굴 및 매칭"

### Architecture Decisions
- 결합본 생성: 비동기 (파트너 API 응답 후 `after()` 백그라운드 실행)
- 공공/민간 시장: 탭 선택과 무관하게 항상 양쪽 생성, 탭은 화면 표시 전환만
- 결합본 미생성 시 다운로드 요청: 즉석 생성 폴백으로 사용자 노출 없음

### Safety
- DB 백업: `backups/supabase_backup_20260421_pre_combined_refactor.sql`
- Supabase manual backup: `pre-combined-report-refactor-20260421`
```

---

## 🎯 핵심 체크포인트 (Cursor 작업 전 최종 확인)

- [ ] **Step 0 백업이 먼저** — 다른 단계 절대 건너뛰기 금지
- [ ] **결합본은 비동기** — `after()` 사용해 응답 후 백그라운드 실행
- [ ] **결합 = LLM 없이 병합** — 1~3초 내 완료 예상
- [ ] **공공/민간 양쪽 생성** — 탭은 표시 전환만
- [ ] **"공정" 단어 전면 배제** — 보고서 타이틀에 금지
- [ ] **우측 상단 다운로드** — 팀장 양식 유지
- [ ] **즉석 생성 폴백** — 비동기 실패 대비 안전장치

---

## 🚨 문제 발생 시 Cursor → 달강 즉시 보고 기준

다음 경우 작업 중단하고 보고:

1. 기존 테이블 스키마 변경이 필요한 경우 (공통 6컬럼 관련)
2. 공통 라이브러리 수정이 필요한 경우
3. Vercel `after()` API가 현재 Next.js 버전에서 지원되지 않는 경우 (대안: 별도 백그라운드 엔드포인트)
4. `@react-pdf/renderer` 렌더링 실패 (Pretendard 폰트 로드 이슈)
5. Supabase Storage 업로드 권한 에러
6. 예상 작업 시간 초과 (Step 당 3시간 이상)

---

**작업 순서 요약**: Step 0 → Step 1 → Step 2 → Step 3 → Step 4 → Step 5 → Step 6

각 Step 완료 시 체크리스트 전부 만족 후 다음 Step 진입.
