import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { generateRoomCode } from "@/lib/code";
import { rateLimit } from "@/lib/rate-limit";
import { SUPPORTED_CURRENCIES } from "@/lib/money";

export const runtime = "nodejs";

const Body = z.object({
  name: z.string().trim().min(1).max(80),
  currency: z.enum(SUPPORTED_CURRENCIES),
});

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (!rateLimit(`rooms:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many rooms created. Try again in an hour." },
      { status: 429 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const db = getDb();
  const now = Date.now();
  const insert = db.prepare(
    "INSERT INTO rooms (code, name, currency, members_json, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
  );

  // Retry on (vanishingly rare) collision.
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateRoomCode();
    try {
      insert.run(code, parsed.data.name, parsed.data.currency, "[]", now, now + THIRTY_DAYS);
      return NextResponse.json({ code });
    } catch (e) {
      if ((e as { code?: string }).code === "SQLITE_CONSTRAINT_PRIMARYKEY") continue;
      throw e;
    }
  }
  return NextResponse.json({ error: "Could not allocate a code" }, { status: 500 });
}
