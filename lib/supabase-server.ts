/**
 * 서버 전용 Supabase 클라이언트 — anon key만 사용(Service Role 금지).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function createSupabaseServer(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url === undefined || url === "" || key === undefined || key === "") {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY가 비어 있습니다.",
    );
  }
  return createClient(url, key);
}
