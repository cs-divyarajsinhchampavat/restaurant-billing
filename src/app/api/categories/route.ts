import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { items: true },
        },
      },
      orderBy: { sortOrder: "asc" },
    });
    return Response.json({ categories });
  } catch (error) {
    return Response.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, sortOrder } = await req.json();
    if (!name) {
      return Response.json({ error: "Name is required" }, { status: 400 });
    }
    const category = await prisma.category.create({
      data: { name, sortOrder: sortOrder ?? 0 },
    });
    return Response.json({ category }, { status: 201 });
  } catch (error) {
    return Response.json({ error: "Failed to create category" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return Response.json({ error: "Category ID is required" }, { status: 400 });
    }
    const itemCount = await prisma.menuItem.count({ where: { categoryId: id } });
    if (itemCount > 0) {
      return Response.json(
        { error: "Cannot delete category that has menu items" },
        { status: 400 }
      );
    }
    await prisma.category.delete({ where: { id } });
    return Response.json({ message: "Category deleted" });
  } catch (error) {
    return Response.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
