import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const categoryId = request.nextUrl.searchParams.get("categoryId");
    const available = request.nextUrl.searchParams.get("available");

    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    if (available !== null && available !== undefined) {
      where.isAvailable = available === "true";
    }

    const items = await prisma.menuItem.findMany({
      where,
      include: { category: true },
      orderBy: { sortOrder: "asc" },
    });

    return Response.json({ items: items.map((item) => ({ ...item, price: Number(item.price) })) });
  } catch (error) {
    return Response.json({ error: "Failed to fetch menu items" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, description, price, categoryId, sortOrder } = await req.json();
    if (!name || price == null || !categoryId) {
      return Response.json(
        { error: "Name, price, and categoryId are required" },
        { status: 400 }
      );
    }
    const item = await prisma.menuItem.create({
      data: {
        name,
        description,
        price,
        category: { connect: { id: categoryId } },
        sortOrder: sortOrder ?? 0,
      },
    });
    return Response.json({ item: { ...item, price: Number(item.price) } }, { status: 201 });
  } catch (error) {
    return Response.json({ error: "Failed to create menu item" }, { status: 500 });
  }
}
