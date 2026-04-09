import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get("status");
    const startDate = request.nextUrl.searchParams.get("startDate");
    const endDate = request.nextUrl.searchParams.get("endDate");

    const where: any = {};
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // Set endDate to the end of that day (23:59:59.999)
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        table: true,
        items: { include: { menuItem: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(
      orders.map((o) => ({
        ...o,
        subtotal: Number(o.subtotal),
        tax: Number(o.tax),
        discount: Number(o.discount),
        total: Number(o.total),
      }))
    );
  } catch (error) {
    return Response.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { tableId, notes, orderType } = await req.json();
    const order = await prisma.order.create({
      data: {
        table: orderType === "TAKE_AWAY" ? undefined : (tableId ? { connect: { id: tableId } } : undefined),
        orderType: orderType || "DINE_IN",
        notes: notes || undefined,
        subtotal: 0,
        tax: 0,
        discount: 0,
        total: 0,
      },
      include: { table: true },
    });

    // Mark table as OCCUPIED for Dine-in orders
    if (orderType === "DINE_IN" && tableId) {
      await prisma.table.update({
        where: { id: tableId },
        data: { status: "OCCUPIED" },
      });
    }

    return Response.json(
      {
        order: {
          ...order,
          subtotal: Number(order.subtotal),
          tax: Number(order.tax),
          discount: Number(order.discount),
          total: Number(order.total),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Order creation error:", error);
    return Response.json(
      { error: error.message || "Failed to create order" },
      { status: 500 }
    );
  }
}
