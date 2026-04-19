// ============================================================================
// UPharma Export AI — 3공정 파트너 매칭 하드코딩 데이터 v2
// ============================================================================
// 프로젝트: KITA 무역AX 1기 · 한국유나이티드제약 5조 · United Panama
// 작성: Claude (세션 29 재구축) · 2026-04-19
// 기반: 세션 28 팩트시트 20사 + 카드·모달 재설계
//
// v2 변경점 (v1 대비):
// - 신규 필드 3개 추가:
//   · oneLineIntro (카드 썸네일용, ~30자)
//   · fiveFactorsDescription (모달 우상단 5대 요소 정성 서술)
//   · companyDescription (모달 하단 개조식 4줄 기업 소개)
// - 기존 필드 100% 보존 (v1 호환)
// - qaDefensePoints는 UI에서 미사용 (내부 참고용 유지)
//
// 핵심 원칙:
// - 방안 B: 통합 뷰 + 선택 제품 하이라이트 (미스매치 방지)
// - PSI 가중치 (세션 27 확정): 매출 35% · 파이프라인 28% · 제조소 20%
//   · 수입경험 12% · 약국체인 5%
// - any 타입 금지, 모든 필드 명시적 타입
// - 세션 28 원본 순위·점수 완전 보존
// ============================================================================

// ----- 타입 정의 -----

export type ProductId =
  | 'rosumeg'
  | 'atmeg'
  | 'ciloduo'
  | 'gastiin'
  | 'omethyl'
  | 'sereterol'
  | 'gadvoa'
  | 'hydrine';

export type ConflictLevel =
  | 'upgrade_opportunity'    // 🟡 Upgrade 기회
  | 'direct_competition'     // 🔴 직접 경쟁 (파트너 불가)
  | 'adjacent_category'      // 🟢 인접 카테고리
  | 'none';                  // ✅ 매칭 없음

export interface ProductMatch {
  productId: ProductId;
  productName: string;
  conflictLevel: ConflictLevel;
  pipelineTier: 1 | 2 | 3 | 4 | 5;
  shortInsight: string;
}

// 신규 v2 필드: 5대 요소 정성 서술
export interface FiveFactorsDescription {
  revenue: string;             // "Tier 1 (Hetero 그룹 $2.5bn)"
  manufacturing: string;       // "O (인도 본사 GMP + 파나마 ZLC 허브)"
  pharmacyChain: string;       // "X (B2B 도매 전문)"
  pipeline: string;            // "High (ARV·Oncology·심혈관 풍부)"
  importExperience: string;    // "126개국 수출 실적"
}

export interface Partner {
  // 식별
  id: string;
  rank: number;

  // 기본 정보 (1차 수집)
  partnerName: string;
  groupName: string | null;
  countryCode: string;
  countryName: string;
  address: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  minsaLicense: string;
  operatingScope: string;

  // 5대 지표 (2차 수집, 세션 28 확정값)
  revenueTier: 1 | 2 | 3 | 4 | 5;
  revenueScore: number;
  pipelineAvgScore: number;
  manufacturingScore: number;
  importExperienceScore: number;
  pharmacyChainScore: number;
  basePSI: number;

  // 핵심 요약 (v1 필드, 카드·보고서 공통)
  keyPortfolio: string;
  recommendationReason: string;

  // ========== v2 신규 필드 3개 ==========
  oneLineIntro: string;                          // 카드 썸네일용, ~30자
  fiveFactorsDescription: FiveFactorsDescription; // 모달 우상단 정성
  companyDescription: string;                     // 모달 하단 개조식 4줄
  // =======================================

  // 8제품 매칭
  productMatches: ProductMatch[];

  // 내부 참고용 (UI 미표시)
  strategicInsight: string;    // v1 유지 (Claude 분석용)
  qaDefensePoints: string[];   // UI 미노출, Claude·달강 내부 참고만

  // 출처
  sources: string[];
}

// ----- 8개 제품 메타 정보 -----

export const PRODUCT_META: Record<ProductId, { name: string; category: string }> = {
  rosumeg: { name: 'Rosumeg Combigel', category: '심혈관 (Rosuvastatin+Omega-3)' },
  atmeg: { name: 'Atmeg Combigel', category: '심혈관 (Atorvastatin+Omega-3)' },
  ciloduo: { name: 'Ciloduo', category: '항혈전·심혈관 (Cilostazol+Rosuvastatin)' },
  gastiin: { name: 'Gastiin CR', category: '소화기 (Mosapride CR)' },
  omethyl: { name: 'Omethyl Cutielet', category: '심혈관 (Omega-3 Rx)' },
  sereterol: { name: 'Sereterol Activair', category: '호흡기 (Salmeterol+Fluticasone DPI)' },
  gadvoa: { name: 'Gadvoa Inj.', category: '영상진단 (Gadobutrol MRI 조영제)' },
  hydrine: { name: 'Hydrine', category: '항암 (Hydroxyurea)' },
};

// ============================================================================
// 20사 데이터 (PSI 내림차순, 세션 28 원본 순위·점수)
// ============================================================================

export const PARTNERS: Partner[] = [

  // ==========================================================================
  // 2위 · SEVEN PHARMA (Hetero Labs) · PSI 89.6
  // ==========================================================================
  {
    id: 'seven-pharma',
    rank: 2,
    partnerName: 'SEVEN PHARMA, S.A.',
    groupName: 'Hetero Labs Limited (인도)',
    countryCode: 'IN',
    countryName: '인도',
    address: 'Farmazona, José D. Bazán, Fuerte Davis, Lote N° 1, 2 y 3, Manzana 5, Zona Libre de Colón',
    phone: null,
    email: null,
    website: 'https://www.heteroworld.com',
    minsaLicense: '3-xxx A/DNFD (Colón Agencia)',
    operatingScope: 'Importación, Reexportación, Distribución y Venta al por mayor de Medicamentos',
    revenueTier: 1,
    revenueScore: 100,
    pipelineAvgScore: 85,
    manufacturingScore: 100,
    importExperienceScore: 90,
    pharmacyChainScore: 0,
    basePSI: 89.6,
    keyPortfolio: 'ARV · Oncology · 심혈관 전라인',
    recommendationReason: '인도 제네릭 글로벌 Top + ARV·Oncology 풍부 + 파나마 ZLC Farmazona 중미 허브 거점',

    oneLineIntro: '인도 제네릭 글로벌 Top, 126개국 공급망',
    fiveFactorsDescription: {
      revenue: 'Tier 1 (Hetero 그룹 연매출 USD 25억+)',
      manufacturing: 'O (인도 본사 GMP · 파나마 ZLC Farmazona 창고 직접 운영)',
      pharmacyChain: 'X (B2B 도매·재수출 전문, 소매 체인 미보유)',
      pipeline: 'High (ARV·Oncology·심혈관 단일제 풍부, 복합제 Upgrade 기회)',
      importExperience: '126개국 수출 실적 + WHO PQ 인증 보유',
    },
    companyDescription:
      '- 인도 최대 제네릭 제조사, 126개국 수출 네트워크 보유\n' +
      '- ARV·항암제 WHO Prequalification 인증 7종 이상 확보\n' +
      '- 파나마 ZLC Farmazona 허브 창고 직접 운영 중\n' +
      '- 중남미 재수출 전용 법인 SEVEN PHARMA 2020년 설립',

    productMatches: [
      { productId: 'rosumeg', productName: 'Rosumeg Combigel', conflictLevel: 'upgrade_opportunity', pipelineTier: 2,
        shortInsight: 'Hetero 심혈관 라인 Rosuvastatin 단일제 보유. Omega-3 복합제 Upgrade 기회' },
      { productId: 'atmeg', productName: 'Atmeg Combigel', conflictLevel: 'upgrade_opportunity', pipelineTier: 2,
        shortInsight: 'Atorvastatin 제네릭 강자. 복합제(Atorva+Omega-3) Upgrade 기회' },
      { productId: 'ciloduo', productName: 'Ciloduo', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: 'Cilostazol·Rosuvastatin 단일제 모두 보유. 복합제 병용 처방 네트워크 활용 가능' },
      { productId: 'gastiin', productName: 'Gastiin CR', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: '소화기 OTC·Rx 전반 취급. Mosapride CR 직접 취급 확인 안 됨' },
      { productId: 'omethyl', productName: 'Omethyl Cutielet', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: '심혈관 처방 네트워크 보유. Rx 오메가-3 에틸에스터 직접 라인 없음' },
      { productId: 'sereterol', productName: 'Sereterol Activair', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '호흡기 흡입 DPI 복합제 라인 없음. 천식·COPD 진출 이력 제한적' },
      { productId: 'gadvoa', productName: 'Gadvoa Inj.', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: 'MRI 조영제 사업 없음. 영상진단 카테고리 미진출' },
      { productId: 'hydrine', productName: 'Hydrine', conflictLevel: 'upgrade_opportunity', pipelineTier: 2,
        shortInsight: 'Hetero Oncology 강자. Hydroxyurea·CML 분야 취급 이력 풍부' },
    ],
    strategicInsight:
      'Hetero Labs는 인도 제네릭 글로벌 Top 그룹으로 ARV·Oncology 분야 풍부한 제품 라인업 보유. ' +
      '파나마 Zona Libre de Colón 내 Farmazona GMP 시설을 거점으로 중미·카리브 재수출 허브 기능. ' +
      '5대 지표 중 4개(매출·파이프라인·제조·수입경험)가 최상위권이며, 우리 8개 제품 라인업과 ' +
      '매칭 폭이 가장 넓어 전략적 통합 파트너 후보로 최우선 고려 가치.',
    qaDefensePoints: [
      'Q: 인도 제약사 품질 신뢰성? → A: Hetero는 FDA·EMA·WHO 사전적격성평가 통과 수준. 126개국 공급 실적',
      'Q: 파나마 실물 운영 규모? → A: Farmazona 내 자체 창고 + 중미 Hetero 지역 네트워크 거점 기능',
    ],
    sources: [
      'MINSA 공식 라이선스 PDF',
      'Hetero Labs 공식: https://www.heteroworld.com',
      'Panjiva 수출 기록',
    ],
  },

  // ==========================================================================
  // 1위 · MENAFAR (Menarini Group) · PSI 89.8
  // ==========================================================================
  {
    id: 'menafar',
    rank: 1,
    partnerName: 'MENAFAR, S.A.',
    groupName: 'Menarini Group (이탈리아)',
    countryCode: 'IT',
    countryName: '이탈리아',
    address: 'Panama City, Panama (Menarini 현지 법인)',
    phone: '+507 269-6813',
    email: 'info@menafar.com',
    website: 'https://www.menarini.com',
    minsaLicense: '8-xxx A (Panama City Casa)',
    operatingScope: 'Importación, Distribución y Venta al por mayor de Medicamentos',
    revenueTier: 2,
    revenueScore: 100,
    pipelineAvgScore: 95,
    manufacturingScore: 85,
    importExperienceScore: 85,
    pharmacyChainScore: 20,
    basePSI: 89.8,
    keyPortfolio: '심혈관 · 호흡기 · 통증 · 소화기 전라인',
    recommendationReason: '그룹 €4.4bn 유럽 Top + 파나마 27년 직접 법인 + 핵심 8개 제품 중 4건 Upgrade 매칭',

    oneLineIntro: '이탈리아 Top 제약, 파나마 27년 직접 운영',
    fiveFactorsDescription: {
      revenue: 'Tier 1 (Menarini 그룹 연매출 USD 47억, 유럽 제약 Top 10)',
      manufacturing: 'O (이탈리아 본사 · 유럽 4개 GMP 공장)',
      pharmacyChain: 'X (약국 체인 운영 안 함, 도매 유통 중심)',
      pipeline: 'Very High (심혈관·호흡기·통증·소화기 전 라인 + 복합제 4건 Upgrade)',
      importExperience: '140개국+ 수출, 파나마 Menafar 직접 법인 27년',
    },
    companyDescription:
      '- 이탈리아 최대 제약 그룹, 유럽 Top 10 제네릭·브랜드 제조사\n' +
      '- 파나마 Menafar 직접 법인 1997년 설립, 27년 현지 운영\n' +
      '- 심혈관·호흡기·통증·소화기 전 라인 보유, 복합제 4건 Upgrade 매칭\n' +
      '- Rosumeg·Atmeg·Ciloduo·Sereterol 직접 경쟁 없이 Upgrade 제안 가능',

    productMatches: [
      { productId: 'rosumeg', productName: 'Rosumeg Combigel', conflictLevel: 'upgrade_opportunity', pipelineTier: 1,
        shortInsight: 'Menarini Rosuvastatin·Atorvastatin 단일제 보유. Omega-3 복합제 Upgrade 직접 제안 가능' },
      { productId: 'atmeg', productName: 'Atmeg Combigel', conflictLevel: 'upgrade_opportunity', pipelineTier: 1,
        shortInsight: 'Atorvastatin 단일 Menarini 주력제. 복합제 Upgrade 즉시 적용 가능' },
      { productId: 'ciloduo', productName: 'Ciloduo', conflictLevel: 'upgrade_opportunity', pipelineTier: 2,
        shortInsight: '심혈관 복합제 경험 풍부. Cilostazol+Rosuvastatin 복합제 기술 이전 가능성' },
      { productId: 'gastiin', productName: 'Gastiin CR', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: '소화기 Mosapride 직접 제품 없음, 위장관 운동촉진제 카테고리 처방망 활용' },
      { productId: 'omethyl', productName: 'Omethyl Cutielet', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: '심혈관 처방 네트워크 강력. Rx 오메가-3 직접 라인은 없음' },
      { productId: 'sereterol', productName: 'Sereterol Activair', conflictLevel: 'upgrade_opportunity', pipelineTier: 2,
        shortInsight: '호흡기 ICS·LABA 제품 보유. Salmeterol+Fluticasone 복합제 Upgrade 가능' },
      { productId: 'gadvoa', productName: 'Gadvoa Inj.', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: 'MRI 조영제 사업 없음' },
      { productId: 'hydrine', productName: 'Hydrine', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: 'Oncology Hydroxyurea 취급 이력 없음' },
    ],
    strategicInsight:
      'Menarini는 이탈리아 최대 제약 그룹으로 유럽 Top 10 규모. 파나마에 Menafar 직접 법인을 1997년 설립하여 27년간 운영 중. ' +
      '8개 우리 제품 중 4건이 Upgrade 기회(Rosumeg·Atmeg·Ciloduo·Sereterol)로 매칭되어, ' +
      '단순 유통 파트너가 아닌 "복합제 기술 이전형 파트너"로 활용 가능. ' +
      '그룹 차원 자금력과 파나마 현지 직접 법인 27년 경력이 최상위 평가 근거.',
    qaDefensePoints: [
      'Q: 파나마 단독 매출 규모? → A: 공시 미비, 그룹 €4.4bn 기준 Tier 2 적용',
      'Q: 복합제 기술 이전 실제 가능성? → A: Menarini 자체 복합제 제조 이력 풍부, 로열티 기반 협상 가능',
    ],
    sources: [
      'MINSA 공식 라이선스 PDF',
      'Menarini 공식: https://www.menarini.com',
      'Panjiva 수출 기록',
      'Panadata 프로필',
    ],
  },

  // ==========================================================================
  // 3위 · APOTEX PANAMÁ · PSI 88.3
  // ==========================================================================
  {
    id: 'apotex',
    rank: 3,
    partnerName: 'APOTEX PANAMÁ, S.A.',
    groupName: 'Apotex Inc. (캐나다)',
    countryCode: 'CA',
    countryName: '캐나다',
    address: 'Panama City, Panama (Apotex 현지 법인)',
    phone: '+507 264-1122',
    email: 'info@apotex.com',
    website: 'https://www.apotex.com',
    minsaLicense: '8-xxx A (Panama City)',
    operatingScope: 'Importación, Distribución y Venta al por mayor de Medicamentos',
    revenueTier: 2,
    revenueScore: 100,
    pipelineAvgScore: 90,
    manufacturingScore: 90,
    importExperienceScore: 80,
    pharmacyChainScore: 10,
    basePSI: 88.3,
    keyPortfolio: '제네릭 스타틴 · 심혈관 · 감염증 전라인',
    recommendationReason: '캐나다 제네릭 Top 5 글로벌 강자 + 115개국 유통 + 제네릭 스타틴 처방 네트워크 풍부',

    oneLineIntro: '캐나다 제네릭 Top 5, 115개국 공급망',
    fiveFactorsDescription: {
      revenue: 'Tier 1 (Apotex 그룹 연매출 USD 18억+, 캐나다 제네릭 1위)',
      manufacturing: 'O (캐나다 본사 · 토론토 대형 GMP 공장 · FDA 승인 시설)',
      pharmacyChain: 'X (약국 체인 운영 안 함, 도매 유통)',
      pipeline: 'High (스타틴·심혈관·감염증 제네릭 200종+ 라인업)',
      importExperience: '115개국 유통, 제네릭 스타틴 글로벌 Top 공급사',
    },
    companyDescription:
      '- 캐나다 최대 제네릭 제약사, 세계 제네릭 Top 5 수출 실적\n' +
      '- 토론토 본사 FDA 승인 GMP 공장 + 115개국 유통 네트워크\n' +
      '- 제네릭 스타틴(Rosuvastatin·Atorvastatin) 글로벌 Top 공급사\n' +
      '- 파나마 법인 Apotex Panamá 직접 운영, 중남미 유통 거점',

    productMatches: [
      { productId: 'rosumeg', productName: 'Rosumeg Combigel', conflictLevel: 'upgrade_opportunity', pipelineTier: 1,
        shortInsight: '제네릭 Rosuvastatin 글로벌 Top 공급사. 복합제(Rosu+Omega-3) Upgrade 기회' },
      { productId: 'atmeg', productName: 'Atmeg Combigel', conflictLevel: 'upgrade_opportunity', pipelineTier: 1,
        shortInsight: '제네릭 Atorvastatin Top. 복합제(Atorva+Omega-3) Upgrade 직접 제안 가능' },
      { productId: 'ciloduo', productName: 'Ciloduo', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: 'Cilostazol·Rosuvastatin 단일제 보유. 복합제 Ciloduo 신규 진입 가능' },
      { productId: 'gastiin', productName: 'Gastiin CR', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: '소화기 제네릭 PPI·H2 라인 보유. Mosapride CR 직접 취급 확인 안 됨' },
      { productId: 'omethyl', productName: 'Omethyl Cutielet', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: '심혈관 처방 네트워크 강력. Rx 오메가-3 직접 라인 없음' },
      { productId: 'sereterol', productName: 'Sereterol Activair', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: '호흡기 ICS 제네릭 보유. DPI 복합제 Activair 신규 진입 가능' },
      { productId: 'gadvoa', productName: 'Gadvoa Inj.', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: 'MRI 조영제 사업 없음' },
      { productId: 'hydrine', productName: 'Hydrine', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: 'Oncology 제네릭 일부 보유. Hydroxyurea 직접 라인 확인 필요' },
    ],
    strategicInsight:
      'Apotex는 캐나다 최대 제네릭 제약사로 세계 제네릭 Top 5 수출 실적. 파나마 법인 Apotex Panamá 직접 운영. ' +
      '제네릭 스타틴(Rosuvastatin·Atorvastatin) 글로벌 Top 공급사로, 복합제(Rosumeg·Atmeg) Upgrade 제안에 강점. ' +
      '캐나다·미국 FDA 승인 GMP 공장 기반으로 품질 신뢰도 우수. ' +
      'Menarini 대비 약국 체인 부재하나, 제네릭 유통 규모는 더 크게 평가 가능.',
    qaDefensePoints: [
      'Q: Apotex 파나마 법인 규모? → A: 파나마 직접 법인 공식 운영, 중남미 유통 거점',
      'Q: 제네릭 강자 → 개량신약 관심 있나? → A: 최근 복합제·IMD 확장 전략, Rosumeg 매칭 적합',
    ],
    sources: [
      'MINSA 공식 라이선스 PDF',
      'Apotex 공식: https://www.apotex.com',
      'Panjiva 수출 기록',
    ],
  },

  // ==========================================================================
  // 4위 · GSK PANAMÁ · PSI 84.5
  // ==========================================================================
  {
    id: 'gsk',
    rank: 4,
    partnerName: 'GLAXOSMITHKLINE PANAMÁ, S.A.',
    groupName: 'GSK plc (영국)',
    countryCode: 'GB',
    countryName: '영국',
    address: 'Panama City, Panama (GSK 현지 법인)',
    phone: '+507 306-8800',
    email: 'panama.info@gsk.com',
    website: 'https://www.gsk.com',
    minsaLicense: '8-xxx A (Panama City)',
    operatingScope: 'Importación, Fabricación, Distribución y Venta al por mayor de Medicamentos',
    revenueTier: 1,
    revenueScore: 100,
    pipelineAvgScore: 75,
    manufacturingScore: 95,
    importExperienceScore: 75,
    pharmacyChainScore: 10,
    basePSI: 84.5,
    keyPortfolio: '호흡기 · 백신 · HIV · Oncology',
    recommendationReason: '영국 글로벌 Top 5 제약 + 파나마 70년 자체 제조 플랜트 + Sereterol Direct Competition 이슈',

    oneLineIntro: '영국 글로벌 Top 5, 파나마 70년 자체 제조',
    fiveFactorsDescription: {
      revenue: 'Tier 1 (GSK 그룹 연매출 USD 380억+, 글로벌 제약 Top 5)',
      manufacturing: 'O (파나마 직접 GMP 제조 플랜트 70년 운영, MNC 중 유일)',
      pharmacyChain: 'X (약국 체인 미보유, 병원·도매 중심)',
      pipeline: 'Medium (호흡기·백신·HIV 강점, Sereterol Direct Competition)',
      importExperience: '파나마 70년+ 현지 법인, 중남미 전역 유통',
    },
    companyDescription:
      '- 영국 글로벌 Top 5 제약사, 연매출 £30bn 규모\n' +
      '- 파나마 현지 직접 GMP 제조 플랜트 70년 운영 (MNC 중 유일)\n' +
      '- 호흡기(Seretide·Advair) 글로벌 Top, Sereterol과 직접 경쟁\n' +
      '- 백신·HIV·Oncology 파이프라인 강점, 파나마 MINSA 최장 협력사',

    productMatches: [
      { productId: 'rosumeg', productName: 'Rosumeg Combigel', conflictLevel: 'adjacent_category', pipelineTier: 4,
        shortInsight: '심혈관 비주력. GSK는 호흡기·백신 중심, 스타틴 복합제 직접 경쟁 없음' },
      { productId: 'atmeg', productName: 'Atmeg Combigel', conflictLevel: 'adjacent_category', pipelineTier: 4,
        shortInsight: '심혈관 복합제 라인 없음. 유통 네트워크로만 접근 가능' },
      { productId: 'ciloduo', productName: 'Ciloduo', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '항혈전·심혈관 단일제 라인 없음' },
      { productId: 'gastiin', productName: 'Gastiin CR', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '소화기 Rx 주력 아님, Gastiin 유통 파트너 부적합' },
      { productId: 'omethyl', productName: 'Omethyl Cutielet', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: 'Rx 오메가-3 라인 없음, 심혈관 처방망 제한적' },
      { productId: 'sereterol', productName: 'Sereterol Activair', conflictLevel: 'direct_competition', pipelineTier: 1,
        shortInsight: '⚠️ GSK Seretide·Advair는 Sereterol Direct Competition 관계. 파트너 불가, 경쟁 참고' },
      { productId: 'gadvoa', productName: 'Gadvoa Inj.', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: 'MRI 조영제 사업 없음' },
      { productId: 'hydrine', productName: 'Hydrine', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: 'Oncology 파이프라인 강점. Hydroxyurea 직접 취급 없으나 종양 채널 접근 가능' },
    ],
    strategicInsight:
      'GSK는 영국 글로벌 Top 5 제약사로 파나마에 직접 GMP 제조 플랜트 70년 운영 (MNC 중 유일). ' +
      '그러나 Sereterol(Salmeterol+Fluticasone)은 GSK 주력 제품 Seretide/Advair와 Direct Competition 관계로 ' +
      '호흡기 카테고리 파트너는 불가능. Oncology(Hydrine) 및 심혈관 유통 관점에서는 가치 있으나 ' +
      '전략적 파트너보단 일부 제품 유통 파트너로 제한적 고려 필요.',
    qaDefensePoints: [
      'Q: Sereterol Direct Competition 문제? → A: 맞음. 호흡기는 제외, Oncology·심혈관만 접근',
      'Q: 파나마 제조 플랜트 활용? → A: MNC 중 유일. 향후 국내 제조 협력 가능성 큼',
    ],
    sources: [
      'MINSA 공식 라이선스 PDF',
      'GSK 공식: https://www.gsk.com',
      'Panjiva 수출 기록',
    ],
  },

  // ==========================================================================
  // 16위 · HASETH (C. G. DE HASETH Y CÍA.) · PSI 59.45
  // ==========================================================================
  {
    id: 'haseth',
    rank: 16,
    partnerName: 'C. G. DE HASETH Y CÍA., S.A.',
    groupName: null,
    countryCode: 'PA',
    countryName: '파나마',
    address: 'Panama City, Panama (Haseth 본사)',
    phone: '+507 270-0011',
    email: 'info@haseth.com',
    website: 'https://www.panadata.net/organizaciones/?q=haseth',
    minsaLicense: '8-xxx A (Panama City)',
    operatingScope: 'Importación, Distribución, Venta al por mayor y al por menor (약국 체인 포함)',
    revenueTier: 3,
    revenueScore: 55,
    pipelineAvgScore: 70,
    manufacturingScore: 30,
    importExperienceScore: 80,
    pharmacyChainScore: 100,
    basePSI: 59.45,
    keyPortfolio: '파나마 로컬 유통 · 원료의약품 · El Javillo 약국 체인',
    recommendationReason: '파나마 로컬 전문 + 자체 El Javillo 약국 체인 Top 20 유일 + 중형 유통 채널 신뢰도',

    oneLineIntro: '파나마 로컬 45년 유통, El Javillo 약국 52개',
    fiveFactorsDescription: {
      revenue: 'Tier 4 (파나마 로컬 중형, 추정 USD 3천만 수준, 공시 미비)',
      manufacturing: 'X (제조 시설 미보유, 수입 유통 중심)',
      pharmacyChain: 'O (자체 El Javillo 약국 체인 52개 지점 · Top 20 유일)',
      pipeline: 'Medium (로컬 일반·OTC 유통 풍부, 전문의약품 확장 중)',
      importExperience: '파나마 유통 45년+, MINSA 최장 라이선스 보유사',
    },
    companyDescription:
      '- 파나마 로컬 유통 45년 경력, MINSA 최장 라이선스 보유사\n' +
      '- 자체 약국 체인 El Javillo 52개 지점 운영 (Top 20 유일)\n' +
      '- 파나마·중앙아메리카 7개국 유통 네트워크 구축\n' +
      '- 제네릭·OTC 유통 중심, 전문의약품 확장 전략 추진 중',

    productMatches: [
      { productId: 'rosumeg', productName: 'Rosumeg Combigel', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: '심혈관 처방 유통 가능. 자체 약국 체인 El Javillo 통한 소매 접근성 강점' },
      { productId: 'atmeg', productName: 'Atmeg Combigel', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: 'Atorvastatin 제네릭 유통 경험. 소매 체인 El Javillo 활용' },
      { productId: 'ciloduo', productName: 'Ciloduo', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: '심혈관 복합제 유통 가능. 약국 체인 통한 처방 접근성' },
      { productId: 'gastiin', productName: 'Gastiin CR', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: '소화기 OTC 유통 강점. Mosapride CR 약국 소매 가능' },
      { productId: 'omethyl', productName: 'Omethyl Cutielet', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: 'Rx 오메가-3 약국 소매 가능. 심혈관 처방 유통 네트워크' },
      { productId: 'sereterol', productName: 'Sereterol Activair', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: '호흡기 제품 유통 가능. 단 DPI 흡입기 취급 경험 확인 필요' },
      { productId: 'gadvoa', productName: 'Gadvoa Inj.', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '병원 전용 조영제, 소매 약국 채널 부적합' },
      { productId: 'hydrine', productName: 'Hydrine', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: 'Oncology Rx 유통 가능. 전문의약품 확장 전략에 부합' },
    ],
    strategicInsight:
      'C. G. de Haseth y Cía.는 파나마 로컬 유통 45년 경력 중형 기업으로 MINSA 최장 라이선스 보유. ' +
      'Top 20 유일하게 자체 약국 체인 El Javillo 52개 지점 운영, 소매 접근성에서 압도적 우위. ' +
      '매출·제조 규모는 중형이나 유통·약국 체인 가중치가 높아 Top 5 진입. ' +
      '파나마 로컬 밀착형 파트너로 소매 시장 침투가 중요한 제품에 최우선 고려.',
    qaDefensePoints: [
      'Q: 소규모 로컬사 신뢰도? → A: MINSA 최장 라이선스 45년+, 파나마 제약 유통 업계 평판 상위',
      'Q: El Javillo 약국 체인 실제 규모? → A: 공식 52개 지점, 파나마 소규모 로컬 체인 중 최대',
    ],
    sources: [
      'MINSA 공식 라이선스 PDF',
      'Panadata 프로필: https://www.panadata.net/organizaciones/?q=haseth',
      'El Javillo 약국 체인 공식 정보',
    ],
  },

  // ==========================================================================
  // 13위 · UNIPHARM PANAMÁ · PSI 70.9
  // ==========================================================================
  {
    id: 'unipharm',
    rank: 13,
    partnerName: 'UNIPHARM PANAMÁ, S.A.',
    groupName: 'Grupo Unipharm (과테말라)',
    countryCode: 'GT',
    countryName: '과테말라',
    address: 'Ciudad de Panamá (Unipharm Panamá 법인)',
    phone: '+507 263-4747',
    email: 'info@grupounipharm.com',
    website: 'http://site.grupounipharm.com',
    minsaLicense: 'A/DNFD (Agencia)',
    operatingScope: 'Importación, Distribución y Venta al por Mayor de Medicamentos; Unisalud 약국 네트워크 연계',
    revenueTier: 3,
    revenueScore: 70,
    pipelineAvgScore: 70,
    manufacturingScore: 60,
    importExperienceScore: 90,
    pharmacyChainScore: 80,
    basePSI: 70.9,
    keyPortfolio: '중미 로컬 심혈관·소화기·진통제 라인 + Unisalud 약국 네트워크',
    recommendationReason: '중미 Top 8 제약 + 과테말라 제조 인프라 + Unisalud 약국 네트워크 연계로 소매 강점',

    oneLineIntro: '중미 Top 8 제약, Unisalud 약국 네트워크',
    fiveFactorsDescription: {
      revenue: 'Tier 3 (중미 Top 8 제약, 그룹 연매출 USD 1억+ 추정)',
      manufacturing: 'O (과테말라 본사 GMP 공장 + 엘살바도르 생산 시설)',
      pharmacyChain: 'O (Unisalud 약국 네트워크 연계, 파나마 소매 강점)',
      pipeline: 'Medium (중미 로컬 심혈관·소화기·진통제 라인)',
      importExperience: '중미 8개국 유통망 50년+ 운영',
    },
    companyDescription:
      '- 과테말라 본사 중미 Top 8 제약 그룹, 50년 유통 경력\n' +
      '- Unisalud 약국 네트워크 연계로 파나마 소매 채널 강점\n' +
      '- 중미 8개국(과테말라·엘살바도르·온두라스 등) 유통망 운영\n' +
      '- 과테말라·엘살바도르 자체 제조 인프라 보유',

    productMatches: [
      { productId: 'rosumeg', productName: 'Rosumeg Combigel', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: '심혈관 라인 보유, Rosuvastatin 단일제 취급. 복합제는 신규' },
      { productId: 'atmeg', productName: 'Atmeg Combigel', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: 'Atorvastatin 처방 채널 접근. 복합제 신규 포지션' },
      { productId: 'ciloduo', productName: 'Ciloduo', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: '심혈관·항혈전 일부, Cilostazol·Rosuvastatin 복합제 신규' },
      { productId: 'gastiin', productName: 'Gastiin CR', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: '소화기 라인 풍부, Mosapride CR 제네릭 취급 가능성 있음' },
      { productId: 'omethyl', productName: 'Omethyl Cutielet', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: 'Unisalud 소매 네트워크 통한 Rx 오메가-3 접근 가능' },
      { productId: 'sereterol', productName: 'Sereterol Activair', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '호흡기 DPI 전문 라인 확인 안 됨' },
      { productId: 'gadvoa', productName: 'Gadvoa Inj.', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '조영제 사업 없음' },
      { productId: 'hydrine', productName: 'Hydrine', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '항암 전문 네트워크 없음' },
    ],
    strategicInsight:
      'Grupo Unipharm은 과테말라 본사의 중미 Top 8 제약 그룹. 파나마 법인 Unipharm Panamá 직접 운영. ' +
      '과테말라·엘살바도르 등 중미 제조 인프라 + 파나마 Unisalud 약국 네트워크 연계로 소매 채널 강점. ' +
      '글로벌 제약사 대비 가격 경쟁력 + 중미 현지화 역량으로 Rx 오메가-3·심혈관 복합제 진입 유리. ' +
      '약국 네트워크 80점은 Haseth 제외 Top 10 최고 수준.',
    qaDefensePoints: [
      'Q: 중미 그룹사 신뢰성? → A: 50년+ 운영 이력, 중미 8개국 유통망 보유',
      'Q: 파나마 단독 매출? → A: 그룹 전체 관점 ~$100M+ 추정, 파나마 개별 공개 제한',
    ],
    sources: [
      'MINSA 공식 라이선스 PDF',
      'Grupo Unipharm 공식: http://site.grupounipharm.com',
    ],
  },

  // ==========================================================================
  // 6위 · ROCHE SERVICIOS · PSI 75.2
  // ==========================================================================
  {
    id: 'roche',
    rank: 6,
    partnerName: 'ROCHE SERVICIOS, S.A.',
    groupName: 'F. Hoffmann-La Roche AG (스위스)',
    countryCode: 'CH',
    countryName: '스위스',
    address: 'Ciudad de Panamá (Roche Servicios 법인)',
    phone: '+507 294-5900',
    email: 'panama.medinfo@roche.com',
    website: 'https://www.roche.com',
    minsaLicense: 'A/DNFD (Agencia)',
    operatingScope: 'Importación, Distribución y Venta al por Mayor de Medicamentos y Productos Biotecnológicos',
    revenueTier: 1,
    revenueScore: 100,
    pipelineAvgScore: 50,
    manufacturingScore: 80,
    importExperienceScore: 85,
    pharmacyChainScore: 0,
    basePSI: 75.2,
    keyPortfolio: 'Oncology · 면역학 · 진단 · 희귀질환',
    recommendationReason: '스위스 글로벌 Top 3 제약 + Oncology 글로벌 선도 + 우리 8제품 파이프라인 매칭 제한적',

    oneLineIntro: '스위스 글로벌 Top 3, Oncology·진단 선도',
    fiveFactorsDescription: {
      revenue: 'Tier 1 (Roche 그룹 연매출 USD 680억+, 글로벌 제약 Top 3)',
      manufacturing: 'O (스위스·독일·미국 등 글로벌 GMP 생산 시설)',
      pharmacyChain: 'X (약국 체인 미운영, 병원·전문 유통 중심)',
      pipeline: 'Low (제네릭 미주력, Hydrine·Gadvoa 일부 Adjacent)',
      importExperience: '전 세계 150개국+ 공급망',
    },
    companyDescription:
      '- 스위스 Basel 본사 글로벌 Top 3 제약사, 2024 매출 CHF 60bn+\n' +
      '- Oncology(Herceptin·Avastin·MabThera) 글로벌 선도 기업\n' +
      '- Roche Diagnostics 진단 장비·시약 세계 1위\n' +
      '- 파나마 Roche Servicios 법인 운영, 중남미 유통 거점',

    productMatches: [
      { productId: 'rosumeg', productName: 'Rosumeg Combigel', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '심혈관 제네릭 영역 미주력' },
      { productId: 'atmeg', productName: 'Atmeg Combigel', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '스타틴 복합제 취급 없음' },
      { productId: 'ciloduo', productName: 'Ciloduo', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '심혈관·항혈전 미주력' },
      { productId: 'gastiin', productName: 'Gastiin CR', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '소화기 프로키네틱 미취급' },
      { productId: 'omethyl', productName: 'Omethyl Cutielet', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: 'Rx 오메가-3 영역 진출 없음' },
      { productId: 'sereterol', productName: 'Sereterol Activair', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '호흡기 DPI 미주력' },
      { productId: 'gadvoa', productName: 'Gadvoa Inj.', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: 'Roche Diagnostics 진단 영역 보유. 조영제 직접 취급은 없음' },
      { productId: 'hydrine', productName: 'Hydrine', conflictLevel: 'upgrade_opportunity', pipelineTier: 2,
        shortInsight: 'Roche Oncology 글로벌 선도. Hydroxyurea 제네릭 유통 Upgrade 제안 가능' },
    ],
    strategicInsight:
      'F. Hoffmann-La Roche AG는 스위스 본사의 글로벌 Top 3 제약. 2024 매출 CHF 60bn+. ' +
      '파나마 Roche Servicios 법인 운영. Oncology(Herceptin·MabThera·Avastin)·면역학·진단 글로벌 선도. ' +
      '우리 8개 제품 중 Hydrine(Hydroxyurea 항암) 1건 Upgrade Opportunity 외 대부분 none. ' +
      '파이프라인 미스매치로 PSI 7위이나 Oncology 파트너십 잠재력은 전략적 가치 있음.',
    qaDefensePoints: [
      'Q: Roche 매출 Tier 1인데 왜 PSI 7위? → A: 제네릭·복합제 대비 바이오·혁신 신약 중심, 우리 라인업과 카테고리 상이',
      'Q: Hydrine 매칭 실현성? → A: Roche Oncology 네트워크 활용 제네릭 보완 가능, 단 정책 방향 확인 필요',
    ],
    sources: [
      'MINSA 공식 라이선스 PDF',
      'Roche 2024 Annual Report: https://www.roche.com',
    ],
  },

  // ==========================================================================
  // 7위 · TECNOQUÍMICAS PANAMÁ · PSI 74.35
  // ==========================================================================
  {
    id: 'tecnoquimicas',
    rank: 7,
    partnerName: 'TECNOQUÍMICAS PANAMÁ, S.A.',
    groupName: 'Tecnoquímicas S.A. (콜롬비아)',
    countryCode: 'CO',
    countryName: '콜롬비아',
    address: 'Ciudad de Panamá (Tecnoquímicas Panamá 법인)',
    phone: '+507 264-6656',
    email: 'servicioalcliente@tqconfiable.com',
    website: 'https://www.tqconfiable.com',
    minsaLicense: 'A/DNFD (Agencia)',
    operatingScope: 'Importación, Distribución y Venta al por Mayor de Medicamentos (브랜드 MK)',
    revenueTier: 2,
    revenueScore: 85,
    pipelineAvgScore: 75,
    manufacturingScore: 70,
    importExperienceScore: 80,
    pharmacyChainScore: 0,
    basePSI: 74.35,
    keyPortfolio: '심혈관 · 소화기 · OTC · Cardiolat 시리즈',
    recommendationReason: '콜롬비아 Top 제약 MK 브랜드 + Cardiolat 심혈관 라인 보유 + 중남미 교차 마케팅 잠재력',

    oneLineIntro: '콜롬비아 MK 브랜드, 중남미 교차 마케팅',
    fiveFactorsDescription: {
      revenue: 'Tier 2 (Tecnoquímicas 그룹 연매출 USD 6억, 콜롬비아 LATAM Top)',
      manufacturing: 'O (콜롬비아 본사 GMP 공장, MK 브랜드 제조)',
      pharmacyChain: 'X (약국 체인 미운영, 도매 유통 중심)',
      pipeline: 'Medium (Cardiolat 심혈관 + MK 소화기 라인 + Rosumeg·Atmeg 2건 Upgrade)',
      importExperience: '중남미 전역 유통망 60년+, MK 브랜드 인지도 상위',
    },
    companyDescription:
      '- 콜롬비아 본사 LATAM 중견 제약사, MK 브랜드 중남미 유통\n' +
      '- Cardiolat 심혈관 시리즈 + MK 소화기·OTC 라인 주력\n' +
      '- Rosumeg·Atmeg 복합제 Upgrade 직접 제안 가능 포지션\n' +
      '- 콜롬비아-파나마 교차 마케팅으로 중남미 침투 시너지',

    productMatches: [
      { productId: 'rosumeg', productName: 'Rosumeg Combigel', conflictLevel: 'upgrade_opportunity', pipelineTier: 2,
        shortInsight: 'Cardiolat 심혈관 라인에 Rosuvastatin 보유. 복합제 Upgrade 포지션' },
      { productId: 'atmeg', productName: 'Atmeg Combigel', conflictLevel: 'upgrade_opportunity', pipelineTier: 2,
        shortInsight: 'Atorvastatin 제네릭 주력. Omega-3 복합제 Upgrade 가능' },
      { productId: 'ciloduo', productName: 'Ciloduo', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: '심혈관·항혈전 처방 라인 보유. 복합제는 신규 포지션' },
      { productId: 'gastiin', productName: 'Gastiin CR', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: '소화기 MK 브랜드 풍부. Mosapride CR 직접 취급 확인 필요' },
      { productId: 'omethyl', productName: 'Omethyl Cutielet', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: '심혈관 처방 네트워크 활용 가능, Rx 오메가-3 신규' },
      { productId: 'sereterol', productName: 'Sereterol Activair', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '호흡기 DPI 라인 없음' },
      { productId: 'gadvoa', productName: 'Gadvoa Inj.', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '조영제 사업 없음' },
      { productId: 'hydrine', productName: 'Hydrine', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '항암 전문 네트워크 확인 안 됨' },
    ],
    strategicInsight:
      'Tecnoquímicas S.A.는 콜롬비아 본사의 LATAM 중견 제약사. MK 브랜드로 중남미 전역 유통. ' +
      '파나마 법인은 Cardiolat(심혈관) 시리즈 + MK 소화기·OTC 라인 주력. ' +
      '8개 제품 중 Rosumeg·Atmeg 2건 Upgrade + 3건 Adjacent로 심혈관 중심 매칭. ' +
      '콜롬비아-파나마 교차 마케팅 시너지 + 중남미 가격 포지셔닝 강점.',
    qaDefensePoints: [
      'Q: 콜롬비아 제약사가 파나마에서 경쟁력? → A: MK 브랜드 인지도 높음, 중남미 교차 홍보 유리',
      'Q: Cardiolat과 Rosumeg 관계? → A: 심혈관 처방 채널 겹침 → 동일 네트워크 복합제 Upgrade 가능',
    ],
    sources: [
      'MINSA 공식 라이선스 PDF',
      'Tecnoquímicas 공식: https://www.tqconfiable.com',
    ],
  },

  // ==========================================================================
  // 17위 · MEDIPAN · PSI 59.05
  // ==========================================================================
  {
    id: 'medipan',
    rank: 17,
    partnerName: 'MEDIPAN, S.A.',
    groupName: null,
    countryCode: 'PA',
    countryName: '파나마',
    address: 'Ciudad de Panamá (Medipan 파나마 로컬)',
    phone: '+507 270-1234',
    email: 'info@medipan.com.pa',
    website: 'https://www.panadata.net/organizaciones/?q=medipan',
    minsaLicense: 'A/DNFD (Agencia)',
    operatingScope: 'Importación, Distribución y Venta al por Mayor de Medicamentos; 자체 RosuMed 브랜드 보유',
    revenueTier: 4,
    revenueScore: 55,
    pipelineAvgScore: 75,
    manufacturingScore: 40,
    importExperienceScore: 90,
    pharmacyChainScore: 0,
    basePSI: 59.05,
    keyPortfolio: '파나마 로컬 심혈관 · 자체 RosuMed (Rosuvastatin)',
    recommendationReason: '파나마 로컬 심혈관 전문 + 자체 RosuMed 브랜드 + Rosumeg Direct Competition 주의 필요',

    oneLineIntro: '파나마 로컬 심혈관 전문, 자체 RosuMed 보유',
    fiveFactorsDescription: {
      revenue: 'Tier 4 (파나마 로컬 중소, 자체 브랜드 RosuMed 보유, 추정 USD 2천만)',
      manufacturing: 'X (자체 제조 시설 미보유, 수입 유통)',
      pharmacyChain: 'X (약국 체인 미운영)',
      pipeline: 'Medium (심혈관 전문 + 자체 Rosuvastatin 브랜드)',
      importExperience: '파나마 로컬 30년+ 심혈관 유통',
    },
    companyDescription:
      '- 파나마 로컬 중소 유통사, 심혈관 카테고리 전문화\n' +
      '- 자체 RosuMed(Rosuvastatin) 브랜드 보유 → Rosumeg 직접 경쟁\n' +
      '- Atmeg·Ciloduo 등 다른 심혈관 복합제 유통 여지 있음\n' +
      '- 파나마 로컬 심혈관 처방 네트워크 활용도 상위',

    productMatches: [
      { productId: 'rosumeg', productName: 'Rosumeg Combigel', conflictLevel: 'direct_competition', pipelineTier: 1,
        shortInsight: '자체 RosuMed(Rosuvastatin) 보유 → Rosumeg와 동일 성분. 직접 경쟁 관계' },
      { productId: 'atmeg', productName: 'Atmeg Combigel', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: 'Atorvastatin은 별도, Atmeg 복합제 포지션 가능하나 RosuMed 이슈로 유통 우선순위 저하' },
      { productId: 'ciloduo', productName: 'Ciloduo', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: 'Cilostazol·Rosuvastatin 복합제, RosuMed 카니발리제이션 우려' },
      { productId: 'gastiin', productName: 'Gastiin CR', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: '소화기 일부, Mosapride CR 신규 포지션' },
      { productId: 'omethyl', productName: 'Omethyl Cutielet', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: '심혈관 처방 네트워크 활용, Rx 오메가-3 신규' },
      { productId: 'sereterol', productName: 'Sereterol Activair', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '호흡기 전문 없음' },
      { productId: 'gadvoa', productName: 'Gadvoa Inj.', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '조영제 사업 없음' },
      { productId: 'hydrine', productName: 'Hydrine', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '항암 전문 없음' },
    ],
    strategicInsight:
      'Medipan은 파나마 로컬 중소 유통사로 심혈관 전문 포지셔닝. 자체 RosuMed(Rosuvastatin) 브랜드 보유. ' +
      'RosuMed는 Rosumeg와 동일 주성분이라 직접 경쟁 관계, Rosumeg 유통 최우선 파트너로는 부적합. ' +
      '다만 Atmeg(Atorvastatin+Omega-3)·Ciloduo 등 다른 심혈관 복합제 유통 가능성 있음. ' +
      '파나마 로컬 심혈관 처방 네트워크 활용도는 상위권.',
    qaDefensePoints: [
      'Q: Medipan을 Rosumeg에 쓸 수 있나? → A: 자체 RosuMed로 Direct Competition, 권장 안 함',
      'Q: 그럼 왜 Top 10? → A: Atmeg·Ciloduo 등 다른 제품 유통 가능 + 로컬 처방 네트워크 가치',
    ],
    sources: [
      'MINSA 공식 라이선스 PDF',
      'Panadata 프로필: https://www.panadata.net',
    ],
  },

  // ==========================================================================
  // 8위 · BAYER · PSI 73.8
  // ==========================================================================
  {
    id: 'bayer',
    rank: 8,
    partnerName: 'BAYER, S.A.',
    groupName: 'Bayer AG (독일)',
    countryCode: 'DE',
    countryName: '독일',
    address: 'Ciudad de Panamá (Bayer Panamá 법인)',
    phone: '+507 204-7600',
    email: 'medinfo.panama@bayer.com',
    website: 'https://www.bayer.com',
    minsaLicense: 'A/DNFD (Agencia)',
    operatingScope: 'Importación, Distribución y Venta al por Mayor de Medicamentos y Productos Radiológicos',
    revenueTier: 1,
    revenueScore: 100,
    pipelineAvgScore: 45,
    manufacturingScore: 80,
    importExperienceScore: 85,
    pharmacyChainScore: 0,
    basePSI: 73.8,
    keyPortfolio: '심혈관 · 여성건강 · Oncology · MRI 조영제 Gadavist',
    recommendationReason: '독일 글로벌 Top 10 제약 + MRI 조영제 Gadavist 원개발사 → Gadvoa Direct Competition',

    oneLineIntro: '독일 글로벌 Top 10, Gadvoa 원개발사',
    fiveFactorsDescription: {
      revenue: 'Tier 1 (Bayer 그룹 연매출 USD 510억+, 글로벌 제약 Top 10)',
      manufacturing: 'O (독일·미국 등 글로벌 GMP 공장 + 조영제 전용 시설)',
      pharmacyChain: 'X (약국 체인 미운영, 병원·도매 중심)',
      pipeline: 'Low (Gadavist Direct Competition + Xarelto·Nexavar 강점)',
      importExperience: '파나마 Bayer Panamá 법인 58년+, 중남미 전역',
    },
    companyDescription:
      '- 독일 Bayer AG 파나마 법인, 1968년 설립 58년 운영\n' +
      '- Gadvoa(Gadobutrol) 원개발사 Gadavist 보유 → Direct Competition\n' +
      '- 심혈관(Xarelto·Adalat)·Oncology(Nexavar·Stivarga) 글로벌 강자\n' +
      '- 영상진단 Gadavist 글로벌 Top 3 조영제 제조사',

    productMatches: [
      { productId: 'rosumeg', productName: 'Rosumeg Combigel', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: 'Rosuvastatin 단일제 취급 제한적' },
      { productId: 'atmeg', productName: 'Atmeg Combigel', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: 'Atorvastatin 복합제 미주력' },
      { productId: 'ciloduo', productName: 'Ciloduo', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: '심혈관 Xarelto·Adalat 강세. 복합제 카테고리는 상이' },
      { productId: 'gastiin', productName: 'Gastiin CR', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '소화기 Rx 미주력' },
      { productId: 'omethyl', productName: 'Omethyl Cutielet', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: 'Rx 오메가-3 미취급' },
      { productId: 'sereterol', productName: 'Sereterol Activair', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '호흡기 DPI 없음' },
      { productId: 'gadvoa', productName: 'Gadvoa Inj.', conflictLevel: 'direct_competition', pipelineTier: 1,
        shortInsight: 'Gadobutrol 원개발 Gadavist 글로벌 판매. Gadvoa와 동일 주성분 직접 경쟁' },
      { productId: 'hydrine', productName: 'Hydrine', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: 'Oncology Nexavar·Stivarga 보유. Hydroxyurea 제네릭 직접 취급 없음' },
    ],
    strategicInsight:
      'Bayer AG는 독일 본사의 글로벌 Top 10 제약. 2024 매출 €47bn+. 파나마 Bayer Panamá 법인 운영. ' +
      '심혈관(Xarelto·Adalat)·여성건강·Oncology(Nexavar·Stivarga)·MRI 조영제(Gadavist) 글로벌 선도. ' +
      'Gadvoa(Gadobutrol)는 Bayer Gadavist와 동일 주성분으로 Direct Competition 구조. ' +
      'Gadvoa 유통 불가이나 Oncology 제네릭 보완 또는 다른 카테고리 별도 협력 가능성.',
    qaDefensePoints: [
      'Q: Bayer 매출 Tier 1인데 왜 PSI 10위? → A: Gadvoa Direct Competition + 우리 제품 매칭 영역 협소',
      'Q: Gadavist 대비 Gadvoa 경쟁력? → A: 동일 성분·가격 경쟁력 확보 시 제3 유통사 통한 진입 전략 필요',
    ],
    sources: [
      'MINSA 공식 라이선스 PDF',
      'Bayer 2024 Annual Report: https://www.bayer.com',
    ],
  },

  // ==========================================================================
  // 9위 · NOVARTIS LOGISTICS · PSI 72.2
  // ==========================================================================
  {
    id: 'novartis',
    rank: 9,
    partnerName: 'NOVARTIS LOGISTICS, S.A.',
    groupName: 'Novartis AG (스위스)',
    countryCode: 'CH',
    countryName: '스위스',
    address: 'Ciudad de Panamá (Novartis Logistics 법인)',
    phone: '+507 263-9800',
    email: 'panama.medinfo@novartis.com',
    website: 'https://www.novartis.com',
    minsaLicense: 'A/DNFD (Agencia)',
    operatingScope: 'Importación, Distribución y Venta al por Mayor de Medicamentos',
    revenueTier: 1,
    revenueScore: 100,
    pipelineAvgScore: 45,
    manufacturingScore: 75,
    importExperienceScore: 80,
    pharmacyChainScore: 0,
    basePSI: 72.2,
    keyPortfolio: 'Oncology · 심혈관 · 면역학 · CML 글로벌 1위',
    recommendationReason: '스위스 글로벌 Top 5 제약 + CML(만성골수성백혈병) 글로벌 1위 Gleevec 보유',

    oneLineIntro: '스위스 글로벌 Top 5, CML Gleevec 1위',
    fiveFactorsDescription: {
      revenue: 'Tier 1 (Novartis 그룹 연매출 USD 500억+, 글로벌 제약 Top 5)',
      manufacturing: 'O (스위스·독일·미국 등 글로벌 GMP 공장)',
      pharmacyChain: 'X (약국 체인 미운영, 병원·전문 유통 중심)',
      pipeline: 'Low (혁신 신약 중심, Hydrine 1건 Adjacent)',
      importExperience: '전 세계 140개국+ 공급망',
    },
    companyDescription:
      '- 스위스 Basel 본사 글로벌 Top 5 제약사, 2024 매출 $50bn+\n' +
      '- Oncology(Gleevec·Kisqali) 글로벌 선도, CML 표준치료 Gleevec 1위\n' +
      '- 심혈관·면역학 혁신 신약 중심 포트폴리오\n' +
      '- 파나마 Novartis Logistics 법인 운영, 자사 제품 전용 유통',

    productMatches: [
      { productId: 'rosumeg', productName: 'Rosumeg Combigel', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '심혈관 제네릭 복합제 미주력' },
      { productId: 'atmeg', productName: 'Atmeg Combigel', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: 'Atorvastatin 복합제 없음' },
      { productId: 'ciloduo', productName: 'Ciloduo', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '심혈관·항혈전 미주력' },
      { productId: 'gastiin', productName: 'Gastiin CR', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '소화기 Rx 미주력' },
      { productId: 'omethyl', productName: 'Omethyl Cutielet', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: 'Rx 오메가-3 미취급' },
      { productId: 'sereterol', productName: 'Sereterol Activair', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '호흡기 DPI 없음' },
      { productId: 'gadvoa', productName: 'Gadvoa Inj.', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '조영제 사업 없음' },
      { productId: 'hydrine', productName: 'Hydrine', conflictLevel: 'adjacent_category', pipelineTier: 2,
        shortInsight: 'Novartis Gleevec CML 1위. Hydroxyurea는 Gleevec 보완제로 병용 처방 네트워크 접근 가능' },
    ],
    strategicInsight:
      'Novartis AG는 스위스 바젤 본사의 글로벌 Top 5 제약. 2024 매출 $50bn+. ' +
      '파나마 Novartis Logistics 법인 운영. Oncology(Gleevec·Kisqali)·심혈관·면역학 강세. ' +
      'Hydrine(Hydroxyurea)은 CML 표준치료 Gleevec와 병용 처방 관계 → Novartis Oncology 네트워크 접근 가치. ' +
      '다만 자사 혁신 신약 중심 포트폴리오라 제네릭 유통 우선순위는 낮음.',
    qaDefensePoints: [
      'Q: Novartis가 Hydroxyurea 제네릭 유통? → A: Novartis는 혁신 신약 중심, 제네릭 유통 구조적 한계',
      'Q: 그럼 협력 방안? → A: CML 환자군 공동 마케팅·교육 프로그램 등 간접 협력 가능',
    ],
    sources: [
      'MINSA 공식 라이선스 PDF',
      'Novartis 2024 Annual Report: https://www.novartis.com',
    ],
  },

  // ==========================================================================
  // 12위 · SANOFI-AVENTIS · PSI 71.2
  // ==========================================================================
  {
    id: 'sanofi',
    rank: 12,
    partnerName: 'SANOFI-AVENTIS DE PANAMÁ, S.A.',
    groupName: 'Sanofi (프랑스)',
    countryCode: 'FR',
    countryName: '프랑스',
    address: 'Ciudad de Panamá (Sanofi-Aventis 법인)',
    phone: '+507 265-6050',
    email: 'panama.medicalinformation@sanofi.com',
    website: 'https://www.sanofi.com',
    minsaLicense: 'A/DNFD (Agencia)',
    operatingScope: 'Importación, Distribución y Venta al por Mayor de Medicamentos y Vacunas',
    revenueTier: 1,
    revenueScore: 100,
    pipelineAvgScore: 45,
    manufacturingScore: 70,
    importExperienceScore: 80,
    pharmacyChainScore: 0,
    basePSI: 71.2,
    keyPortfolio: '심혈관(Plavix) · 당뇨 · 백신 · 희귀질환',
    recommendationReason: '프랑스 글로벌 Top 5 + Plavix 항혈전 글로벌 표준 보유 + Ciloduo 인접 처방 네트워크',

    oneLineIntro: '프랑스 글로벌 Top 5, Plavix 항혈전 표준',
    fiveFactorsDescription: {
      revenue: 'Tier 1 (Sanofi 그룹 연매출 USD 460억+, 글로벌 제약 Top 5)',
      manufacturing: 'O (프랑스·독일·미국 글로벌 GMP 공장)',
      pharmacyChain: 'X (약국 체인 미운영, 병원·전문 유통)',
      pipeline: 'Low (혁신 신약 중심, Ciloduo 1건 Adjacent)',
      importExperience: '전 세계 100개국+ 공급망',
    },
    companyDescription:
      '- 프랑스 Paris 본사 글로벌 Top 5 제약사, 2024 매출 €43bn+\n' +
      '- 심혈관(Plavix)·당뇨·백신·희귀질환 글로벌 선도\n' +
      '- Plavix 항혈전 처방 네트워크 Ciloduo 인접 병용 가능\n' +
      '- 파나마 Sanofi-Aventis 법인 운영, 자사 제품 전용',

    productMatches: [
      { productId: 'rosumeg', productName: 'Rosumeg Combigel', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '스타틴 제네릭 미주력' },
      { productId: 'atmeg', productName: 'Atmeg Combigel', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: 'Atorvastatin 복합제 없음' },
      { productId: 'ciloduo', productName: 'Ciloduo', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: 'Plavix(Clopidogrel) 항혈전 글로벌 표준. Cilostazol·Rosuvastatin 복합제 병용 처방 네트워크' },
      { productId: 'gastiin', productName: 'Gastiin CR', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '소화기 Rx 미주력' },
      { productId: 'omethyl', productName: 'Omethyl Cutielet', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: 'Rx 오메가-3 미취급' },
      { productId: 'sereterol', productName: 'Sereterol Activair', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '호흡기 DPI 미주력' },
      { productId: 'gadvoa', productName: 'Gadvoa Inj.', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '조영제 사업 없음' },
      { productId: 'hydrine', productName: 'Hydrine', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '항암 제네릭 영역 미주력' },
    ],
    strategicInsight:
      'Sanofi는 프랑스 파리 본사의 글로벌 Top 5 제약. 2024 매출 €43bn+. ' +
      '파나마 Sanofi-Aventis 법인 운영. 심혈관(Plavix)·당뇨·백신·희귀질환 글로벌 선도. ' +
      'Plavix 항혈전 처방 네트워크와 Ciloduo(Cilostazol+Rosuvastatin) 병용 처방 인접. ' +
      '자사 혁신 신약 중심이라 제네릭 복합제 유통 우선순위 낮음.',
    qaDefensePoints: [
      'Q: Sanofi Plavix와 Ciloduo 관계? → A: 동일 항혈전 계열이나 성분 상이, 처방 네트워크 겹침',
      'Q: Sanofi 파나마 규모? → A: 그룹 Top 제약 신뢰성 기반, 로컬 구체 매출은 공개 제한',
    ],
    sources: [
      'MINSA 공식 라이선스 PDF',
      'Sanofi 2024 Annual Report: https://www.sanofi.com',
    ],
  },

  // ==========================================================================
  // 10위 · PFIZER FREE ZONE · PSI 71.6
  // ==========================================================================
  {
    id: 'pfizer',
    rank: 10,
    partnerName: 'PFIZER PRODUCTS PANAMA, S.A. (Free Zone)',
    groupName: 'Pfizer Inc. (미국)',
    countryCode: 'US',
    countryName: '미국',
    address: 'Zona Libre de Colón (ZLC) · Pfizer Free Zone 재수출 허브',
    phone: '+507 430-5000',
    email: 'panama.medinfo@pfizer.com',
    website: 'https://www.pfizer.com',
    minsaLicense: 'A/DNFD (Agencia) ZLC',
    operatingScope: 'Importación, Reexportación, Distribución y Venta al por Mayor de Medicamentos (LATAM 재수출)',
    revenueTier: 1,
    revenueScore: 100,
    pipelineAvgScore: 45,
    manufacturingScore: 75,
    importExperienceScore: 75,
    pharmacyChainScore: 0,
    basePSI: 71.6,
    keyPortfolio: '심혈관(Lipitor) · 백신 · 감염증 · Oncology',
    recommendationReason: '미국 글로벌 Top 1 매출 + ZLC 재수출 허브 운영 + Atmeg 인접(Atorvastatin 원개발)',

    oneLineIntro: '미국 매출 Top 1, ZLC 재수출 허브',
    fiveFactorsDescription: {
      revenue: 'Tier 1 (Pfizer 그룹 연매출 USD 580억+, 글로벌 제약 매출 Top 1)',
      manufacturing: 'O (미국·유럽 GMP 공장 + ZLC 재수출 거점)',
      pharmacyChain: 'X (약국 체인 미운영)',
      pipeline: 'Low (혁신 신약·백신 중심, Atmeg 1건 Adjacent)',
      importExperience: 'ZLC Free Zone 재수출 LATAM 전역 거점',
    },
    companyDescription:
      '- 미국 뉴욕 본사 글로벌 매출 Top 1 제약사, 2024 매출 $58bn+\n' +
      '- ZLC(Zona Libre de Colón) 재수출 허브 운영, LATAM 공급망 거점\n' +
      '- Lipitor(Atorvastatin 원개발)·Prevnar·Comirnaty 블록버스터\n' +
      '- 자사 제품 전용 ZLC 재수출, 제3자 OEM 유통 제한적',

    productMatches: [
      { productId: 'rosumeg', productName: 'Rosumeg Combigel', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: 'Rosuvastatin 직접 라인 제한' },
      { productId: 'atmeg', productName: 'Atmeg Combigel', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: 'Lipitor(Atorvastatin) 원개발사. 복합제는 별도 취급, 처방 네트워크 인접' },
      { productId: 'ciloduo', productName: 'Ciloduo', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '심혈관·항혈전 복합제 미주력' },
      { productId: 'gastiin', productName: 'Gastiin CR', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '소화기 Rx 미주력' },
      { productId: 'omethyl', productName: 'Omethyl Cutielet', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: 'Rx 오메가-3 미취급' },
      { productId: 'sereterol', productName: 'Sereterol Activair', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '호흡기 DPI 없음' },
      { productId: 'gadvoa', productName: 'Gadvoa Inj.', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '조영제 사업 없음' },
      { productId: 'hydrine', productName: 'Hydrine', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '항암 제네릭 미주력' },
    ],
    strategicInsight:
      'Pfizer Inc.는 미국 뉴욕 본사의 글로벌 매출 Top 1 제약. 2024 매출 $58bn+. ' +
      '파나마 Pfizer Products Panama ZLC 재수출 허브 운영, LATAM 공급망 거점. ' +
      'Lipitor(Atorvastatin)·Prevnar·Comirnaty 등 블록버스터 중심. Atmeg과 Atorvastatin 원개발 관계. ' +
      '자사 혁신 신약·백신 중심이라 제네릭 복합제 유통 가능성 낮음. 재수출 거점 가치는 존재.',
    qaDefensePoints: [
      'Q: Pfizer 매출 Top 1인데 왜 PSI 12위? → A: 우리 제네릭 복합제 라인과 파이프라인 카테고리 상이',
      'Q: ZLC 재수출 거점 활용 가능? → A: Pfizer 자사 제품 전용, 우리 제품 OEM 유통은 가능성 낮음',
    ],
    sources: [
      'MINSA 공식 라이선스 PDF',
      'Pfizer 2024 Annual Report: https://www.pfizer.com',
    ],
  },

  // ==========================================================================
  // 14위 · MSD (Merck & Co.) · PSI 69.2
  // ==========================================================================
  {
    id: 'msd',
    rank: 14,
    partnerName: 'MERCK SHARP & DOHME (I.A.), CORP.',
    groupName: 'Merck & Co., Inc. (미국, MSD)',
    countryCode: 'US',
    countryName: '미국',
    address: 'MMG Tower Piso 15, Costa del Este, Ciudad de Panamá',
    phone: '+507 206-4200',
    email: 'medinfo.panama@merck.com',
    website: 'https://www.msd.com',
    minsaLicense: 'A/DNFD (Agencia)',
    operatingScope: 'Importación, Distribución y Venta al por Mayor de Medicamentos, Vacunas, Productos Biotecnológicos',
    revenueTier: 1,
    revenueScore: 100,
    pipelineAvgScore: 40,
    manufacturingScore: 70,
    importExperienceScore: 75,
    pharmacyChainScore: 0,
    basePSI: 69.2,
    keyPortfolio: 'Oncology(Keytruda) · 백신(Gardasil) · 감염증 · 당뇨',
    recommendationReason: '미국 글로벌 Top 5 + Keytruda 면역항암 글로벌 블록버스터 + 우리 제네릭 라인과 카테고리 상이',

    oneLineIntro: '미국 글로벌 Top 5, Keytruda 면역항암',
    fiveFactorsDescription: {
      revenue: 'Tier 1 (MSD 그룹 연매출 USD 640억+, 글로벌 제약 Top 5)',
      manufacturing: 'O (미국·유럽 등 글로벌 GMP 공장)',
      pharmacyChain: 'X (약국 체인 미운영, 병원·전문 유통)',
      pipeline: 'Low (혁신 신약·백신 중심, Hydrine·Atmeg 2건 Adjacent)',
      importExperience: '파나마 MSD 법인 MMG Tower 15층 본사',
    },
    companyDescription:
      '- 미국 뉴저지 본사 글로벌 Top 5 제약사, 2024 매출 $64bn+\n' +
      '- Keytruda(면역항암) 글로벌 블록버스터 #1 매출\n' +
      '- Gardasil(자궁경부암 백신)·감염증·당뇨 포트폴리오\n' +
      '- 파나마 MSD 법인 MMG Tower 15층 본사, 자사 제품 전용',

    productMatches: [
      { productId: 'rosumeg', productName: 'Rosumeg Combigel', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '스타틴 제네릭 미주력' },
      { productId: 'atmeg', productName: 'Atmeg Combigel', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: 'Zocor(Simvastatin) 오리지널 보유 이력. 복합제는 미취급, 네트워크 인접' },
      { productId: 'ciloduo', productName: 'Ciloduo', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '심혈관·항혈전 복합제 미주력' },
      { productId: 'gastiin', productName: 'Gastiin CR', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '소화기 Rx 미주력' },
      { productId: 'omethyl', productName: 'Omethyl Cutielet', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: 'Rx 오메가-3 미취급' },
      { productId: 'sereterol', productName: 'Sereterol Activair', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '호흡기 DPI 없음' },
      { productId: 'gadvoa', productName: 'Gadvoa Inj.', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '조영제 사업 없음' },
      { productId: 'hydrine', productName: 'Hydrine', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: 'Keytruda 면역항암 처방 네트워크. Hydroxyurea 제네릭 직접 취급은 없음' },
    ],
    strategicInsight:
      'Merck & Co.(MSD)는 미국 뉴저지 본사의 글로벌 Top 5 제약. 2024 매출 $64bn+. ' +
      '파나마 MSD 법인은 MMG Tower 15층 본사. Keytruda(면역항암)·Gardasil(자궁경부암 백신) 글로벌 블록버스터. ' +
      '자사 혁신 신약·백신 중심 포트폴리오라 제네릭 복합제 유통 우선순위 낮음. ' +
      'Hydrine은 Keytruda Oncology 네트워크와 인접 처방 관계로 간접 협력 잠재력.',
    qaDefensePoints: [
      'Q: MSD 매출 Tier 1인데 왜 PSI 14위? → A: 혁신 신약 중심, 우리 제네릭 복합제 라인과 카테고리 미스매치',
      'Q: Keytruda와 Hydrine 관계? → A: 면역항암 + 세포독성항암 병용 전략 있으나 직접 유통은 MSD 정책상 어려움',
    ],
    sources: [
      'MINSA 공식 라이선스 PDF',
      'MSD 2024 Annual Report: https://www.msd.com',
    ],
  },

  // ==========================================================================
  // 5위 · BAGÓ PANAMÁ · PSI 75.6
  // ==========================================================================
  {
    id: 'bago',
    rank: 5,
    partnerName: 'LABORATORIOS BAGÓ DE PANAMÁ, S.A.',
    groupName: 'Laboratorios Bagó (아르헨티나)',
    countryCode: 'AR',
    countryName: '아르헨티나',
    address: 'Ciudad de Panamá (Bagó Panamá 법인)',
    phone: '+507 236-9090',
    email: 'info@bago.com.pa',
    website: 'https://www.bago.com',
    minsaLicense: 'A/DNFD (Agencia)',
    operatingScope: 'Importación, Distribución y Venta al por Mayor de Medicamentos',
    revenueTier: 2,
    revenueScore: 100,
    pipelineAvgScore: 70,
    manufacturingScore: 60,
    importExperienceScore: 75,
    pharmacyChainScore: 0,
    basePSI: 75.6,
    keyPortfolio: '심혈관 · 소화기 · 항생제 · LATAM 전역 유통',
    recommendationReason: 'LATAM Big 3 제약사 + 아르헨티나 제조 + 심혈관 복합제 Upgrade 매칭',

    oneLineIntro: 'LATAM Big 3, 20개국+ 유통망',
    fiveFactorsDescription: {
      revenue: 'Tier 1 (Bagó 그룹 연매출 USD 10억+, LATAM Big 3 제약)',
      manufacturing: 'O (아르헨티나 본사 GMP 공장 + 우루과이 생산)',
      pharmacyChain: 'X (약국 체인 미운영, 도매 유통)',
      pipeline: 'Medium (심혈관·소화기·항생제 + Rosumeg·Atmeg Upgrade)',
      importExperience: 'LATAM 20개국+ 유통망, Big 3 위상',
    },
    companyDescription:
      '- 아르헨티나 본사 LATAM Big 3 제약사, 연매출 ~$1bn+\n' +
      '- 중남미 20개국+ 유통망, 아르헨티나 현지 제조 인프라\n' +
      '- 심혈관·소화기·항생제 라인 + Rosumeg·Atmeg Upgrade 가능\n' +
      '- 파나마 Bagó Panamá 법인 운영, 중남미 확장 거점',

    productMatches: [
      { productId: 'rosumeg', productName: 'Rosumeg Combigel', conflictLevel: 'upgrade_opportunity', pipelineTier: 2,
        shortInsight: 'Bagó 심혈관 라인에 Rosuvastatin 제네릭 보유. 복합제 Upgrade 포지션' },
      { productId: 'atmeg', productName: 'Atmeg Combigel', conflictLevel: 'upgrade_opportunity', pipelineTier: 2,
        shortInsight: 'Atorvastatin 제네릭 주력. Omega-3 복합제 Upgrade 가능' },
      { productId: 'ciloduo', productName: 'Ciloduo', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: '심혈관 처방 네트워크 보유, 복합제 신규 포지션' },
      { productId: 'gastiin', productName: 'Gastiin CR', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: '소화기 Rx 라인 보유. Mosapride CR 직접 취급 확인 필요' },
      { productId: 'omethyl', productName: 'Omethyl Cutielet', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: '심혈관 처방 네트워크 활용 가능, Rx 오메가-3 신규' },
      { productId: 'sereterol', productName: 'Sereterol Activair', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '호흡기 DPI 라인 없음' },
      { productId: 'gadvoa', productName: 'Gadvoa Inj.', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '조영제 사업 없음' },
      { productId: 'hydrine', productName: 'Hydrine', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '항암 전문 네트워크 확인 안 됨' },
    ],
    strategicInsight:
      'Laboratorios Bagó는 아르헨티나 본사의 LATAM Big 3 제약. 중남미 20+개국 유통 + 자체 제조. ' +
      '파나마 Bagó Panamá 법인 운영. 심혈관·소화기·항생제 강세 포트폴리오. ' +
      '8개 제품 중 Rosumeg·Atmeg 2건 Upgrade + 3건 Adjacent로 Tecnoquímicas와 유사한 매칭 패턴. ' +
      'LATAM 전역 유통망으로 파나마 거점 + 중남미 확장 시 전략적 파트너 가치.',
    qaDefensePoints: [
      'Q: Bagó LATAM 영향력? → A: 아르헨티나·우루과이·볼리비아 등 20+개국 유통망, Big 3 위상',
      'Q: 파나마 단독 매출? → A: 그룹 전체 ~$1bn+ 추정, 파나마 단독은 공개 제한',
    ],
    sources: [
      'MINSA 공식 라이선스 PDF',
      'Laboratorios Bagó 공식: https://www.bago.com',
    ],
  },

  // ==========================================================================
  // 15위 · PISA PANAMÁ · PSI 66.95
  // ==========================================================================
  {
    id: 'pisa',
    rank: 15,
    partnerName: 'PISA PANAMÁ, S.A.',
    groupName: 'Grupo PiSA Farmacéutica (멕시코)',
    countryCode: 'MX',
    countryName: '멕시코',
    address: 'Ciudad de Panamá (PiSA Panamá 법인)',
    phone: '+507 236-7070',
    email: 'contacto@pisa.com.mx',
    website: 'https://www.pisa.com.mx',
    minsaLicense: 'A/DNFD (Agencia)',
    operatingScope: 'Importación, Distribución y Venta al por Mayor de Medicamentos',
    revenueTier: 3,
    revenueScore: 85,
    pipelineAvgScore: 60,
    manufacturingScore: 60,
    importExperienceScore: 70,
    pharmacyChainScore: 0,
    basePSI: 66.95,
    keyPortfolio: '신장학 · Oncology · 병원 수액 · 특수의약품',
    recommendationReason: '멕시코 LATAM 병원 채널 강자 + Oncology 전문성 + Hydrine 인접 네트워크',

    oneLineIntro: '멕시코 병원 채널 강자, Oncology 전문',
    fiveFactorsDescription: {
      revenue: 'Tier 2 (PiSA 그룹 LATAM 병원 채널, 그룹 연매출 USD 5억 수준)',
      manufacturing: 'O (멕시코 본사 GMP 공장, 병원 수액 전문 생산)',
      pharmacyChain: 'X (약국 체인 미운영, 병원·특수 채널)',
      pipeline: 'Medium (Oncology·신장학·수액, Hydrine 1건 Upgrade)',
      importExperience: 'LATAM 병원 입찰·IMSS 유통 전문',
    },
    companyDescription:
      '- 멕시코 본사 LATAM 병원 채널 전문 제약, 신장학 특화\n' +
      '- Oncology(Hydroxyurea 인접)·병원 수액·특수의약품 주력\n' +
      '- 멕시코 IMSS·LATAM 병원 입찰 전문성 보유\n' +
      '- 파나마 CSS·MINSA 병원 조달 채널 유리, 외래 Rx는 제한적',

    productMatches: [
      { productId: 'rosumeg', productName: 'Rosumeg Combigel', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '심혈관 외래 Rx 미주력, 병원 채널 중심' },
      { productId: 'atmeg', productName: 'Atmeg Combigel', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: 'Atorvastatin 복합제 없음' },
      { productId: 'ciloduo', productName: 'Ciloduo', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '심혈관 외래 Rx 미주력' },
      { productId: 'gastiin', productName: 'Gastiin CR', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '소화기 외래 Rx 미주력' },
      { productId: 'omethyl', productName: 'Omethyl Cutielet', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: 'Rx 오메가-3 미취급' },
      { productId: 'sereterol', productName: 'Sereterol Activair', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '호흡기 DPI 없음' },
      { productId: 'gadvoa', productName: 'Gadvoa Inj.', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: '병원 주사제·진단 채널 보유. 조영제 유통 잠재력 존재' },
      { productId: 'hydrine', productName: 'Hydrine', conflictLevel: 'upgrade_opportunity', pipelineTier: 2,
        shortInsight: 'PISA Oncology 전문 + 병원 조달 채널. Hydroxyurea CML 치료제 직접 매칭' },
    ],
    strategicInsight:
      'Grupo PiSA Farmacéutica는 멕시코 본사의 LATAM 병원 채널 전문 제약. 신장학·Oncology·병원 수액 강세. ' +
      '파나마 PiSA Panamá 법인으로 병원·특수의약품 유통 주력. ' +
      'Hydrine(Hydroxyurea CML) 치료제 직접 매칭 가능. Gadvoa 조영제 병원 채널 잠재력. ' +
      '외래 Rx 복합제(Rosumeg·Atmeg 등)와는 채널 특성 상이로 매칭 제한적.',
    qaDefensePoints: [
      'Q: PISA 특성이 왜 Top 20? → A: Hydrine·Gadvoa 병원 채널 특수 제품에는 최적 파트너',
      'Q: 병원 채널 접근성? → A: 멕시코 IMSS·LATAM 병원 입찰 전문, 파나마 CSS·MINSA 병원 조달 유리',
    ],
    sources: [
      'MINSA 공식 라이선스 PDF',
      'Grupo PiSA 공식: https://www.pisa.com.mx',
    ],
  },

  // ==========================================================================
  // 11위 · BAXTER · PSI 71.4
  // ==========================================================================
  {
    id: 'baxter',
    rank: 11,
    partnerName: 'BAXTER DE PANAMÁ, S.A.',
    groupName: 'Baxter International Inc. (미국, 2025 Vantive 분사)',
    countryCode: 'US',
    countryName: '미국',
    address: 'Ciudad de Panamá (Baxter de Panamá 법인)',
    phone: '+507 265-9300',
    email: 'panama.medinfo@baxter.com',
    website: 'https://www.baxter.com',
    minsaLicense: 'A/DNFD (Agencia)',
    operatingScope: 'Importación, Distribución y Venta al por Mayor de Medicamentos y Dispositivos Médicos',
    revenueTier: 2,
    revenueScore: 100,
    pipelineAvgScore: 50,
    manufacturingScore: 70,
    importExperienceScore: 70,
    pharmacyChainScore: 0,
    basePSI: 71.4,
    keyPortfolio: '병원 수액 · 신장 투석 · 마취 · 생체학적 제품',
    recommendationReason: '미국 의료기기·병원 수액 글로벌 + 2025 Vantive 분사 후 포트폴리오 재편 + 병원 채널 강자',

    oneLineIntro: '미국 병원 수액·의료기기 글로벌',
    fiveFactorsDescription: {
      revenue: 'Tier 1 (Baxter 그룹 연매출 USD 150억+, 병원 수액 글로벌 Top)',
      manufacturing: 'O (미국·유럽 GMP 공장 + 수액·의료기기 전용 시설)',
      pharmacyChain: 'X (약국 체인 미운영, 병원·의료기관 중심)',
      pipeline: 'Low (수액·의료기기 중심, Gadvoa 1건 Adjacent)',
      importExperience: '파나마 Baxter 법인 + 2025 Vantive 분사 포트폴리오 재편',
    },
    companyDescription:
      '- 미국 일리노이 본사 병원 수액·의료기기 글로벌, 2024 매출 $15bn+\n' +
      '- 2025년 Vantive(신장 투석) 분사로 포트폴리오 재편 중\n' +
      '- 파나마 Baxter de Panamá 법인 운영, 병원·의료기관 채널\n' +
      '- 외래 Rx 정제 제형보다 병원 주사제·조영제 유통 가능',

    productMatches: [
      { productId: 'rosumeg', productName: 'Rosumeg Combigel', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '외래 Rx 정제 제형 미주력' },
      { productId: 'atmeg', productName: 'Atmeg Combigel', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: 'Atorvastatin 복합제 없음' },
      { productId: 'ciloduo', productName: 'Ciloduo', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '외래 심혈관 미주력' },
      { productId: 'gastiin', productName: 'Gastiin CR', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '소화기 Rx 미주력' },
      { productId: 'omethyl', productName: 'Omethyl Cutielet', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: 'Rx 오메가-3 미취급' },
      { productId: 'sereterol', productName: 'Sereterol Activair', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '호흡기 DPI 없음' },
      { productId: 'gadvoa', productName: 'Gadvoa Inj.', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: '병원 주사제·영상진단 실 취급 채널 보유' },
      { productId: 'hydrine', productName: 'Hydrine', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '항암 외래 Rx 미주력' },
    ],
    strategicInsight:
      'Baxter International Inc.는 미국 일리노이 본사의 병원 수액·의료기기 글로벌. 2024 매출 $15bn+. ' +
      '2025년 Vantive(신장 투석) 분사로 포트폴리오 재편 중. 파나마 Baxter de Panamá 법인 운영. ' +
      '외래 Rx 정제 제형과는 채널 특성 상이. Gadvoa 병원 조영제 유통 잠재력 있음. ' +
      '의료기기·수액 중심 포지셔닝으로 우리 제네릭 제품 라인과 매칭 제한적.',
    qaDefensePoints: [
      'Q: Baxter가 왜 Top 20? → A: 병원 채널 전문성으로 Gadvoa 조영제 등 특수 영역 파트너 가능성',
      'Q: Vantive 분사 영향? → A: 신장 투석 사업 별도 법인화, Baxter 본체는 수액·마취·생체 집중',
    ],
    sources: [
      'MINSA 공식 라이선스 PDF',
      'Baxter 2024 Annual Report: https://www.baxter.com',
    ],
  },

  // ==========================================================================
  // 19위 · AGENCIAS MOTTA · PSI 56.35
  // ==========================================================================
  {
    id: 'agencias-motta',
    rank: 19,
    partnerName: 'AGENCIAS MOTTA INTERNACIONAL, S.A.',
    groupName: 'Grupo Motta (파나마)',
    countryCode: 'PA',
    countryName: '파나마',
    address: 'Ciudad de Panamá · Costa del Este',
    phone: '+507 301-8000',
    email: 'info@agenciasmotta.com',
    website: 'https://www.agenciasmotta.com',
    minsaLicense: 'A/DNFD (Agencia)',
    operatingScope: 'Importación, Distribución y Venta al por Mayor de Medicamentos, Productos de Consumo',
    revenueTier: 2,
    revenueScore: 85,
    pipelineAvgScore: 50,
    manufacturingScore: 0,
    importExperienceScore: 80,
    pharmacyChainScore: 60,
    basePSI: 56.35,
    keyPortfolio: '파나마 대형 소비재 · 약국·슈퍼마켓 유통 채널',
    recommendationReason: '파나마 Grupo Motta 계열 대형 유통 + 약국·슈퍼마켓 채널 + OTC·소비재 강점',

    oneLineIntro: '파나마 Grupo Motta, 약국·슈퍼마켓 유통',
    fiveFactorsDescription: {
      revenue: 'Tier 2 (Grupo Motta 계열 대형 유통, 파나마 주요 그룹 추정 USD 3억+)',
      manufacturing: 'X (제조 시설 미보유, 순수 유통 전문)',
      pharmacyChain: 'O (약국·슈퍼마켓·대형마트 소비재 채널 60점)',
      pipeline: 'Low (소비재·OTC 중심, Rx 복합제 전문성 제한)',
      importExperience: '파나마 로컬 대형 유통망 수십 년 운영',
    },
    companyDescription:
      '- 파나마 대형 가족 그룹 Grupo Motta 계열 유통 전문\n' +
      '- 약국·슈퍼마켓·대형마트 소비재 채널 강자\n' +
      '- OTC·소비재 중심, Rosumeg·Omethyl 소매 확장에 가치\n' +
      '- MINSA A/DNFD 정식 라이선스 보유, Rx 유통 자격 확보',

    productMatches: [
      { productId: 'rosumeg', productName: 'Rosumeg Combigel', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: '약국 채널 접근 가능. Rx 심혈관 전문 네트워크는 제한적' },
      { productId: 'atmeg', productName: 'Atmeg Combigel', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: '일반 소비재 유통 강점, Rx 복합제는 별도 전문 채널 필요' },
      { productId: 'ciloduo', productName: 'Ciloduo', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '심혈관·항혈전 전문 네트워크 없음' },
      { productId: 'gastiin', productName: 'Gastiin CR', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: '소화기 OTC 라인과 인접, Rx Mosapride CR 신규' },
      { productId: 'omethyl', productName: 'Omethyl Cutielet', conflictLevel: 'adjacent_category', pipelineTier: 3,
        shortInsight: '약국·슈퍼마켓 오메가-3 OTC 유통 가능, Rx 오메가-3는 신규' },
      { productId: 'sereterol', productName: 'Sereterol Activair', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '호흡기 DPI 전문 없음' },
      { productId: 'gadvoa', productName: 'Gadvoa Inj.', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '조영제 사업 없음' },
      { productId: 'hydrine', productName: 'Hydrine', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '항암 병원 채널 없음' },
    ],
    strategicInsight:
      'Agencias Motta Internacional은 파나마 대형 가족 그룹 Grupo Motta 계열 유통 전문. ' +
      '약국·슈퍼마켓·대형마트 소비재 채널 강자. 파나마 로컬 대형 유통망 보유. ' +
      '소비재·OTC 중심 포지셔닝으로 Rosumeg·Omethyl 등 소매 확장 가능 제품에 가치. ' +
      '의료기관 Rx 전문 채널은 제한적, 처방 중심 제품에는 부적합.',
    qaDefensePoints: [
      'Q: 소비재 유통사를 의약품에? → A: MINSA A/DNFD 정식 보유, OTC·약국 채널 Rx 유통 가능',
      'Q: 약국체인 60점 근거? → A: 약국·슈퍼마켓 네트워크 계열 내 접근성 반영',
    ],
    sources: [
      'MINSA 공식 라이선스 PDF',
      'Agencias Motta 공식: https://www.agenciasmotta.com',
    ],
  },

  // ==========================================================================
  // 19위 · SEQUISA · PSI 36.6
  // ==========================================================================
  {
    id: 'sequisa',
    rank: 20,
    partnerName: 'SEQUISA FARMACÉUTICA, S.A.',
    groupName: null,
    countryCode: 'PA',
    countryName: '파나마',
    address: 'Ciudad de Panamá (Sequisa 본사)',
    phone: '+507 261-1234',
    email: 'info@sequisa.com.pa',
    website: 'https://www.panadata.net/organizaciones/?q=sequisa',
    minsaLicense: 'A/DNFD (Agencia)',
    operatingScope: 'Importación, Distribución y Venta al por Mayor de Medicamentos',
    revenueTier: 4,
    revenueScore: 30,
    pipelineAvgScore: 45,
    manufacturingScore: 0,
    importExperienceScore: 60,
    pharmacyChainScore: 0,
    basePSI: 30.3,
    keyPortfolio: '파나마 로컬 소형 유통',
    recommendationReason: '파나마 로컬 소형 유통사 + 기본 라이선스 보유 + 전문 포트폴리오·규모 제한적',

    oneLineIntro: '파나마 로컬 소형 유통, 보조 파트너군',
    fiveFactorsDescription: {
      revenue: 'Tier 5 (파나마 로컬 중소, 매출 규모 USD 1천만 미만 추정)',
      manufacturing: 'X (제조 시설 미보유)',
      pharmacyChain: 'X (약국 체인 미운영)',
      pipeline: 'Low (전문 포트폴리오 제한, 일반 제네릭 유통)',
      importExperience: '파나마 로컬 중소 유통, MINSA 정식 라이선스 보유',
    },
    companyDescription:
      '- 파나마 로컬 중소 유통사, 매출 규모·전문성 중하위권\n' +
      '- MINSA A/DNFD 정식 라이선스 보유, 기본 Rx 유통 자격\n' +
      '- 전문 포트폴리오·특수 채널 구축 제한적\n' +
      '- 보조 파트너 또는 파이프라인 다변화 2선 후보',

    productMatches: [
      { productId: 'rosumeg', productName: 'Rosumeg Combigel', conflictLevel: 'adjacent_category', pipelineTier: 4,
        shortInsight: '로컬 일반 유통 가능, 전문 마케팅 역량 제한' },
      { productId: 'atmeg', productName: 'Atmeg Combigel', conflictLevel: 'adjacent_category', pipelineTier: 4,
        shortInsight: '일반 스타틴 유통 가능' },
      { productId: 'ciloduo', productName: 'Ciloduo', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '전문 심혈관 채널 없음' },
      { productId: 'gastiin', productName: 'Gastiin CR', conflictLevel: 'adjacent_category', pipelineTier: 4,
        shortInsight: '일반 소화기 유통 가능' },
      { productId: 'omethyl', productName: 'Omethyl Cutielet', conflictLevel: 'adjacent_category', pipelineTier: 4,
        shortInsight: '일반 유통 가능, 전문 Rx 오메가-3 프로모션 제한적' },
      { productId: 'sereterol', productName: 'Sereterol Activair', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '호흡기 DPI 특수 교육 없음' },
      { productId: 'gadvoa', productName: 'Gadvoa Inj.', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '조영제 병원 채널 없음' },
      { productId: 'hydrine', productName: 'Hydrine', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '항암 전문 없음' },
    ],
    strategicInsight:
      'Sequisa Farmacéutica는 파나마 로컬 소형 유통사로 매출 규모·전문성 모두 중하위권. ' +
      'MINSA 정식 라이선스는 보유하나 전문 포트폴리오·특수 채널 구축 제한적. ' +
      '보조 파트너 또는 파이프라인 다변화 목적 2선 파트너 후보로 고려 가능. ' +
      '자체 마케팅 역량 제한으로 우리 측 영업 지원 부담 큰 구조.',
    qaDefensePoints: [
      'Q: Sequisa를 왜 Top 20에? → A: 파나마 정식 라이선스 보유 중소 유통사, 보조 파트너 후보군 포함',
      'Q: 실제 선택 가능성? → A: 1~15위 우선, 공백 영역 보완용 간접 후보',
    ],
    sources: [
      'MINSA 공식 라이선스 PDF',
      'Panadata 프로필: https://www.panadata.net',
    ],
  },

  // ==========================================================================
  // 18위 · GUERBET · PSI 58.15
  // ==========================================================================
  {
    id: 'guerbet',
    rank: 18,
    partnerName: 'GUERBET LATAM (파나마 유통 대리점 경유)',
    groupName: 'Guerbet Group (프랑스)',
    countryCode: 'FR',
    countryName: '프랑스',
    address: 'Ciudad de Panamá (유통 대리점 경유, 직접 법인 여부 제한)',
    phone: null,
    email: 'latam.info@guerbet.com',
    website: 'https://www.guerbet.com',
    minsaLicense: '대리점 A/DNFD 경유',
    operatingScope: 'Distribución de Medios de Contraste para Diagnóstico por Imagen',
    revenueTier: 3,
    revenueScore: 85,
    pipelineAvgScore: 40,
    manufacturingScore: 50,
    importExperienceScore: 60,
    pharmacyChainScore: 0,
    basePSI: 58.15,
    keyPortfolio: 'MRI · CT 조영제 전문',
    recommendationReason: '프랑스 조영제 글로벌 전문 + Gadvoa Direct Competition (Gadobutrol 카테고리 경쟁)',

    oneLineIntro: '프랑스 조영제 전문, Gadvoa 경쟁사',
    fiveFactorsDescription: {
      revenue: 'Tier 2 (Guerbet 그룹 연매출 USD 8.6억+, 조영제 글로벌 Top 3)',
      manufacturing: 'O (프랑스 본사 조영제 전용 GMP 공장)',
      pharmacyChain: 'X (약국 체인 미운영, 병원 조영제 전문)',
      pipeline: 'Low (조영제 단일 카테고리, Gadvoa Direct Competition)',
      importExperience: '파나마 유통 대리점 경유 구조, 직접 법인 제한',
    },
    companyDescription:
      '- 프랑스 본사 조영제 전문 글로벌 제약, MRI·CT 조영제 Top 3\n' +
      '- Dotarem·Clariscan 등 Gd 조영제 주력, Gadvoa와 직접 경쟁\n' +
      '- 파나마 시장은 유통 대리점 경유 구조 추정\n' +
      '- 파트너 후보 아닌 시장 포지셔닝 분석 참조군 용도',

    productMatches: [
      { productId: 'rosumeg', productName: 'Rosumeg Combigel', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '심혈관 Rx 미취급' },
      { productId: 'atmeg', productName: 'Atmeg Combigel', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '스타틴 복합제 미취급' },
      { productId: 'ciloduo', productName: 'Ciloduo', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '심혈관·항혈전 미취급' },
      { productId: 'gastiin', productName: 'Gastiin CR', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '소화기 Rx 미취급' },
      { productId: 'omethyl', productName: 'Omethyl Cutielet', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: 'Rx 오메가-3 미취급' },
      { productId: 'sereterol', productName: 'Sereterol Activair', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '호흡기 DPI 미취급' },
      { productId: 'gadvoa', productName: 'Gadvoa Inj.', conflictLevel: 'direct_competition', pipelineTier: 1,
        shortInsight: 'Guerbet Dotarem/Clariscan 등 Gd 조영제 글로벌 전문. Gadvoa와 직접 경쟁' },
      { productId: 'hydrine', productName: 'Hydrine', conflictLevel: 'none', pipelineTier: 5,
        shortInsight: '항암 사업 없음' },
    ],
    strategicInsight:
      'Guerbet Group은 프랑스 본사의 조영제 전문 글로벌 제약. MRI·CT 조영제 Dotarem·Clariscan 주력. ' +
      '파나마 시장은 직접 법인보다 유통 대리점 경유 구조 추정. ' +
      'Gadvoa(Gadobutrol)는 Guerbet 조영제 라인과 동일 카테고리 Direct Competition. ' +
      '우리 관점에서는 경쟁사이므로 파트너 부적합, 시장 분석 참조군으로 활용.',
    qaDefensePoints: [
      'Q: Guerbet을 왜 Top 20 포함? → A: 조영제 시장 경쟁 구조 이해 + 파나마 조영제 유통 채널 파악 목적',
      'Q: Gadvoa와 직접 경쟁이면 제외? → A: 파트너 후보로는 제외, 시장 포지셔닝 분석 참조군 용도',
    ],
    sources: [
      'MINSA 공식 라이선스 PDF',
      'Guerbet 공식: https://www.guerbet.com',
    ],
  },

];

// ============================================================================
// 헬퍼 함수
// ============================================================================

export function getPartnerById(id: string): Partner | undefined {
  return PARTNERS.find((p) => p.id === id);
}

export function getPartnerByRank(rank: number): Partner | undefined {
  return PARTNERS.find((p) => p.rank === rank);
}

export function getTop5Partners(): Partner[] {
  return PARTNERS.filter((p) => p.rank <= 5);
}

export function getTop10Partners(): Partner[] {
  return PARTNERS.filter((p) => p.rank <= 10);
}

export function getPartnersByConflictLevel(
  productId: ProductId,
  level: ConflictLevel,
): Partner[] {
  return PARTNERS.filter((p) =>
    p.productMatches.some(
      (m) => m.productId === productId && m.conflictLevel === level,
    ),
  );
}