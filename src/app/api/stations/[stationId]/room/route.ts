import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { roomService, roomNameForStation } from "@/lib/livekit";

// GET  /api/stations/:stationId/room  — is this station's LiveKit room
//      currently active, and with how many participants? Exists mainly
//      because the LiveKit Cloud dashboard's Sessions/Rooms view isn't
//      always easy to find — this gives the same answer from inside the
//      app itself.
// POST /api/stations/:stationId/room  — force-close it. Useful when a
//      room gets stuck "active" after a flappy encoder disconnect
//      (rapid connect/reconnect cycles) without a clean room_finished,
//      since a stuck room means the *next* real connection just joins
//      the stale room instead of firing a fresh room_started — and our
//      egress-start logic only runs on room_started (see
//      api/webhooks/livekit/route.ts), so nothing streams until the
//      stale room is cleared.
export async function GET(_req: Request, { params }: { params: Promise<{ stationId: string }> }) {
  try {
    await requireRole(["ORGANIZER", "ADMIN"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { stationId } = await params;
  const station = await db.station.findUnique({ where: { id: stationId } });
  if (!station) return NextResponse.json({ error: "Station not found" }, { status: 404 });

  const roomName = roomNameForStation(station.id);
  const rooms = await roomService.listRooms([roomName]);
  const room = rooms[0];

  return NextResponse.json({
    roomName,
    active: !!room,
    numParticipants: room?.numParticipants ?? 0,
  });
}

export async function POST(_req: Request, { params }: { params: Promise<{ stationId: string }> }) {
  try {
    await requireRole(["ORGANIZER", "ADMIN"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { stationId } = await params;
  const station = await db.station.findUnique({ where: { id: stationId } });
  if (!station) return NextResponse.json({ error: "Station not found" }, { status: 404 });

  const roomName = roomNameForStation(station.id);

  // deleteRoom on an already-gone room is a no-op on LiveKit's side, not
  // an error — safe to call even if you're not sure it's actually stuck.
  await roomService.deleteRoom(roomName);

  await db.station.update({ where: { id: station.id }, data: { status: "OFFLINE" } });

  return NextResponse.json({ closed: true, roomName });
}
