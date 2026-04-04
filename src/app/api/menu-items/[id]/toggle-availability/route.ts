import { prisma } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Menu item not found" }, { status: 404 });
    }
    const item = await prisma.menuItem.update({
      where: { id },
      data: { isAvailable: !existing.isAvailable },
    });
    return Response.json({ ...item, price: Number(item.price) });
  } catch (error) {
    return Response.json(
      { error: "Failed to toggle availability" },
      { status: 500 }
    );
  }
}
