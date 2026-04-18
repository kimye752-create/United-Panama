/// <reference types="node" />

import { z } from "zod";

import {
  composeAddress,
  normalizeCompanyName,
  optionalNullableNumber,
  optionalNullableString,
  parseSeedJson,
  upsertPartnerRows,
} from "./partner_seed_common";

const SOURCE_NAME = "dnb_panama";
const DATA_PATH = "scripts/data/partners_dnb.json";

const DnbRowSchema = z.object({
  company_name: z.string().trim().min(1),
  company_type: optionalNullableString,
  phone: optionalNullableString,
  email: optionalNullableString,
  website: optionalNullableString,
  address: optionalNullableString,
  city: optionalNullableString,
  country: optionalNullableString,
  business_description: optionalNullableString,
  notes: optionalNullableString,
  revenue_usd: optionalNullableNumber,
  employee_count: optionalNullableNumber,
  year_established: optionalNullableNumber,
});

type DnbRow = z.infer<typeof DnbRowSchema>;

async function main(): Promise<void> {
  const rows = parseSeedJson<DnbRow>(DATA_PATH, DnbRowSchema).map((row) => ({
    company_name: row.company_name,
    company_name_normalized: normalizeCompanyName(row.company_name),
    phone: row.phone,
    email: row.email,
    website: row.website,
    address: composeAddress(row.address, row.city),
    revenue_usd: row.revenue_usd,
    employee_count:
      row.employee_count === null ? null : Math.trunc(row.employee_count),
    founded_year:
      row.year_established === null ? null : Math.trunc(row.year_established),
  }));
  const result = await upsertPartnerRows(SOURCE_NAME, rows);
  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        source: SOURCE_NAME,
        file: DATA_PATH,
        total: result.total,
        inserted: result.inserted,
        updated: result.updated,
      },
      null,
      2,
    ) + "\n",
  );
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[seed_partners_dnb] ${message}\n`);
  process.exit(1);
});

