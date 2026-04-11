/**
 * ebnf_schemas.ts — 기법 ⑨ EBNF Constrained Extraction
 *
 * LLM 응답을 EBNF 문법 규칙으로 제약하여 필드 누락·타입 오류를 토큰 레벨에서 차단.
 * Anthropic Claude API의 constrained decoding 옵션과 연동 예정.
 *
 * 3종 스키마:
 *  1. PRODUCT_SCHEMA_EBNF  — 의약품 가격 추출 (입찰·소매·도매 공통)
 *  2. MACRO_SCHEMA_EBNF    — 거시 지표 추출 (GDP·인구·보건지출)
 *  3. TENDER_SCHEMA_EBNF   — 공공조달 입찰 추출 (PanamaCompra OCDS 전용)
 */

export interface EbnfSchemaDefinition {
  name: string;
  description: string;
  ebnf: string;
  requiredFields: readonly string[];
}

/** 스키마 1: 의약품 가격 */
export const PRODUCT_SCHEMA_EBNF: EbnfSchemaDefinition = {
  name: "product_price",
  description: "의약품 가격 추출 (입찰가 / 소매가 / 도매가 공통)",
  ebnf: `
root       ::= "{" ws field ("," ws field)* ws "}"
field      ::= product_name | ingredient | price | currency | source_url | price_type
product_name ::= "\\"product_name\\"" ws ":" ws string
ingredient ::= "\\"ingredient_inn\\"" ws ":" ws string
price      ::= "\\"price_usd\\"" ws ":" ws number
currency   ::= "\\"currency\\"" ws ":" ws "\\"USD\\""
source_url ::= "\\"source_url\\"" ws ":" ws string
price_type ::= "\\"price_type\\"" ws ":" ws ("\\"tender_award\\"" | "\\"retail_normal\\"" | "\\"retail_promo\\"" | "\\"regulated\\"" | "\\"wholesale\\"")
string     ::= "\\"" ([^"\\\\] | "\\\\" .)* "\\""
number     ::= "-"? [0-9]+ ("." [0-9]+)?
ws         ::= [ \\t\\n]*
`.trim(),
  requiredFields: [
    "product_name",
    "ingredient_inn",
    "price_usd",
    "currency",
    "source_url",
    "price_type",
  ] as const,
};

/** 스키마 2: 거시 지표 */
export const MACRO_SCHEMA_EBNF: EbnfSchemaDefinition = {
  name: "macro_indicator",
  description: "거시 지표 추출 (GDP·인구·보건지출 등)",
  ebnf: `
root        ::= "{" ws field ("," ws field)* ws "}"
field       ::= indicator | value | unit | year | source_url
indicator   ::= "\\"indicator_name\\"" ws ":" ws string
value       ::= "\\"value\\"" ws ":" ws number
unit        ::= "\\"unit\\"" ws ":" ws string
year        ::= "\\"year\\"" ws ":" ws [0-9] [0-9] [0-9] [0-9]
source_url  ::= "\\"source_url\\"" ws ":" ws string
string      ::= "\\"" ([^"\\\\] | "\\\\" .)* "\\""
number      ::= "-"? [0-9]+ ("." [0-9]+)?
ws          ::= [ \\t\\n]*
`.trim(),
  requiredFields: [
    "indicator_name",
    "value",
    "unit",
    "year",
    "source_url",
  ] as const,
};

/** 스키마 3: 공공조달 입찰 (PanamaCompra OCDS) */
export const TENDER_SCHEMA_EBNF: EbnfSchemaDefinition = {
  name: "tender_award",
  description: "공공조달 입찰 추출 (PanamaCompra OCDS API 전용)",
  ebnf: `
root          ::= "{" ws field ("," ws field)* ws "}"
field         ::= tender_id | supplier | amount | currency | award_date | item_desc | source_url
tender_id     ::= "\\"tender_id\\"" ws ":" ws string
supplier      ::= "\\"supplier_name\\"" ws ":" ws string
amount        ::= "\\"award_amount\\"" ws ":" ws number
currency      ::= "\\"currency\\"" ws ":" ws "\\"USD\\""
award_date    ::= "\\"award_date\\"" ws ":" ws string
item_desc     ::= "\\"item_description\\"" ws ":" ws string
source_url    ::= "\\"source_url\\"" ws ":" ws string
string        ::= "\\"" ([^"\\\\] | "\\\\" .)* "\\""
number        ::= "-"? [0-9]+ ("." [0-9]+)?
ws            ::= [ \\t\\n]*
`.trim(),
  requiredFields: [
    "tender_id",
    "supplier_name",
    "award_amount",
    "currency",
    "award_date",
    "item_description",
    "source_url",
  ] as const,
};

export type EbnfSchemaKind = "product" | "macro" | "tender";

/** 스키마 이름으로 정의 조회 */
export function getEbnfSchema(name: EbnfSchemaKind): EbnfSchemaDefinition {
  switch (name) {
    case "product":
      return PRODUCT_SCHEMA_EBNF;
    case "macro":
      return MACRO_SCHEMA_EBNF;
    case "tender":
      return TENDER_SCHEMA_EBNF;
    default: {
      const _exhaustive: never = name;
      return _exhaustive;
    }
  }
}
