import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const date = request.nextUrl.searchParams.get("date");
    const status = request.nextUrl.searchParams.get("status");

    const where: any = {};
    if (date) {
      const d = new Date(date);
      where.date = { gte: d, lt: new Date(d.getTime() + 86400000) };
    }
    if (status) where.status = status;

    const bookings = await prisma.booking.findMany({
      where,
      include: { table: true },
      orderBy: { date: "asc" },
    });
    return Response.json({ bookings });
  } catch (error) {
    return Response.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { guestName, guestPhone, guestCount, tableId, date, notes } =
      await req.json();
    if (!guestName || !guestCount || !tableId || !date) {
      return Response.json(
        { error: "guestName, guestCount, tableId, and date are required" },
        { status: 400 }
      );
    }
    const booking = await prisma.booking.create({
      data: {
        guestName,
        guestPhone,
        guestCount,
        table: { connect: { id: tableId } },
        date: new Date(date),
        notes,
      },
      include: { table: true },
    });
    return Response.json(booking, { status: 201 });
  } catch (error) {
    return Response.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
