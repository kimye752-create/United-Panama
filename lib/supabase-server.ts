/**
 * 서버 전용 Supabase 클라이언트.
 * service_role 키 사용 — 서버 측 INSERT/UPDATE/DELETE 위해 필요 (RLS 우회).
 * 브라우저 노출 위험 없음 (이 파일은 서버에서만 import됨, lib/supabase-browser.ts와 분리).
 * SUPABASE_SERVICE_ROLE_KEY 미설정 시 anon으로 폴백 (로컬 개발 환경).
 * Next.js Data Cache 우회를 위해 global fetch에 cache: 'no-store' 적용.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function createSupabaseServer(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url === undefined || url === "") {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL이 비어 있습니다.");
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key =
    typeof serviceKey === "string" && serviceKey !== "" ? serviceKey : anonKey;
  if (key === undefined || key === "") {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY가 비어 있습니다.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) =>
        fetch(input as RequestInfo, { ...init, cache: "no-store" }),
    },
  });
}
