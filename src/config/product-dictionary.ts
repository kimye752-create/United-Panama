// src/config/product-dictionary.ts
// 한국유나이티드제약 8종 자사 제품 ↔ 파나마 INN 검색 딕셔너리
// 크롤러가 MINSA/PanamaCompra/Arrocha/Metro Plus에서 검색할 때 사용
// 한국 브랜드명 대신 INN(Principio Activo) 스페인어 표기를 검색 키로 사용
// ⚠ 킥오프 미팅 후 기업 담당자 확정값으로 보정 예정

export interface PanamaProduct {
    readonly productId: string;           // Supabase UUID (고정)
    readonly koreanName: string;          // 한국 브랜드명
    readonly category: ProductCategory;   // 제품군
    readonly innEs: string;               // 스페인어 INN (Principio Activo) — 검색 키
    readonly innEn: string;               // 영문 INN (PubMed 검색용)
    readonly competitorBrands: readonly string[];  // 파나마 현지 경쟁 브랜드
    readonly therapeuticArea: string;
  }
  
  export type ProductCategory =
    | "oncology"        // 항암제
    | "lipid"           // 고지혈증
    | "antiplatelet"    // 항혈전제
    | "gi_motility"     // 위장관운동촉진
    | "nsaid"           // 소염진통제
    | "ppi"             // 위궤양(PPI)
    | "mucolytic";      // 진해거담제
  
  export const PANAMA_INN_DICTIONARY: readonly PanamaProduct[] = [
    {
      productId: "uuid-pa-001",
      koreanName: "오메틸큐티렛",
      category: "lipid",
      innEs: "Esteres Etilicos de Acidos Grasos Omega 3",
      innEn: "Omega-3 Ethyl Esters",
      competitorBrands: ["Omacor", "Cardionol"],
      therapeuticArea: "고지혈증 (Hipertrigliceridemia)",
    },
    {
      productId: "uuid-pa-002",
      koreanName: "하이드린",
      category: "oncology",
      innEs: "Hidroxiurea",
      innEn: "Hydroxyurea",
      competitorBrands: ["Hydrea", "Onco-Carbide"],
      therapeuticArea: "항암제 — 만성골수성백혈병(CML), 본태성 혈소판증가증",
    },
    {
      productId: "uuid-pa-003",
      koreanName: "실로스탄CR",
      category: "antiplatelet",
      innEs: "Cilostazol",
      innEn: "Cilostazol",
      competitorBrands: ["Pletaal", "Claudicat"],
      therapeuticArea: "항혈전제 — 간헐성 파행증",
    },
    {
      productId: "uuid-pa-004",
      koreanName: "가우스CR",
      category: "gi_motility",
      innEs: "Itoprida",
      innEn: "Itopride",
      competitorBrands: ["Ganaton", "Itoprid"],
      therapeuticArea: "위장관운동촉진제 — 기능성 소화불량",
    },
    {
      productId: "uuid-pa-005",
      koreanName: "칼맥CR",
      category: "nsaid",
      innEs: "Aceclofenaco",
      innEn: "Aceclofenac",
      competitorBrands: ["Bristaflam", "Airtal"],
      therapeuticArea: "소염진통제 — 관절염, 통증",
    },
    {
      productId: "uuid-pa-006",
      koreanName: "라베프롤",
      category: "ppi",
      innEs: "Rabeprazol",
      innEn: "Rabeprazole",
      competitorBrands: ["Pariet", "Aciphex"],
      therapeuticArea: "위궤양 치료제 — PPI",
    },
    {
      productId: "uuid-pa-007",
      koreanName: "에르도스",
      category: "mucolytic",
      innEs: "Erdosteina",
      innEn: "Erdosteine",
      competitorBrands: ["Mucotec", "Dostin"],
      therapeuticArea: "진해거담제 — 만성기관지염",
    },
    {
      productId: "uuid-pa-008",
      koreanName: "클란자CR",
      category: "nsaid",
      innEs: "Aceclofenaco",
      innEn: "Aceclofenac",
      competitorBrands: ["Bristaflam SR"],
      therapeuticArea: "소염진통제 — 서방형 복합제",
    },
  ] as const;
  
  // INN 스페인어 표기로 제품 조회
  export function findProductByInn(innEs: string): PanamaProduct | undefined {
    const normalized = innEs.trim().toLowerCase();
    return PANAMA_INN_DICTIONARY.find(
      (p) => p.innEs.toLowerCase() === normalized
    );
  }
  
  // productId로 제품 조회
  export function findProductById(productId: string): PanamaProduct | undefined {
    return PANAMA_INN_DICTIONARY.find((p) => p.productId === productId);
  }
  
  // 경쟁 브랜드명으로 자사 제품 역매핑 (ComEM 매칭 지원)
  export function findProductByCompetitorBrand(
    brandName: string
  ): PanamaProduct | undefined {
    const normalized = brandName.trim().toLowerCase();
    return PANAMA_INN_DICTIONARY.find((p) =>
      p.competitorBrands.some((b) => b.toLowerCase() === normalized)
    );
  }
  
  // 모든 INN 스페인어 표기 배열 (크롤러 루프용)
  export function getAllInnEs(): readonly string[] {
    return PANAMA_INN_DICTIONARY.map((p) => p.innEs);
  }
  
  // 카테고리별 필터링
  export function findProductsByCategory(
    category: ProductCategory
  ): readonly PanamaProduct[] {
    return PANAMA_INN_DICTIONARY.filter((p) => p.category === category);
  }