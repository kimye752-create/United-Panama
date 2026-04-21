import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  context: { params: { id: string } },
): Promise<Response> {
  try {
    const id = context.params.id;
    if (typeof id !== "string" || id === "") {
      return NextResponse.json({ error: "ID_REQUIRED" }, { status: 400 });
    }

    const supabase = createClient();
    const { error } = await supabase.from("reports").delete().eq("id", id);

    if (error !== null) {
      return NextResponse.json(
        { error: "DELETE_FAILED", detail: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    return NextResponse.json(
      { error: "DELETE_FAILED", detail: message },
      { status: 500 },
    );
  }
}
