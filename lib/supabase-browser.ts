/**
 * 클라이언트 컴포넌트용 Supabase — anon key만 사용.
 */
"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function createSupabaseBrowser(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url === undefined || url === "" || key === undefined || key === "") {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY가 비어 있습니다.",
    );
  }
  return createClient(url, key);
}
