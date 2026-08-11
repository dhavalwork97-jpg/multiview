import { NextResponse } from "next/server";

// Paid billing is intentionally disabled until launch. The pricing UI is live,
// but no checkout or customer portal can charge or modify a subscription yet.
export async function POST() {
  return NextResponse.json(
    { error: "Paid billing is coming soon. No charges are enabled yet." },
    { status: 503 },
  );
}
