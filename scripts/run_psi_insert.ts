/**
 * PSI 테이블 데이터 INSERT 스크립트 (JS 클라이언트 방식)
 *
 * 사전 조건: Supabase SQL Editor에서 DDL 먼저 실행
 *   → https://supabase.com/dashboard/project/qyvisskkjiuqkvbrewnr/sql/new
 *   → scripts/ddl/panama_partner_psi_precomputed_ddl.sql 내용 붙여넣기 후 실행
 *
 * 실행:
 *   npx tsx scripts/run_psi_insert.ts
 */

import { createClient } from "@supabase/supabase-js";

// .env.local 또는 환경변수에서 읽기
// 실행: npx tsx --env-file=.env.local scripts/run_psi_insert.ts
const SUPABASE_URL =
  process.env["NEXT_PUBLIC_SUPABASE_URL"] ??
  "https://qyvisskkjiuqkvbrewnr.supabase.co";
const SUPABASE_KEY =
  process.env["SUPABASE_SERVICE_ROLE_KEY"] ??
  process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ??
  "";

if (SUPABASE_KEY === "") {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY (또는 NEXT_PUBLIC_SUPABASE_ANON_KEY) 환경변수가 필요합니다.");
  console.error("   실행: npx tsx --env-file=.env.local scripts/run_psi_insert.ts");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// ============================================================
// 제품 UUID (8개 — products 테이블 기준)
// ============================================================
const PRODUCTS = {
  rosumeg_combigel: "2504d79b-c2ce-4660-9ea7-5576c8bb755f",
  atmeg_combigel: "859e60f9-8544-43b3-a6a0-f6c7529847eb",
  ciloduo: "fcae4399-aa80-4318-ad55-89d6401c10a9",
  gastiin_cr: "24738c3b-3a5b-40a9-9e8e-889ec075b453",
  omethyl_cutielet: "f88b87b8-c0ab-4f6e-ba34-e9330d1d4e18",
  sereterol_activair: "014fd4d2-dc66-4fc1-8d4f-59695183387f",
  gadvoa_inj: "895f49ae-6ce3-44a3-93bd-bb77e027ba59",
  hydrine: "bdfc9883-6040-438a-8e7a-df01f1230682",
} as const;

// DB 실제 회사명 (panama_partner_candidates.company_name 기준)
const DB_NAMES = {
  seven_pharma: "SEVEN PHARMA PANAMA",
  menafar: "MENAFAR, SA - Panama",
  apotex: "APOTEX PANAMA S.A.",
  haseth: "C.G. de Haseth & Cía., S.A.",
  medipan: "Medipan, S.A.",
} as const;

function normalizeCompanyName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function psi(r: number, p: number, m: number, i: number, ph: number): number {
  return Math.round((r * 0.35 + p * 0.28 + m * 0.2 + i * 0.12 + ph * 0.05) * 100) / 100;
}

// ============================================================
// Step 1: 누락 회사 panama_partner_candidates에 추가
// ============================================================
async function ensurePartnerExists(companyName: string): Promise<void> {
  const { data: existing } = await sb
    .from("panama_partner_candidates")
    .select("id")
    .eq("company_name", companyName)
    .maybeSingle();

  if (existing !== null) {
    console.log(`  ✓ 이미 존재: ${companyName}`);
    return;
  }

  const { error } = await sb.from("panama_partner_candidates").insert({
    company_name: companyName,
    company_name_normalized: normalizeCompanyName(companyName),
    source_primary: "manual_psi_seed",
    collected_primary_at: new Date().toISOString(),
  });

  if (error !== null) {
    throw new Error(`${companyName} INSERT 실패: ${error.message}`);
  }
  console.log(`  ✅ 신규 추가: ${companyName}`);
}

// ============================================================
// Step 2: 5사 ID 조회
// ============================================================
async function fetchPartnerIds(): Promise<Record<string, string>> {
  const names = Object.values(DB_NAMES);
  const { data, error } = await sb
    .from("panama_partner_candidates")
    .select("id, company_name")
    .in("company_name", names);

  if (error !== null || data === null) {
    throw new Error(`파트너 ID 조회 실패: ${error?.message ?? "데이터 없음"}`);
  }

  const map: Record<string, string> = {};
  for (const row of data) {
    map[(row as { id: string; company_name: string }).company_name] =
      (row as { id: string; company_name: string }).id;
  }

  const missing = names.filter((n) => map[n] === undefined);
  if (missing.length > 0) {
    throw new Error(`ID 매핑 실패 (DB에 없음): ${missing.join(", ")}`);
  }

  return map;
}

// ============================================================
// Step 3: PSI 데이터 정의
// ============================================================
interface PsiRow {
  partner_id: string;
  product_id: string;
  pipeline_tier: number;
  conflict_level: string;
  conflict_insight: string;
  revenue_tier: number;
  revenue_score: number;
  pipeline_score: number;
  manufacturing_score: number;
  import_experience_score: number;
  pharmacy_chain_score: number;
  psi_base: number;
  notes: string;
}

function buildPsiRows(ids: Record<string, string>): PsiRow[] {
  const rows: PsiRow[] = [];

  const sp = ids[DB_NAMES.seven_pharma]!;
  const mf = ids[DB_NAMES.menafar]!;
  const ap = ids[DB_NAMES.apotex]!;
  const ha = ids[DB_NAMES.haseth]!;
  const md = ids[DB_NAMES.medipan]!;

  // ─── 1. SEVEN PHARMA PANAMA ─────────────────────────────
  rows.push(
    {
      partner_id: sp, product_id: PRODUCTS.rosumeg_combigel,
      pipeline_tier: 2, conflict_level: "upgrade_opportunity",
      conflict_insight: "파트너가 Rosuvastatin 단일제를 유통 중이므로, 우리 Rosumeg Combigel(Rosuvastatin+Omega-3 복합제)을 기존 유통 제품의 업그레이드 버전으로 제안 가능. 복합제 수입유통 Upgrade 전략이 발표 차별점. Hetero 그룹 LATAM 11개국 유통망 활용 가능.",
      revenue_tier: 2, revenue_score: 80, pipeline_score: 60, manufacturing_score: 100, import_experience_score: 100, pharmacy_chain_score: 0,
      psi_base: psi(80, 60, 100, 100, 0),
      notes: "근거: https://sevenpharma.com/nuestra-presencia/panama/",
    },
    {
      partner_id: sp, product_id: PRODUCTS.atmeg_combigel,
      pipeline_tier: 4, conflict_level: "adjacent_category",
      conflict_insight: "파트너는 Rosuvastatin 단일제만 보유하고 Atorvastatin 라인은 미확인. 동일 이상지질혈증 카테고리(C10AA) 처방 네트워크 활용 가능. Atorvastatin+Omega-3 복합제는 파트너 포트폴리오 미중복으로 신규 도입 제안 여지 있음.",
      revenue_tier: 2, revenue_score: 80, pipeline_score: 40, manufacturing_score: 100, import_experience_score: 100, pharmacy_chain_score: 0,
      psi_base: psi(80, 40, 100, 100, 0),
      notes: "근거: https://sevenpharma.com/nuestra-presencia/panama/",
    },
    {
      partner_id: sp, product_id: PRODUCTS.ciloduo,
      pipeline_tier: 4, conflict_level: "adjacent_category",
      conflict_insight: "파트너 포트폴리오에 Cilostazol 제품 미확인. Rosuvastatin 성분은 파트너가 보유하나 Cilostazol 복합제는 별개 카테고리(B01AC). 인접 심혈관 네트워크 활용 가능하며 직접 경쟁 없음.",
      revenue_tier: 2, revenue_score: 80, pipeline_score: 40, manufacturing_score: 100, import_experience_score: 100, pharmacy_chain_score: 0,
      psi_base: psi(80, 40, 100, 100, 0),
      notes: "근거: https://sevenpharma.com/nuestra-presencia/panama/",
    },
    {
      partner_id: sp, product_id: PRODUCTS.gastiin_cr,
      pipeline_tier: 2, conflict_level: "upgrade_opportunity",
      conflict_insight: "파트너가 Mosapride 단일 속방정을 유통 중이므로, 우리 Gastiin CR(서방형 제어방출 제형)을 기술적 업그레이드 버전으로 포지셔닝 가능. CR 제형 차별성으로 약국 체인 채널에서 프리미엄 제안 기회.",
      revenue_tier: 2, revenue_score: 80, pipeline_score: 60, manufacturing_score: 100, import_experience_score: 100, pharmacy_chain_score: 0,
      psi_base: psi(80, 60, 100, 100, 0),
      notes: "근거: https://sevenpharma.com/nuestra-presencia/panama/",
    },
    {
      partner_id: sp, product_id: PRODUCTS.omethyl_cutielet,
      pipeline_tier: 5, conflict_level: "none",
      conflict_insight: "파트너 포트폴리오에 Omega-3(C10AX06) 제품 미확인. 경쟁 없는 깨끗한 협력 가능. Hetero 그룹의 광범위한 LATAM 유통망과 결합 시 파나마 진출 파나마 우선 2종 중 하나로 빠른 침투 가능.",
      revenue_tier: 2, revenue_score: 80, pipeline_score: 20, manufacturing_score: 100, import_experience_score: 100, pharmacy_chain_score: 0,
      psi_base: psi(80, 20, 100, 100, 0),
      notes: "근거: https://sevenpharma.com/nuestra-presencia/panama/",
    },
    {
      partner_id: sp, product_id: PRODUCTS.sereterol_activair,
      pipeline_tier: 1, conflict_level: "direct_competition",
      conflict_insight: "파트너가 PULMETERO(Salmeterol+Fluticasone 동일 조합)를 자체 포트폴리오로 보유하므로 Sereterol Activair 주 파트너보다 보조 파트너로 검토 필요. 다만 Hetero 그룹의 LATAM 11개국 유통망은 다른 7개 제품에서 충분히 활용 가능.",
      revenue_tier: 2, revenue_score: 80, pipeline_score: 100, manufacturing_score: 100, import_experience_score: 100, pharmacy_chain_score: 0,
      psi_base: psi(80, 100, 100, 100, 0),
      notes: "근거: https://sevenpharma.com/nuestra-presencia/panama/ — PULMETERO 동일성분 확인",
    },
    {
      partner_id: sp, product_id: PRODUCTS.gadvoa_inj,
      pipeline_tier: 5, conflict_level: "none",
      conflict_insight: "파트너 포트폴리오에 조영제(V08CA) 제품 미확인. Gadobutrol 경쟁 없음. 파트너의 Oncology 강점 병원 네트워크와 연계 시 영상진단 채널 접근 가능.",
      revenue_tier: 2, revenue_score: 80, pipeline_score: 20, manufacturing_score: 100, import_experience_score: 100, pharmacy_chain_score: 0,
      psi_base: psi(80, 20, 100, 100, 0),
      notes: "근거: https://sevenpharma.com/nuestra-presencia/panama/",
    },
    {
      partner_id: sp, product_id: PRODUCTS.hydrine,
      pipeline_tier: 1, conflict_level: "direct_competition",
      conflict_insight: "파트너가 Oncology 포트폴리오 20종 이상 보유하며 Hydroxyurea 제조 가능성 높음. 직접 경쟁 위험이 있어 보조 파트너 또는 별도 조건 협의 필요. 파트너의 Oncology 채널 활용 시 다른 제품과 패키지 딜 가능성 검토.",
      revenue_tier: 2, revenue_score: 80, pipeline_score: 100, manufacturing_score: 100, import_experience_score: 100, pharmacy_chain_score: 0,
      psi_base: psi(80, 100, 100, 100, 0),
      notes: "근거: https://sevenpharma.com/nuestra-presencia/panama/ — Oncology 20종+ 확인",
    },
  );

  // ─── 2. MENAFAR, SA - Panama ─────────────────────────────
  rows.push(
    {
      partner_id: mf, product_id: PRODUCTS.rosumeg_combigel,
      pipeline_tier: 2, conflict_level: "upgrade_opportunity",
      conflict_insight: "파트너가 Rozetin(Rosuvastatin+Ezetimibe) 복합제를 보유하나, 우리 Rosumeg(Rosuvastatin+Omega-3)는 다른 복합 파트너로 직접 경쟁 아닌 포트폴리오 확장. Menarini 이상지질혈증 처방 네트워크를 통해 Omega-3 병용 복합제 니즈 공략 가능.",
      revenue_tier: 2, revenue_score: 80, pipeline_score: 60, manufacturing_score: 100, import_experience_score: 100, pharmacy_chain_score: 0,
      psi_base: psi(80, 60, 100, 100, 0),
      notes: "근거: https://www.menariniamla.com/es/about-us/quienes-somos.html",
    },
    {
      partner_id: mf, product_id: PRODUCTS.atmeg_combigel,
      pipeline_tier: 3, conflict_level: "upgrade_opportunity",
      conflict_insight: "Menarini 이상지질혈증 포트폴리오 강점 활용 가능. Atorvastatin+Omega-3 복합제는 파트너 라인업 미중복으로 신규 도입 제안. Menarini의 LATAM 전역 법인망으로 파나마 진출 후 확장 경로 확보.",
      revenue_tier: 2, revenue_score: 80, pipeline_score: 60, manufacturing_score: 100, import_experience_score: 100, pharmacy_chain_score: 0,
      psi_base: psi(80, 60, 100, 100, 0),
      notes: "근거: https://www.menariniamla.com/es/about-us/quienes-somos.html",
    },
    {
      partner_id: mf, product_id: PRODUCTS.ciloduo,
      pipeline_tier: 4, conflict_level: "adjacent_category",
      conflict_insight: "파트너 포트폴리오에 Cilostazol 미확인. 심혈관 카테고리 인접성으로 처방 네트워크 활용 가능. Menarini의 심혈관 영역 전문성과 결합 시 시너지 기대.",
      revenue_tier: 2, revenue_score: 80, pipeline_score: 40, manufacturing_score: 100, import_experience_score: 100, pharmacy_chain_score: 0,
      psi_base: psi(80, 40, 100, 100, 0),
      notes: "근거: https://www.menariniamla.com/es/about-us/quienes-somos.html",
    },
    {
      partner_id: mf, product_id: PRODUCTS.gastiin_cr,
      pipeline_tier: 3, conflict_level: "upgrade_opportunity",
      conflict_insight: "Menarini 소화기 포트폴리오에 Mosapride 라인 보유 가능성. CR 서방형 제형 기술 차별화로 업그레이드 제안 가능. Menarini의 전문의 처방 채널을 통해 고부가가치 포지셔닝.",
      revenue_tier: 2, revenue_score: 80, pipeline_score: 60, manufacturing_score: 100, import_experience_score: 100, pharmacy_chain_score: 0,
      psi_base: psi(80, 60, 100, 100, 0),
      notes: "근거: https://www.menariniamla.com/es/about-us/quienes-somos.html",
    },
    {
      partner_id: mf, product_id: PRODUCTS.omethyl_cutielet,
      pipeline_tier: 5, conflict_level: "none",
      conflict_insight: "파트너 포트폴리오에 Omega-3 단독 제품 미확인. 경쟁 없는 깨끗한 협력 가능. Menarini의 파나마 처방 채널을 통해 파나마 최우선 2종 중 하나로 빠른 침투 기대.",
      revenue_tier: 2, revenue_score: 80, pipeline_score: 20, manufacturing_score: 100, import_experience_score: 100, pharmacy_chain_score: 0,
      psi_base: psi(80, 20, 100, 100, 0),
      notes: "근거: https://www.menariniamla.com/es/about-us/quienes-somos.html",
    },
    {
      partner_id: mf, product_id: PRODUCTS.sereterol_activair,
      pipeline_tier: 3, conflict_level: "adjacent_category",
      conflict_insight: "Menarini 호흡기 포트폴리오 보유 확인됨. Salmeterol+Fluticasone 동일 조합 보유 여부 재검증 필요. 현재 인접 카테고리로 분류하며, 직접 경쟁 미확인 시 협력 파트너 유력.",
      revenue_tier: 2, revenue_score: 80, pipeline_score: 60, manufacturing_score: 100, import_experience_score: 100, pharmacy_chain_score: 0,
      psi_base: psi(80, 60, 100, 100, 0),
      notes: "근거: https://www.menariniamla.com/es/about-us/quienes-somos.html — Salmeterol+Fluticasone DPI 보유 여부 재검증 필요",
    },
    {
      partner_id: mf, product_id: PRODUCTS.gadvoa_inj,
      pipeline_tier: 5, conflict_level: "none",
      conflict_insight: "파트너 포트폴리오에 조영제 제품 미확인. 경쟁 없음. Menarini의 병원 전문의 채널 네트워크를 통해 영상진단과에 접근 가능.",
      revenue_tier: 2, revenue_score: 80, pipeline_score: 20, manufacturing_score: 100, import_experience_score: 100, pharmacy_chain_score: 0,
      psi_base: psi(80, 20, 100, 100, 0),
      notes: "근거: https://www.menariniamla.com/es/about-us/quienes-somos.html",
    },
    {
      partner_id: mf, product_id: PRODUCTS.hydrine,
      pipeline_tier: 4, conflict_level: "adjacent_category",
      conflict_insight: "Menarini Oncology 포트폴리오 구체적 확인 미완. 인접 종양 카테고리로 분류. Menarini의 전문의 처방 채널은 혈액종양과 접근에 유용하며 Hydroxyurea 직접 경쟁 없을 경우 협력 가능.",
      revenue_tier: 2, revenue_score: 80, pipeline_score: 40, manufacturing_score: 100, import_experience_score: 100, pharmacy_chain_score: 0,
      psi_base: psi(80, 40, 100, 100, 0),
      notes: "근거: https://www.menariniamla.com/es/about-us/quienes-somos.html",
    },
  );

  // ─── 3. APOTEX PANAMA S.A. ─────────────────────────────
  rows.push(
    {
      partner_id: ap, product_id: PRODUCTS.rosumeg_combigel,
      pipeline_tier: 2, conflict_level: "upgrade_opportunity",
      conflict_insight: "Apotex가 Apo-Rosuvastatin 단일제를 직접 생산·유통 중. 우리 Rosumeg(Rosuvastatin+Omega-3 복합제)를 기존 Apo-Rosuvastatin의 업그레이드 버전으로 제안 가능. 복합제 전환 마케팅으로 프리미엄 가격대 포지셔닝 기회.",
      revenue_tier: 2, revenue_score: 80, pipeline_score: 60, manufacturing_score: 100, import_experience_score: 100, pharmacy_chain_score: 0,
      psi_base: psi(80, 60, 100, 100, 0),
      notes: "근거: https://www.apotex.com/mx/es/about-us/25-years-in-latin-america",
    },
    {
      partner_id: ap, product_id: PRODUCTS.atmeg_combigel,
      pipeline_tier: 2, conflict_level: "upgrade_opportunity",
      conflict_insight: "Apotex가 Apo-Atorvastatin 단일제를 직접 생산 중. 우리 Atmeg(Atorvastatin+Omega-3 복합제)를 동일 성분 업그레이드 버전으로 제안 가능. Apotex의 파나마 유통망을 통해 복합제 라인 확장 전략 실행.",
      revenue_tier: 2, revenue_score: 80, pipeline_score: 60, manufacturing_score: 100, import_experience_score: 100, pharmacy_chain_score: 0,
      psi_base: psi(80, 60, 100, 100, 0),
      notes: "근거: https://www.apotex.com/mx/es/about-us/25-years-in-latin-america",
    },
    {
      partner_id: ap, product_id: PRODUCTS.ciloduo,
      pipeline_tier: 4, conflict_level: "adjacent_category",
      conflict_insight: "Apotex 포트폴리오에 Cilostazol 단독 제품 미확인. 심혈관 카테고리 인접성으로 Apotex 처방 채널 활용 가능. Rosuvastatin 성분 포함 복합제로 Apotex 기존 채널과 시너지.",
      revenue_tier: 2, revenue_score: 80, pipeline_score: 40, manufacturing_score: 100, import_experience_score: 100, pharmacy_chain_score: 0,
      psi_base: psi(80, 40, 100, 100, 0),
      notes: "근거: https://www.apotex.com/mx/es/about-us/25-years-in-latin-america",
    },
    {
      partner_id: ap, product_id: PRODUCTS.gastiin_cr,
      pipeline_tier: 2, conflict_level: "upgrade_opportunity",
      conflict_insight: "Apotex가 Apo-Mosapride를 직접 생산 중. 우리 Gastiin CR(서방형 제어방출)을 기술 업그레이드 버전으로 제안 가능. CR 제형 우수성 강조로 Apotex 기존 Mosapride 채널 공략.",
      revenue_tier: 2, revenue_score: 80, pipeline_score: 60, manufacturing_score: 100, import_experience_score: 100, pharmacy_chain_score: 0,
      psi_base: psi(80, 60, 100, 100, 0),
      notes: "근거: https://www.apotex.com/mx/es/about-us/25-years-in-latin-america",
    },
    {
      partner_id: ap, product_id: PRODUCTS.omethyl_cutielet,
      pipeline_tier: 5, conflict_level: "none",
      conflict_insight: "Apotex 포트폴리오에 Omega-3 단독 제품 미확인. 경쟁 없는 깨끗한 협력 가능. Apotex의 파나마 유통 채널로 파나마 최우선 2종 중 하나의 빠른 침투 기대.",
      revenue_tier: 2, revenue_score: 80, pipeline_score: 20, manufacturing_score: 100, import_experience_score: 100, pharmacy_chain_score: 0,
      psi_base: psi(80, 20, 100, 100, 0),
      notes: "근거: https://www.apotex.com/mx/es/about-us/25-years-in-latin-america",
    },
    {
      partner_id: ap, product_id: PRODUCTS.sereterol_activair,
      pipeline_tier: 5, conflict_level: "none",
      conflict_insight: "Apotex 포트폴리오에 Salmeterol+Fluticasone 복합제 미확인. 직접 경쟁 없음. Apotex의 광범위한 LATAM 유통망을 통해 호흡기 채널 접근 가능.",
      revenue_tier: 2, revenue_score: 80, pipeline_score: 20, manufacturing_score: 100, import_experience_score: 100, pharmacy_chain_score: 0,
      psi_base: psi(80, 20, 100, 100, 0),
      notes: "근거: https://www.apotex.com/mx/es/about-us/25-years-in-latin-america",
    },
    {
      partner_id: ap, product_id: PRODUCTS.gadvoa_inj,
      pipeline_tier: 5, conflict_level: "none",
      conflict_insight: "Apotex 포트폴리오에 조영제 미확인. 경쟁 없음. Apotex 병원 채널 활용 가능.",
      revenue_tier: 2, revenue_score: 80, pipeline_score: 20, manufacturing_score: 100, import_experience_score: 100, pharmacy_chain_score: 0,
      psi_base: psi(80, 20, 100, 100, 0),
      notes: "근거: https://www.apotex.com/mx/es/about-us/25-years-in-latin-america",
    },
    {
      partner_id: ap, product_id: PRODUCTS.hydrine,
      pipeline_tier: 4, conflict_level: "adjacent_category",
      conflict_insight: "Apotex Oncology 라인 보유 가능성 있으나 Hydroxyurea 직접 경쟁 미확인. 인접 카테고리 분류. Apotex 병원 채널을 통한 혈액종양과 접근 가능.",
      revenue_tier: 2, revenue_score: 80, pipeline_score: 40, manufacturing_score: 100, import_experience_score: 100, pharmacy_chain_score: 0,
      psi_base: psi(80, 40, 100, 100, 0),
      notes: "근거: https://www.apotex.com/mx/es/about-us/25-years-in-latin-america",
    },
  );

  // ─── 4. C.G. de Haseth & Cía., S.A. ─────────────────────
  rows.push(
    {
      partner_id: ha, product_id: PRODUCTS.rosumeg_combigel,
      pipeline_tier: 3, conflict_level: "adjacent_category",
      conflict_insight: "파트너가 Bayer·Pfizer 스타틴 라인을 대표하나 우리 복합제(Rosuvastatin+Omega-3)와 직접 중복 미확인. El Javillo 18지점 약국 체인 채널로 이상지질혈증 시장 직접 접근 가능. 파나마 로컬 100년 기업의 신뢰도 활용.",
      revenue_tier: 3, revenue_score: 60, pipeline_score: 60, manufacturing_score: 0, import_experience_score: 100, pharmacy_chain_score: 100,
      psi_base: psi(60, 60, 0, 100, 100),
      notes: "근거: https://www.grupodehaseth.com/",
    },
    {
      partner_id: ha, product_id: PRODUCTS.atmeg_combigel,
      pipeline_tier: 3, conflict_level: "adjacent_category",
      conflict_insight: "파트너 Bayer·Pfizer 스타틴 대표 중 Atorvastatin 라인 보유 가능성. 인접 카테고리 분류. El Javillo 약국 체인 채널로 복합제 소비자 접점 확보 가능.",
      revenue_tier: 3, revenue_score: 60, pipeline_score: 60, manufacturing_score: 0, import_experience_score: 100, pharmacy_chain_score: 100,
      psi_base: psi(60, 60, 0, 100, 100),
      notes: "근거: https://www.grupodehaseth.com/",
    },
    {
      partner_id: ha, product_id: PRODUCTS.ciloduo,
      pipeline_tier: 4, conflict_level: "adjacent_category",
      conflict_insight: "파트너 포트폴리오에 Cilostazol 미확인. 심혈관 카테고리 인접으로 El Javillo 처방·OTC 채널 활용 가능. 약국 체인 직접 유통으로 소비자 접점 확보.",
      revenue_tier: 3, revenue_score: 60, pipeline_score: 40, manufacturing_score: 0, import_experience_score: 100, pharmacy_chain_score: 100,
      psi_base: psi(60, 40, 0, 100, 100),
      notes: "근거: https://www.grupodehaseth.com/",
    },
    {
      partner_id: ha, product_id: PRODUCTS.gastiin_cr,
      pipeline_tier: 5, conflict_level: "none",
      conflict_insight: "파트너 소화기 라인 미확인. 직접 경쟁 없음. El Javillo 약국 체인을 통한 소화기약 OTC·처방 채널 접근 가능. 파나마 로컬 유통 최강자 활용.",
      revenue_tier: 3, revenue_score: 60, pipeline_score: 20, manufacturing_score: 0, import_experience_score: 100, pharmacy_chain_score: 100,
      psi_base: psi(60, 20, 0, 100, 100),
      notes: "근거: https://www.grupodehaseth.com/",
    },
    {
      partner_id: ha, product_id: PRODUCTS.omethyl_cutielet,
      pipeline_tier: 5, conflict_level: "none",
      conflict_insight: "파트너 포트폴리오에 Omega-3 제품 미확인. 경쟁 없는 깨끗한 협력. El Javillo 18지점 약국 체인으로 파나마 최우선 2종 직접 소비자 유통 최적 채널.",
      revenue_tier: 3, revenue_score: 60, pipeline_score: 20, manufacturing_score: 0, import_experience_score: 100, pharmacy_chain_score: 100,
      psi_base: psi(60, 20, 0, 100, 100),
      notes: "근거: https://www.grupodehaseth.com/",
    },
    {
      partner_id: ha, product_id: PRODUCTS.sereterol_activair,
      pipeline_tier: 1, conflict_level: "direct_competition",
      conflict_insight: "파트너가 GSK Seretide(Salmeterol+Fluticasone DPI, 동일 조합)를 MINSA Resol.292 등록 보유. Sereterol Activair 직접 경쟁 제품. 주 파트너 아닌 보조 파트너로 검토하되, El Javillo 약국망은 다른 7개 제품 유통에 적극 활용 권장.",
      revenue_tier: 3, revenue_score: 60, pipeline_score: 100, manufacturing_score: 0, import_experience_score: 100, pharmacy_chain_score: 100,
      psi_base: psi(60, 100, 0, 100, 100),
      notes: "근거: https://www.grupodehaseth.com/ / https://www.minsa.gob.pa/informacion-salud/resoluciones-251-500 (Resol.292)",
    },
    {
      partner_id: ha, product_id: PRODUCTS.gadvoa_inj,
      pipeline_tier: 3, conflict_level: "adjacent_category",
      conflict_insight: "파트너가 Bayer Gadobutrol(동일 성분)를 대표할 가능성. 인접 카테고리 분류. 조영제는 병원 채널 전용으로 El Javillo 약국 채널과 별도 병원 영업 병행 필요.",
      revenue_tier: 3, revenue_score: 60, pipeline_score: 60, manufacturing_score: 0, import_experience_score: 100, pharmacy_chain_score: 100,
      psi_base: psi(60, 60, 0, 100, 100),
      notes: "근거: https://www.grupodehaseth.com/ — Bayer Gadobutrol 대표 가능성",
    },
    {
      partner_id: ha, product_id: PRODUCTS.hydrine,
      pipeline_tier: 4, conflict_level: "adjacent_category",
      conflict_insight: "파트너 Oncology 라인 미확인. 인접 카테고리. Roche·Novartis 등 대형 MNC 대표 경험으로 혈액종양과 접근 네트워크 보유 가능성.",
      revenue_tier: 3, revenue_score: 60, pipeline_score: 40, manufacturing_score: 0, import_experience_score: 100, pharmacy_chain_score: 100,
      psi_base: psi(60, 40, 0, 100, 100),
      notes: "근거: https://www.grupodehaseth.com/",
    },
  );

  // ─── 5. Medipan, S.A. ─────────────────────────────────
  rows.push(
    {
      partner_id: md, product_id: PRODUCTS.rosumeg_combigel,
      pipeline_tier: 1, conflict_level: "direct_competition",
      conflict_insight: "파트너가 RosuMed 시리즈(Rosuvastatin)를 자체 생산 중. 우리 Rosumeg의 직접 경쟁 제품 보유. 주 파트너보다 보조 파트너 또는 라이선스 협상 대상으로 검토. 파나마 로컬 제조 역량 활용 가능성 별도 검토 필요.",
      revenue_tier: 4, revenue_score: 40, pipeline_score: 100, manufacturing_score: 100, import_experience_score: 0, pharmacy_chain_score: 0,
      psi_base: psi(40, 100, 100, 0, 0),
      notes: "근거: https://www.medipanpanama.com/ — RosuMed 자체 생산 확인",
    },
    {
      partner_id: md, product_id: PRODUCTS.atmeg_combigel,
      pipeline_tier: 2, conflict_level: "direct_competition",
      conflict_insight: "파트너가 Atorvastatin 계열 제품 자체 생산 가능성. 직접 경쟁 위험. 파나마 로컬 제조 강점을 역이용한 라이선스 협상 또는 OEM 공급 가능성 검토.",
      revenue_tier: 4, revenue_score: 40, pipeline_score: 80, manufacturing_score: 100, import_experience_score: 0, pharmacy_chain_score: 0,
      psi_base: psi(40, 80, 100, 0, 0),
      notes: "근거: https://www.medipanpanama.com/",
    },
    {
      partner_id: md, product_id: PRODUCTS.ciloduo,
      pipeline_tier: 4, conflict_level: "adjacent_category",
      conflict_insight: "Medipan 포트폴리오에 Cilostazol 미확인. 인접 카테고리. 로컬 제조 역량 보유로 향후 로컬 생산 파트너십 검토 가능.",
      revenue_tier: 4, revenue_score: 40, pipeline_score: 40, manufacturing_score: 100, import_experience_score: 0, pharmacy_chain_score: 0,
      psi_base: psi(40, 40, 100, 0, 0),
      notes: "근거: https://www.medipanpanama.com/",
    },
    {
      partner_id: md, product_id: PRODUCTS.gastiin_cr,
      pipeline_tier: 5, conflict_level: "none",
      conflict_insight: "Medipan 포트폴리오에 Mosapride 미확인. 경쟁 없음. 파나마 로컬 제조사로 규제 대응 및 로컬 생산 파트너십 검토 가능.",
      revenue_tier: 4, revenue_score: 40, pipeline_score: 20, manufacturing_score: 100, import_experience_score: 0, pharmacy_chain_score: 0,
      psi_base: psi(40, 20, 100, 0, 0),
      notes: "근거: https://www.medipanpanama.com/",
    },
    {
      partner_id: md, product_id: PRODUCTS.omethyl_cutielet,
      pipeline_tier: 5, conflict_level: "none",
      conflict_insight: "Medipan 포트폴리오에 Omega-3 미확인. 경쟁 없음. 로컬 제조 역량 활용 OEM 협력 가능성 검토.",
      revenue_tier: 4, revenue_score: 40, pipeline_score: 20, manufacturing_score: 100, import_experience_score: 0, pharmacy_chain_score: 0,
      psi_base: psi(40, 20, 100, 0, 0),
      notes: "근거: https://www.medipanpanama.com/",
    },
    {
      partner_id: md, product_id: PRODUCTS.sereterol_activair,
      pipeline_tier: 5, conflict_level: "none",
      conflict_insight: "Medipan 포트폴리오에 Salmeterol+Fluticasone 미확인. 경쟁 없음. 호흡기 채널 접근은 별도 경로 필요.",
      revenue_tier: 4, revenue_score: 40, pipeline_score: 20, manufacturing_score: 100, import_experience_score: 0, pharmacy_chain_score: 0,
      psi_base: psi(40, 20, 100, 0, 0),
      notes: "근거: https://www.medipanpanama.com/",
    },
    {
      partner_id: md, product_id: PRODUCTS.gadvoa_inj,
      pipeline_tier: 5, conflict_level: "none",
      conflict_insight: "Medipan 포트폴리오에 조영제 미확인. 경쟁 없음.",
      revenue_tier: 4, revenue_score: 40, pipeline_score: 20, manufacturing_score: 100, import_experience_score: 0, pharmacy_chain_score: 0,
      psi_base: psi(40, 20, 100, 0, 0),
      notes: "근거: https://www.medipanpanama.com/",
    },
    {
      partner_id: md, product_id: PRODUCTS.hydrine,
      pipeline_tier: 5, conflict_level: "none",
      conflict_insight: "Medipan 포트폴리오에 Hydroxyurea 미확인. 경쟁 없음. 로컬 제조 역량을 활용한 향후 파트너십 검토 가능.",
      revenue_tier: 4, revenue_score: 40, pipeline_score: 20, manufacturing_score: 100, import_experience_score: 0, pharmacy_chain_score: 0,
      psi_base: psi(40, 20, 100, 0, 0),
      notes: "근거: https://www.medipanpanama.com/",
    },
  );

  return rows;
}

// ============================================================
// Step 4: PSI 행 INSERT (upsert)
// ============================================================
async function insertPsiRows(rows: PsiRow[]): Promise<void> {
  console.log(`\n▶ PSI 행 ${rows.length}개 INSERT 중...`);

  // 20행씩 배치 처리
  const BATCH = 20;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await sb
      .from("panama_partner_psi_precomputed")
      .upsert(batch, { onConflict: "partner_id,product_id" });

    if (error !== null) {
      throw new Error(`PSI INSERT 실패 (batch ${i / BATCH + 1}): ${error.message}`);
    }
    inserted += batch.length;
    console.log(`  ✅ ${inserted}/${rows.length}행 완료`);
  }
}

// ============================================================
// Step 5: 검증
// ============================================================
async function verify(): Promise<void> {
  const { data, error } = await sb
    .from("panama_partner_psi_precomputed")
    .select("id, psi_base, conflict_level")
    .order("psi_base", { ascending: false })
    .limit(5);

  if (error !== null) {
    console.log("\n⚠ 검증 쿼리 실패:", error.message);
    return;
  }

  const total = await sb
    .from("panama_partner_psi_precomputed")
    .select("id", { count: "exact", head: true });

  console.log(`\n🎉 PSI 테이블 총 행 수: ${total.count ?? "?"}개`);
  console.log("상위 5행 (psi_base 내림차순):");
  (data ?? []).forEach((r: Record<string, unknown>) =>
    console.log(`  psi_base=${r["psi_base"]}, conflict=${r["conflict_level"]}`),
  );
}

// ============================================================
// main
// ============================================================
async function main(): Promise<void> {
  console.log("🔧 Panama PSI 테이블 데이터 INSERT 시작");
  console.log("   URL:", SUPABASE_URL);

  // Step 1: 누락 회사 추가
  console.log("\n▶ Step 1: 누락 파트너 확인 및 추가...");
  await ensurePartnerExists(DB_NAMES.apotex);
  await ensurePartnerExists(DB_NAMES.haseth);

  // Step 2: 파트너 ID 조회
  console.log("\n▶ Step 2: 파트너 ID 조회...");
  const ids = await fetchPartnerIds();
  console.log("  조회 성공:", Object.keys(ids).length, "개 파트너");
  for (const [name, id] of Object.entries(ids)) {
    console.log(`  - ${name}: ${id}`);
  }

  // Step 3: PSI 행 구성
  const rows = buildPsiRows(ids);
  console.log(`\n▶ Step 3: PSI 행 ${rows.length}개 구성 완료`);

  // Step 4: INSERT
  await insertPsiRows(rows);

  // Step 5: 검증
  await verify();

  console.log("\n✅ 완료!");
}

main().catch((e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e);

  // 테이블 없음 오류 감지
  if (msg.includes("42P01") || msg.includes("does not exist")) {
    console.error("\n❌ 테이블 없음 오류: panama_partner_psi_precomputed 테이블이 존재하지 않습니다.");
    console.error("\n📌 먼저 Supabase SQL Editor에서 DDL을 실행하세요:");
    console.error("   1. https://supabase.com/dashboard/project/qyvisskkjiuqkvbrewnr/sql/new");
    console.error("   2. scripts/ddl/panama_partner_psi_precomputed_ddl.sql 내용 붙여넣기 → 실행");
    console.error("   3. 완료 후 이 스크립트 재실행: npx tsx scripts/run_psi_insert.ts");
  } else {
    console.error("\n❌ 오류:", msg);
  }
  process.exit(1);
});
