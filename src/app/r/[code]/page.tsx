import { notFound } from "next/navigation";
import { RoomClient } from "@/components/RoomClient";
import { getDb, type RoomRow, type ExpenseRow } from "@/lib/db";
import { isValidRoomCode } from "@/lib/code";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string }> };

export default async function RoomPage({ params }: Props) {
  const { code } = await params;
  if (!isValidRoomCode(code)) notFound();

  const db = getDb();
  const room = db.prepare("SELECT * FROM rooms WHERE code = ?").get(code) as
    | RoomRow
    | undefined;
  if (!room) notFound();

  const expenses = db
    .prepare("SELECT * FROM expenses WHERE room_code = ? ORDER BY created_at DESC")
    .all(code) as ExpenseRow[];

  return (
    <RoomClient
      initialRoom={{
        code: room.code,
        name: room.name,
        currency: room.currency,
        members: JSON.parse(room.members_json) as string[],
        createdAt: room.created_at,
        expiresAt: room.expires_at,
      }}
      initialExpenses={expenses.map((e) => ({
        id: e.id,
        paidBy: e.paid_by,
        amountMinor: e.amount_minor,
        participants: JSON.parse(e.participants_json),
        description: e.description,
        createdAt: e.created_at,
      }))}
    />
  );
}
