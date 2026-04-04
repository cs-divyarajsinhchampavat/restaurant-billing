import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const items = await prisma.orderItem.findMany({
      where: { orderId: id },
      include: { menuItem: true },
    });
    return Response.json({ items });
  } catch {
    return Response.json({ error: "Failed to fetch items" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { menuItemId, quantity, notes } = body;

    if (!menuItemId || !quantity) {
      return Response.json({ error: "menuItemId and quantity required" }, { status: 400 });
    }

    const menuItem = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
    if (!menuItem) {
      return Response.json({ error: "Menu item not found" }, { status: 404 });
    }

    const orderItem = await prisma.orderItem.create({
      data: {
        orderId: id,
        menuItemId,
        quantity,
        unitPrice: menuItem.price,
        notes: notes || null,
      },
      include: { menuItem: true },
    });

    return Response.json({ orderItem }, { status: 201 });
  } catch (e: any) {
    return Response.json({ error: e.message || "Failed to add item" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: orderId } = await params;
    const url = new URL(req.url);
    const orderItemId = url.searchParams.get("orderItemId");
    if (!orderItemId) {
      return Response.json({ error: "orderItemId required" }, { status: 400 });
    }

    await prisma.orderItem.delete({ where: { id: orderItemId, orderId } });
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
