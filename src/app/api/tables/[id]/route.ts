import { prisma } from "@/lib/db";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { number, capacity, status } = await req.json();

    const existing = await prisma.table.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Table not found" }, { status: 404 });
    }

    const table = await prisma.table.update({
      where: { id },
      data: { number, capacity, status },
    });
    return Response.json(table);
  } catch (error: any) {
    if (error.code === "P2002") {
      return Response.json({ error: "Table number already exists" }, { status: 409 });
    }
    return Response.json({ error: "Failed to update table" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.table.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Table not found" }, { status: 404 });
    }
    await prisma.table.delete({ where: { id } });
    return Response.json({ message: "Table deleted" });
  } catch (error) {
    return Response.json({ error: "Failed to delete table" }, { status: 500 });
  }
}
