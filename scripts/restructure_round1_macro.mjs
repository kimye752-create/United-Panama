/**
 * round1_macro.json 배열(4요소) → 3파일 재구조화 (인덱스·키 검증만, 추론 금지)
 */
import { readFile, writeFile, copyFile, access, constants } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const PATHS = {
  archive: join(
    ROOT,
    "data",
    "seed",
    "panama",
    "archive",
    "gemini_round1_full_bundle_2026-04-10.json",
  ),
  round1: join(ROOT, "data", "seed", "panama", "round1_macro.json"),
  round2: join(ROOT, "data", "seed", "panama", "round2_eml.json"),
  round3: join(ROOT, "data", "seed", "panama", "round3_market_intel.json"),
};

const KEYS_MARKET_INTEL = [
  "pricing_data",
  "competitors",
  "distributors",
  "infrastructure",
  "regulatory_costs",
  "epidemiology",
];

function assert(cond, msg) {
  if (!cond) {
    throw new Error(msg);
  }
}

async function fileExists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

// Step 1
let archiveCreated = false;
if (!(await fileExists(PATHS.archive))) {
  await copyFile(PATHS.round1, PATHS.archive);
  archiveCreated = true;
}

// Step 2
const raw = await readFile(PATHS.round1, "utf-8");
const arr = JSON.parse(raw);
assert(Array.isArray(arr), "arr는 배열이어야 합니다.");
assert(arr.length === 4, `arr.length는 4여야 합니다. 실제: ${arr.length}`);

// Step 6 검증 (폐기 대상 — Step 5 전에 구조 확인)
const a2 = arr[2];
assert(a2 !== null && typeof a2 === "object", "arr[2]는 객체여야 합니다.");
assert(
  a2.data?.who_eml_2023_inclusion?.hidroxiurea === "true/false",
  `arr[2] 폐기 검증 실패: data.who_eml_2023_inclusion.hidroxiurea는 문자열 "true/false"여야 합니다. 실제: ${JSON.stringify(a2.data?.who_eml_2023_inclusion?.hidroxiurea)}`,
);

// Step 3
const a0 = arr[0];
assert(a0 !== null && typeof a0 === "object", "arr[0]는 객체여야 합니다.");
for (const k of KEYS_MARKET_INTEL) {
  assert(k in a0, `arr[0]에 키 "${k}"가 없습니다.`);
}
await writeFile(PATHS.round3, JSON.stringify(a0, null, 2), "utf-8");

// Step 4
const a1 = arr[1];
assert(a1 !== null && typeof a1 === "object", "arr[1]는 객체여야 합니다.");
assert("collection_date" in a1, "arr[1]에 collection_date 없음");
assert("collector" in a1, "arr[1]에 collector 없음");
assert("country" in a1, "arr[1]에 country 없음");
assert("sites" in a1, "arr[1]에 sites 없음");
assert("metadata" in a1, "arr[1]에 metadata 없음");
assert(Array.isArray(a1.sites), "arr[1].sites는 배열이어야 합니다.");
assert(
  a1.sites.length === 7,
  `arr[1].sites.length는 7이어야 합니다. 실제: ${a1.sites.length}`,
);
await writeFile(PATHS.round1, JSON.stringify(a1, null, 2), "utf-8");

// Step 5
const a3 = arr[3];
assert(a3 !== null && typeof a3 === "object", "arr[3]는 객체여야 합니다.");
assert("collection_date" in a3, "arr[3]에 collection_date 없음");
assert("phase" in a3, "arr[3]에 phase 없음");
assert(
  a3.data !== null && typeof a3.data === "object",
  "arr[3].data는 객체여야 합니다.",
);
assert(
  a3.data.who_eml_2023_inclusion !== null &&
    typeof a3.data.who_eml_2023_inclusion === "object",
  "arr[3].data.who_eml_2023_inclusion은 객체여야 합니다.",
);
const whoKeys = Object.keys(a3.data.who_eml_2023_inclusion);
assert(
  whoKeys.length === 7,
  `arr[3].data.who_eml_2023_inclusion 키 개수는 7이어야 합니다. 실제: ${whoKeys.length}`,
);
assert(
  a3.data.who_eml_2023_inclusion.hidroxiurea === true,
  `arr[3].data.who_eml_2023_inclusion.hidroxiurea는 불리언 true여야 합니다. 실제: ${JSON.stringify(a3.data.who_eml_2023_inclusion.hidroxiurea)}`,
);
assert(
  a3.data.paho_strategic_fund_inclusion !== null &&
    typeof a3.data.paho_strategic_fund_inclusion === "object",
  "arr[3].data.paho_strategic_fund_inclusion은 객체여야 합니다.",
);
const pahoKeys = Object.keys(a3.data.paho_strategic_fund_inclusion);
assert(
  pahoKeys.length === 7,
  `arr[3].data.paho_strategic_fund_inclusion 키 개수는 7이어야 합니다. 실제: ${pahoKeys.length}`,
);
assert(
  a3.metadata !== null && typeof a3.metadata === "object",
  "arr[3].metadata는 객체여야 합니다.",
);
assert("notes" in a3.metadata, "arr[3].metadata.notes 없음");

await writeFile(PATHS.round2, JSON.stringify(a3, null, 2), "utf-8");

// Step 7
for (const [label, p] of [
  ["round1_macro.json", PATHS.round1],
  ["round2_eml.json", PATHS.round2],
  ["round3_market_intel.json", PATHS.round3],
]) {
  const t = await readFile(p, "utf-8");
  JSON.parse(t);
}

// stdout 보고용 (스크립트 실행 후 셸에서 라인 수 측정)
console.log(
  JSON.stringify({
    ok: true,
    archiveCreated,
    archivePath: PATHS.archive,
  }),
);
