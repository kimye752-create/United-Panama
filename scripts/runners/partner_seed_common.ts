/// <reference types="node" />

import { readFileSync } from "node:fs";
import path from "node:path";
import { z, type ZodType } from "zod";

import { getSupabaseClient } from "@/src/utils/db_connector";

const PANAMA_PARTNER_TABLE = "panama_partner_candidates";

export const nullableString = z.string().trim().min(1).nullable().or(z.literal("").transform(() => null));
export const optionalNullableString = nullableString.optional().transform((value) => value ?? null);
export const optionalNullableNumber = z.number().finite().nullable().optional().transform((value) => value ?? null);

export const optionalNullableInteger = z
  .number()
  .int()
  .nullable()
  .optional()
  .transform((value) => value ?? null);

export function normalizeCompanyName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

export function parseSeedJson<T>(
  fileRelativePath: string,
  schema: ZodType<T>,
): T[] {
  const filePath = path.resolve(process.cwd(), fileRelativePath);
  const raw = readFileSync(filePath, "utf-8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`JSON 파싱 실패(${fileRelativePath}): ${message}`);
  }
  const arraySchema = z.array(schema);
  const result = arraySchema.safeParse(parsed);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")} - ${issue.message}`)
      .join("; ");
    throw new Error(`스키마 검증 실패(${fileRelativePath}): ${details}`);
  }
  return result.data;
}

export function composeAddress(
  address: string | null,
  city: string | null,
): string | null {
  if (address !== null && city !== null) {
    if (address.toLowerCase().includes(city.toLowerCase())) {
      return address;
    }
    return `${address}, ${city}`;
  }
  if (address !== null) {
    return address;
  }
  if (city !== null) {
    return city;
  }
  return null;
}

function mergeSources(
  existingPrimary: string | null,
  existingSecondary: string[] | null,
  incomingSource: string,
): string[] {
  const set = new Set<string>();
  if (existingPrimary !== null && existingPrimary.trim() !== "") {
    set.add(existingPrimary.trim());
  }
  for (const source of existingSecondary ?? []) {
    if (typeof source === "string" && source.trim() !== "") {
      set.add(source.trim());
    }
  }
  set.add(incomingSource);
  return [...set];
}

export interface PartnerUpsertMappedRow {
  company_name: string;
  company_name_normalized: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  revenue_usd: number | null;
  employee_count: number | null;
  founded_year: number | null;
}

interface ExistingPartnerRow {
  id: string;
  source_primary: string | null;
  source_secondary: string[] | null;
}

export async function upsertPartnerRows(
  sourceName: string,
  rows: PartnerUpsertMappedRow[],
): Promise<{ inserted: number; updated: number; total: number }> {
  const sb = getSupabaseClient();
  let inserted = 0;
  let updated = 0;
  const now = new Date().toISOString();

  for (const row of rows) {
    const existingQuery = await sb
      .from(PANAMA_PARTNER_TABLE)
      .select("id, source_primary, source_secondary")
      .eq("company_name_normalized", row.company_name_normalized)
      .maybeSingle();

    if (existingQuery.error !== null) {
      throw new Error(`기존 데이터 조회 실패(${row.company_name}): ${existingQuery.error.message}`);
    }

    const existing = existingQuery.data as ExistingPartnerRow | null;
    if (existing === null) {
      const insertPayload = {
        ...row,
        source_primary: sourceName,
        source_secondary: [sourceName],
        collected_primary_at: now,
        updated_at: now,
      };
      const insertRes = await sb.from(PANAMA_PARTNER_TABLE).insert(insertPayload);
      if (insertRes.error !== null) {
        throw new Error(`INSERT 실패(${row.company_name}): ${insertRes.error.message}`);
      }
      inserted += 1;
      continue;
    }

    const nextSources = mergeSources(
      existing.source_primary,
      existing.source_secondary,
      sourceName,
    );
    const updatePayload = {
      ...row,
      source_secondary: nextSources,
      updated_at: now,
    };
    const updateRes = await sb
      .from(PANAMA_PARTNER_TABLE)
      .update(updatePayload)
      .eq("id", existing.id);
    if (updateRes.error !== null) {
      throw new Error(`UPDATE 실패(${row.company_name}): ${updateRes.error.message}`);
    }
    updated += 1;
  }

  return {
    inserted,
    updated,
    total: rows.length,
  };
}

