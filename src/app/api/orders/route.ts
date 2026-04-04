import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get("status");
    const date = request.nextUrl.searchParams.get("date");

    const where: any = {};
    if (status) where.status = status;
    if (date) {
      const d = new Date(date);
      where.createdAt = { gte: d, lt: new Date(d.getTime() + 86400000) };
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
    const { tableId, notes } = await req.json();
    const order = await prisma.order.create({
      data: {
        tableId: tableId || undefined,
        notes: notes || undefined,
        subtotal: 0,
        tax: 0,
        discount: 0,
        total: 0,
      },
      include: { table: true },
    });
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
  } catch (error) {
    return Response.json({ error: "Failed to create order" }, { status: 500 });
  }
}
