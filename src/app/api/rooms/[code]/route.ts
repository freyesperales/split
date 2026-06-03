import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, type RoomRow, type ExpenseRow } from "@/lib/db";
import { isValidRoomCode } from "@/lib/code";

export const runtime = "nodejs";

const PatchBody = z.object({
  members: z.array(z.string().trim().min(1).max(40)).max(50),
});

export async function GET(_req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  if (!isValidRoomCode(code)) return NextResponse.json({ error: "Bad code" }, { status: 400 });
  const db = getDb();
  const room = db.prepare("SELECT * FROM rooms WHERE code = ?").get(code) as
    | RoomRow
    | undefined;
  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (room.expires_at < Date.now()) {
    return NextResponse.json({ error: "Expired" }, { status: 410 });
  }
  const expenses = db
    .prepare("SELECT * FROM expenses WHERE room_code = ? ORDER BY created_at DESC")
    .all(code) as ExpenseRow[];

  return NextResponse.json({
    room: {
      code: room.code,
      name: room.name,
      currency: room.currency,
      members: JSON.parse(room.members_json) as string[],
      createdAt: room.created_at,
      expiresAt: room.expires_at,
    },
    expenses: expenses.map((e) => ({
      id: e.id,
      paidBy: e.paid_by,
      amountMinor: e.amount_minor,
      participants: JSON.parse(e.participants_json),
      description: e.description,
      createdAt: e.created_at,
    })),
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  if (!isValidRoomCode(code)) return NextResponse.json({ error: "Bad code" }, { status: 400 });
  const json = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const db = getDb();
  const room = db.prepare("SELECT * FROM rooms WHERE code = ?").get(code) as
    | RoomRow
    | undefined;
  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const unique = Array.from(new Set(parsed.data.members));
  db.prepare("UPDATE rooms SET members_json = ? WHERE code = ?").run(
    JSON.stringify(unique),
    code,
  );
  return NextResponse.json({ ok: true, members: unique });
}
