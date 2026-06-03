import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getDb, type RoomRow } from "@/lib/db";
import { isValidRoomCode } from "@/lib/code";

export const runtime = "nodejs";

const Participant = z.union([
  z.string().trim().min(1).max(40),
  z.object({
    name: z.string().trim().min(1).max(40),
    share: z.number().positive().finite(),
  }),
]);

const Body = z.object({
  paidBy: z.string().trim().min(1).max(40),
  amountMinor: z.number().int().positive().max(1_000_000_000_00),
  participants: z.array(Participant).min(1).max(50),
  description: z.string().trim().max(140).optional().nullable(),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  if (!isValidRoomCode(code)) return NextResponse.json({ error: "Bad code" }, { status: 400 });

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const db = getDb();
  const room = db.prepare("SELECT * FROM rooms WHERE code = ?").get(code) as
    | RoomRow
    | undefined;
  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (room.expires_at < Date.now()) {
    return NextResponse.json({ error: "Expired" }, { status: 410 });
  }

  const id = nanoid(12);
  const now = Date.now();
  db.prepare(
    "INSERT INTO expenses (id, room_code, paid_by, amount_minor, participants_json, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(
    id,
    code,
    parsed.data.paidBy,
    parsed.data.amountMinor,
    JSON.stringify(parsed.data.participants),
    parsed.data.description ?? null,
    now,
  );

  return NextResponse.json({ id, createdAt: now });
}
