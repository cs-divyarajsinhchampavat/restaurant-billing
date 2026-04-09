import { prisma } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        table: true,
        items: { include: { menuItem: true } },
      },
    });
    if (!order) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }
    return Response.json({
      order: {
        ...order,
        subtotal: Number(order.subtotal),
        tax: Number(order.tax),
        discount: Number(order.discount),
        total: Number(order.total),
      },
    });
  } catch (error) {
    return Response.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status, tableId, notes } = await req.json();

    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        status,
        table: tableId ? { connect: { id: tableId } } : undefined,
        notes,
      },
      include: {
        table: true,
        items: { include: { menuItem: true } },
      },
    });

    // Release table if order is cancelled
    if (status === "CANCELLED" && order.tableId) {
      await prisma.table.update({
        where: { id: order.tableId },
        data: { status: "AVAILABLE" },
      });
    }

    return Response.json({
      order: {
        ...order,
        subtotal: Number(order.subtotal),
        tax: Number(order.tax),
        discount: Number(order.discount),
        total: Number(order.total),
      },
    });
  } catch (error) {
    return Response.json({ error: "Failed to update order" }, { status: 500 });
  }
}
