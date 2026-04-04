import { prisma } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { table: true },
    });
    if (!booking) {
      return Response.json({ error: "Booking not found" }, { status: 404 });
    }
    return Response.json(booking);
  } catch (error) {
    return Response.json({ error: "Failed to fetch booking" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { guestName, guestPhone, guestCount, tableId, date, notes, status } =
      await req.json();

    const existing = await prisma.booking.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Booking not found" }, { status: 404 });
    }

    const booking = await prisma.booking.update({
      where: { id },
      data: {
        guestName,
        guestPhone,
        guestCount,
        tableId,
        date: date ? new Date(date) : undefined,
        notes,
        status,
      },
      include: { table: true },
    });
    return Response.json(booking);
  } catch (error) {
    return Response.json({ error: "Failed to update booking" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.booking.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Booking not found" }, { status: 404 });
    }
    await prisma.booking.delete({ where: { id } });
    return Response.json({ message: "Booking deleted" });
  } catch (error) {
    return Response.json({ error: "Failed to delete booking" }, { status: 500 });
  }
}
