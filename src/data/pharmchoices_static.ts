/**
 * PharmChoices 파나마 제약사 정적 데이터 + 역량 추론
 * 원본: scripts/data/partners_pharmchoices.json
 * business_description 파싱 + company_type → capabilities 자동 추론
 */

export interface PharmChoicesEntry {
  company_name: string;
  company_name_normalized: string;
  company_type: "manufacturer" | "distributor" | "other";
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  /** 추론된 역량 */
  import_history: boolean | null;
  gmp_certified: boolean | null;
  mah_capable: boolean | null;
  pharmacy_chain_operator: boolean | null;
  import_history_detail: string | null;
  public_procurement_wins: number | null;
  therapeutic_areas: string[] | null;
}

function norm(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "");
}

/** company_type + business_description 기반 역량 추론 */
function infer(
  type: "manufacturer" | "distributor" | "other",
  desc: string,
): Pick<
  PharmChoicesEntry,
  | "import_history"
  | "gmp_certified"
  | "mah_capable"
  | "pharmacy_chain_operator"
  | "import_history_detail"
  | "public_procurement_wins"
  | "therapeutic_areas"
> {
  const d = desc.toLowerCase();
  const importHistory: boolean = type === "distributor" || d.includes("수입") || d.includes("유통");
  const gmpCertified: boolean = type === "manufacturer";
  const mahCapable: boolean = d.includes("mah") || d.includes("cdmo") || d.includes("마케팅 허가");
  const pharmacyChain: boolean = d.includes("약국 체인") || d.includes("pharmacy chain");

  // 공공조달 수주 건수 파싱: "수입 20,023건" 같은 패턴
  let procurementWins: number | null = null;
  const procMatch = d.match(/(\d[\d,]+)\s*건/);
  if (procMatch) {
    const v = parseInt(procMatch[1].replace(/,/g, ""), 10);
    if (!isNaN(v) && v < 100_000) procurementWins = v;
  }

  // 치료 영역 추론
  const areas: string[] = [];
  if (d.includes("방사성") || d.includes("radiofarm") || d.includes("조영")) areas.push("Radiology");
  if (d.includes("oncol") || d.includes("종양") || d.includes("항암")) areas.push("Oncology");
  if (d.includes("cardio") || d.includes("심혈관")) areas.push("Cardiology");
  if (d.includes("resp") || d.includes("천식") || d.includes("흡입기")) areas.push("Respiratory");
  if (d.includes("신경") || d.includes("neuro")) areas.push("Neurology");
  if (d.includes("바이오의약품") || d.includes("biolog")) areas.push("Biologics");

  // 수입 이력 상세
  const importDetail = importHistory && d.includes("수입") && procurementWins !== null
    ? `PanamaCompra ${procurementWins}건`
    : importHistory ? "의약품 수입·유통 이력" : null;

  return {
    import_history: importHistory || null,
    gmp_certified: gmpCertified || null,
    mah_capable: mahCapable || null,
    pharmacy_chain_operator: pharmacyChain || null,
    import_history_detail: importDetail,
    public_procurement_wins: procurementWins,
    therapeutic_areas: areas.length > 0 ? areas : null,
  };
}

const RAW: Array<{
  company_name: string;
  company_type: "manufacturer" | "distributor" | "other";
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  business_description: string;
}> = [
  { company_name: "Acino Latinoamericana S.A.", company_type: "manufacturer", phone: null, email: "comunicaciones@acino.swiss", website: "https://acino.swiss/our-business/commercial-operations/latin-america", address: "Av. Paseo del Mar con Av. Del Pacifico, Costa del Este, MMG Tower - Piso 12, Panamá", business_description: "스위스 본사 다국적 제네릭 제조사 중남미 법인" },
  { company_name: "Agencias CELMAR, S.A.", company_type: "distributor", phone: "+507 323-8600", email: null, website: "http://acelmar.com/", address: "Parque Lefevre, Calle 85 A Este (Calle 5ta.), Local #29, Panama", business_description: "파나마 의약품 유통사" },
  { company_name: "Bayer S.A.", company_type: "manufacturer", phone: "+507 4412604", email: null, website: "http://www.centralamerica.bayer.com", address: "Apartado Postal 3080, Calle 18 E, Edificio No. 38, Local 12, Zona Libre de Colon", business_description: "독일 바이엘 중미 지사, Zona Libre de Colon 거점" },
  { company_name: "BIAL - AMÉRICA LATINA, S.A.", company_type: "manufacturer", phone: "+507 323 86 13", email: "info.latam@bial.com", website: "https://www.bial.com/", address: "Calle 5, Parque Lefevre Casa #29, Ciudad de Panamá", business_description: "포르투갈 BIAL 중남미 법인, 신경과학 전문" },
  { company_name: "C-4 Pharma", company_type: "manufacturer", phone: "+507 788-6154", email: "info@c-4pharma.com", website: "http://www.c-4pharma.com/", address: "Obaldía Avenue, G North Street, Doña Emelda Building, David, Chiriqui", business_description: "파나마 로컬 제약사, Chiriqui 지역" },
  { company_name: "DHC International", company_type: "distributor", phone: "+507 8300498", email: "presidencia@dhcinternacional.com", website: "http://dhcinternacional.com/", address: "Bella Vista Urbanization, Avenida Chile and Calle 41 Este, Building Self Storage Bella Vista Floor 6 Local 7", business_description: "의약품 수입·유통" },
  { company_name: "Ferring (Grupo Farmanova Intermed)", company_type: "distributor", phone: "+507 260 9219", email: "dilcsa@cwpanama.net", website: "https://www.ferring-research.com/", address: "Plaza Aventura Business Center Local # 117, Avenida Ricardo J. Alfaro, El Dorado, Ciudad Panamá", business_description: "Ferring 대리점 Grupo Farmanova Intermed, 수입 유통" },
  { company_name: "FERVAL GROUP", company_type: "distributor", phone: "+507 217-6800", email: null, website: "https://www.fervalgroup.com/", address: "Calle 125 A Oeste, Panama City", business_description: "종합 의약품 그룹, 수입 유통" },
  { company_name: "Gencept labs Inc.", company_type: "manufacturer", phone: "+507 264 4224", email: null, website: "http://www.genceptlabs.com/", address: "Local L-2, Edificio Arcelia, Calle Ricardo Arias, Bella Vista, Ciudad De Panamá", business_description: "파나마 로컬 제약 제조사" },
  { company_name: "General Medicines SA", company_type: "distributor", phone: "+507 226-8690", email: null, website: "https://www.mgenerales.com/", address: "Panama Viejo Business Center, Edif. G19-2", business_description: "일반 의약품 유통" },
  { company_name: "GlaxoSmithKline Export Panamá, S.A.", company_type: "manufacturer", phone: "+507 833-6768", email: "fv.aecaricam@gsk.com", website: "https://www.gsk.com/", address: "Oceania Business Plaza, Punta Pacifica, Torre 1000 Piso 34, Panama City", business_description: "GSK 중미 수출법인, 천식 흡입기 Seretide Diskus 취급" },
  { company_name: "Grünenthal Latin America MHO S.A.", company_type: "manufacturer", phone: "+507 215-5600", email: "Comunicaciones.Latam@grunenthal.com", website: "https://www.grunenthal.com/", address: "Punta Pacifica, Pacific Center - 33rd floor, tower A, Ramon Jurado Street, Panamá City", business_description: "독일 Grünenthal 중남미 법인, 통증 치료제 전문" },
  { company_name: "Grupo Farma Medical & Labs", company_type: "distributor", phone: "+507 222-0011", email: null, website: null, address: "C. 9 Oeste, Panamá", business_description: "종합 의약품 그룹, 수입 유통" },
  { company_name: "IMEDESA S.A", company_type: "distributor", phone: "+507 392-3569", email: "info@imedzona.com", website: "https://www.imedzona.com/", address: "Avenida 11 Norte, Urbanización Los Angeles, Edificio El Trimaran, local PB, Panamá", business_description: "의약품 유통" },
  { company_name: "International Bio Farmacéutica, SA (Interfarma)", company_type: "distributor", phone: "+507 271-0405", email: "contact@interfarma.net", website: "https://interfarma.com.pa/", address: "Panama City, Centenario Avenue, Building No. 22-23, Costa del Este", business_description: "바이오의약품 수입·유통, Costa del Este 거점" },
  { company_name: "INVERSIONES TAGORE PANAMÁ, SA", company_type: "distributor", phone: "+507 260-0025", email: "tagoreinfo@inversionestagore.com", website: "http://www.inversionestagore.com/", address: "Obarrio, Calle 50, PH Global Plaza, mezzanine 1-A, Panama City", business_description: "의약품 투자·수입·유통" },
  { company_name: "INVSSA", company_type: "distributor", phone: "+507 236-6907", email: "info@invssa.com", website: "https://www.invssa.com/", address: "Av. 8 A Nte., Panamá", business_description: "의약품 유통사" },
  { company_name: "Laboratorios Medipan S.A", company_type: "manufacturer", phone: "+507 261-8761", email: "info@medipan.com.pa", website: "https://www.medipanpanama.com/", address: "Urbanization Herbruger Condominium Berenice Loc 1, Panama City", business_description: "파나마 Tier 3 로컬 제조사, CDMO 가능성 보유, MAH 역량, PSI 우선 후보" },
  { company_name: "Laboratorios Prieto", company_type: "manufacturer", phone: "+507 280-0000", email: "info@laboratoriosprieto.com", website: "https://www.laboratoriosprieto.com/", address: "Calle 58 Oeste, Panama", business_description: "파나마 로컬 제약 제조사" },
  { company_name: "Laboratorios Rigar S.A.", company_type: "manufacturer", phone: "+507 225-6009", email: null, website: "https://www.laboratoriosrigar.com/", address: "Ave. Frangipani, No. 23, Panama City", business_description: "파나마 주요 제네릭 제조사" },
  { company_name: "Laboratorios Stein Corp", company_type: "manufacturer", phone: "+507 282-3016", email: null, website: "https://www.labstein.com/", address: "Torre Global Bank Piso 23 Oficina 2306, C. 50, Panamá", business_description: "코스타리카 발 중미 제네릭 제조사 파나마 법인" },
  { company_name: "LAFSA - Laboratorios Farmacéuticos, S.A.", company_type: "manufacturer", phone: "+507 224-6029", email: "lgarcia@lafsa.com.pa", website: "http://lafsa.com.pa", address: "C. 81 Este, Panamá", business_description: "파나마 로컬 제약 제조사" },
  { company_name: "Leterago Panamá", company_type: "distributor", phone: "+507 271-4010", email: "informacion@leterago.com.pa", website: "https://leterago.com.pa/", address: "2G7C+VFC, Panamá", business_description: "중미 6개국 최대급 의약품 도매, 파나마 수입 20,023건, PSI 우선 후보" },
  { company_name: "Medimex", company_type: "distributor", phone: "+507 2171566", email: "info@medimexsa.com", website: "https://medimexsa.com/", address: "Ave. XI Central American and Caribbean Games, C. 20 Oeste, Panama", business_description: "의약품 수입·유통" },
  { company_name: "MENAFAR, SA - Panama", company_type: "distributor", phone: "+507 260-3525", email: "menafarpan@menarini-ca.com", website: "https://www.menarini-ca.com/", address: "La Locería, Avenida Juan Pablo II, Local 15, Panama", business_description: "이탈리아 Menarini 중미 지사, 수입 유통" },
  { company_name: "MERCK S.A.", company_type: "manufacturer", phone: "+502 2410-2400", email: "service@merckgroup.com", website: "https://www.merckgroup.com/", address: "12 avenida 0-33 zona 2 de Mixco, Ciudad de Guatemala", business_description: "독일 Merck 중미 본부, 파나마 영업" },
  { company_name: "MSD (Merck Sharp & Dohme)", company_type: "manufacturer", phone: "+507 282-7200", email: null, website: "https://www.msd.com/", address: "Avenida Paseo del Mar, Torre MMG, piso 15, Costa del Este, Ciudad de Panamá", business_description: "미국 MSD 파나마 법인, 심혈관·항암" },
  { company_name: "Novartis Pharma Inc.", company_type: "manufacturer", phone: "+507 300-2030", email: null, website: "https://www.novartis.com/", address: "MMG Tower, Av. Paseo del Mar con Av. del Pacífico, Piso 13, Costa del Este, Ciudad de Panamá", business_description: "스위스 Novartis 파나마 법인" },
  { company_name: "Panamed SA", company_type: "distributor", phone: "+507 271-4966", email: null, website: "https://panamed.com.pa/", address: "Av. Centenario, Panamá", business_description: "종합 의약품 유통" },
  { company_name: "Pharma Chimique", company_type: "distributor", phone: "+507 223-7199", email: "info@phachisa.com", website: "http://www.phachisa.com/", address: "Parque Lefevre, Calle 85 B Este (Calle G.), Local #5, Panama", business_description: "CPHI Online 등록 유통사, 수입" },
  { company_name: "Pharma Vital S.A", company_type: "distributor", phone: "+507 215-1393", email: "info@pharmavital.net", website: "https://pharmavitalco.com/", address: "Panama City, Santa María Business District, Building Office Plex 71, Office 902", business_description: "의약품 수입·유통" },
  { company_name: "Pharmacheck Panama S.A.", company_type: "distributor", phone: "+507 203-9911", email: null, website: "https://pharmacheck.com/", address: "Via Brazil, ph Brazil 405, Piso 8H, Panama City", business_description: "의약품 품질관리·유통" },
  { company_name: "Pisa Farmaceutica de Panama, S.A", company_type: "manufacturer", phone: "+507 224-7452", email: "esgonzalez@pisa.com.mx", website: "http://www.pisa.com.mx/", address: "Panamá, Corregimiento de Parque Lefevre, Calle 15, Parque Lefevre", business_description: "멕시코 Grupo Pisa 파나마 법인" },
  { company_name: "Productos Roche (Panama), S.A.", company_type: "manufacturer", phone: "+507 378-1200", email: null, website: "https://www.roche.com/worldwide/Panama", address: "Edificio MMG, Piso 16, Ave Vista del Pacífico y Ave Paseo del Mar, Costa del Este", business_description: "스위스 Roche 파나마 법인, 종양·바이오" },
  { company_name: "RADIOFARMACIA DE CENTROAMERICA, SA", company_type: "distributor", phone: "+507 302-9714", email: "info@radiofarmaciadecentroamerica.com", website: "https://www.radiofarmaciadecentroamerica.com/", address: "City of Knowledge, Dwyer street, Panama", business_description: "방사성 의약품 전문, 조영제 관련 잠재" },
  { company_name: "Sandoz Pharmaceuticals Panama S.A.", company_type: "manufacturer", phone: null, email: null, website: "https://www.novartis.com/", address: "Costa Del Este, Calle Paseo Del Mar, MMG Tower, Ciudad de Panamá", business_description: "Novartis 자회사 Sandoz, 제네릭 전문" },
  { company_name: "Servier Centro America y Caribe", company_type: "manufacturer", phone: "+507 301-0227", email: null, website: "https://servier.com.pa/", address: "Costa del Este, Ph Dream plaza, piso 9, Panamá", business_description: "프랑스 Servier 중미·카리브 법인, 심혈관" },
  { company_name: "US Pharmacy Group", company_type: "distributor", phone: "+507 271-6900", email: "aventas@uspsg.com", website: "https://uspsg.com/", address: "Ciudad de Panamá", business_description: "의약품·의료기기 유통" },
  { company_name: "ALFARMA S.A.", company_type: "distributor", phone: null, email: null, website: null, address: "Panama City, Panama", business_description: "한국유나이티드제약 기존 거래처, Hydrine MAH 보유, PSI 우선 후보" },
  { company_name: "SEVEN PHARMA PANAMA", company_type: "distributor", phone: null, email: null, website: null, address: "Panama City, Panama", business_description: "PanamaCompra V3 최다 낙찰, Hetero Labs 인도산 Rosuvastatin 수입·유통" },
  { company_name: "Agencias Feduro", company_type: "distributor", phone: null, email: null, website: null, address: "Panama City, Panama", business_description: "기발굴 4사 중 하나, public+private 이원 채널 보유" },
  { company_name: "Compañía Astur, S.A.", company_type: "distributor", phone: null, email: null, website: null, address: "Panama City, Panama", business_description: "파나마 의약품 유통" },
];

/** 기업명 정규화 → 역량 포함 엔트리 매핑 */
export const PHARMCHOICES_LOOKUP: Map<string, PharmChoicesEntry> = new Map(
  RAW.map((r) => {
    const inferred = infer(r.company_type, r.business_description);
    const entry: PharmChoicesEntry = {
      company_name: r.company_name,
      company_name_normalized: norm(r.company_name),
      company_type: r.company_type,
      phone: r.phone,
      email: r.email,
      website: r.website,
      address: r.address,
      ...inferred,
    };
    return [entry.company_name_normalized, entry];
  }),
);

/** 정규화 이름으로 엔트리 조회 (부분 매칭 포함)
 *
 * DB company_name_normalized = 소문자+공백 유지 ("agencias celmar, s.a.")
 * LOOKUP key = 공백 제거 ("agenciascelmar,s.a.")
 * → 입력을 두 가지 형태로 모두 시도
 */
export function lookupByNormalizedName(
  normalizedName: string,
): PharmChoicesEntry | null {
  // 1) 입력 그대로 완전 일치
  const exact = PHARMCHOICES_LOOKUP.get(normalizedName);
  if (exact !== undefined) return exact;

  // 2) 입력에서 공백 제거 후 완전 일치 (DB → LOOKUP 형식 통일)
  const stripped = normalizedName.replace(/\s+/g, "");
  const strippedExact = PHARMCHOICES_LOOKUP.get(stripped);
  if (strippedExact !== undefined) return strippedExact;

  // 3) 부분 매칭 (양쪽 모두 공백 제거 후 비교)
  for (const [key, val] of PHARMCHOICES_LOOKUP) {
    if (key.includes(stripped) || stripped.includes(key)) {
      return val;
    }
  }
  return null;
}
