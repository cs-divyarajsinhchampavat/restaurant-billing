import { prisma } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await prisma.menuItem.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!item) {
      return Response.json({ error: "Menu item not found" }, { status: 404 });
    }
    return Response.json({ ...item, price: Number(item.price) });
  } catch (error) {
    return Response.json({ error: "Failed to fetch menu item" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name, description, price, categoryId, isAvailable, sortOrder } =
      await req.json();

    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Menu item not found" }, { status: 404 });
    }

    const item = await prisma.menuItem.update({
      where: { id },
      data: {
        name,
        description,
        price,
        category: categoryId ? { connect: { id: categoryId } } : undefined,
        isAvailable,
        sortOrder,
      },
    });
    return Response.json({ ...item, price: Number(item.price) });
  } catch (error) {
    return Response.json({ error: "Failed to update menu item" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Menu item not found" }, { status: 404 });
    }
    await prisma.menuItem.delete({ where: { id } });
    return Response.json({ message: "Menu item deleted" });
  } catch (error) {
    return Response.json({ error: "Failed to delete menu item" }, { status: 500 });
  }
}
