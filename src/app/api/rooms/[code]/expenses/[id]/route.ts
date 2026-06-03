import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isValidRoomCode } from "@/lib/code";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ code: string; id: string }> },
) {
  const { code, id } = await ctx.params;
  if (!isValidRoomCode(code)) return NextResponse.json({ error: "Bad code" }, { status: 400 });
  const db = getDb();
  const r = db
    .prepare("DELETE FROM expenses WHERE id = ? AND room_code = ?")
    .run(id, code);
  if (r.changes === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
