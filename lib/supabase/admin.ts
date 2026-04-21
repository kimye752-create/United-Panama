/**
 * Service Role 클라이언트 — Storage 업로드·다운로드 등 RLS 우회 필요 시 사용.
 * SUPABASE_SERVICE_ROLE_KEY 미설정 시 anon key로 폴백 (로컬 개발 환경 대비).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function createSupabaseAdmin(): SupabaseClient {
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
  return createClient(url, key, { auth: { persistSession: false } });
}
