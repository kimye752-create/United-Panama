/**
 * 기법 ⑤ XGrammar — JSON 필드 검증(Skeleton)
 *
 * 실제 토큰 레벨 constrained decoding은 Anthropic API 지원 시점에 활성화.
 * 현재 구현은 포스트 파싱 검증 수준. TECHNIQUES_STATUS.md Skeleton 분류 유지.
 */
/// <reference types="node" />

import { getEbnfSchema, type EbnfSchemaKind } from "./ebnf_schemas.js";

export interface XGrammarValidationResult {
  valid: boolean;
  errors: string[];
  parsedJson: unknown | null;
}

/**
 * JSON 문자열 파싱 후 최상위 키에 requiredFields가 모두 존재하는지 검사.
 */
export function validateJsonAgainstSchema(
  jsonString: string,
  requiredFields: readonly string[],
): XGrammarValidationResult {
  const errors: string[] = [];
  let parsedJson: unknown | null = null;

  try {
    parsedJson = JSON.parse(jsonString) as unknown;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    errors.push(`JSON 파싱 실패: ${msg}`);
    return { valid: false, errors, parsedJson: null };
  }

  if (parsedJson === null || typeof parsedJson !== "object" || Array.isArray(parsedJson)) {
    errors.push("최상위 값은 객체여야 합니다.");
    return { valid: false, errors, parsedJson };
  }

  const obj = parsedJson as Record<string, unknown>;
  for (const field of requiredFields) {
    if (!(field in obj)) {
      errors.push(`필수 필드 누락: ${field}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    parsedJson,
  };
}

/**
 * `getEbnfSchema`의 requiredFields로 LLM 출력 문자열을 검증.
 */
export function enforceXGrammar(
  llmOutput: string,
  schemaName: EbnfSchemaKind,
): XGrammarValidationResult {
  const def = getEbnfSchema(schemaName);
  const fields = def.requiredFields as readonly string[];
  return validateJsonAgainstSchema(llmOutput, fields);
}
