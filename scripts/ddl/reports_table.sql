-- reports: 단계별·결합 PDF 메타 (지시서 동일)

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
