/**
 * datos.gov.co Socrata 3t73-n4q9 — 키워드 블록(검색·적재 공용)
 */

export type ColombiaSocrataBlock = {
  readonly label: string;
  readonly keywords: readonly string[];
};

export const COLOMBIA_SOCRATA_BLOCKS: readonly ColombiaSocrataBlock[] = [
  {
    label: "Rosumeg",
    keywords: [
      "rosuvastatina",
      "atorvastatina",
      "simvastatina",
      "omega-3",
      "acido omega",
      "ezetimiba",
    ],
  },
  {
    label: "Omethyl",
    keywords: ["omega-3", "ácidos omega", "omacor", "lovaza", "vascepa"],
  },
  {
    label: "Atmeg",
    keywords: ["atorvastatina", "rosuvastatina", "omega-3"],
  },
  {
    label: "Ciloduo",
    keywords: ["cilostazol", "clopidogrel", "aspirina", "antiplaquetario"],
  },
  {
    label: "Gastiin CR",
    keywords: [
      "mosaprida",
      "mosapride",
      "itoprida",
      "domperidona",
      "metoclopramida",
    ],
  },
  {
    label: "Sereterol",
    keywords: [
      "salmeterol",
      "fluticasona",
      "budesonida",
      "formoterol",
      "inhalador",
    ],
  },
  {
    label: "Gadvoa",
    keywords: [
      "gadobutrol",
      "gadopentetato",
      "gadoterato",
      "medio de contraste",
    ],
  },
  {
    label: "Hydrine",
    keywords: ["hidroxiurea", "hidroxicarbamida", "hydroxyurea"],
  },
] as const;
