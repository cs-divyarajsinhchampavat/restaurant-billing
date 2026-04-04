import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const tables = await prisma.table.findMany({
      orderBy: { number: "asc" },
    });
    return Response.json({ tables });
  } catch (error) {
    return Response.json({ error: "Failed to fetch tables" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { number, capacity } = await req.json();
    if (number == null) {
      return Response.json({ error: "Table number is required" }, { status: 400 });
    }
    const table = await prisma.table.create({
      data: { number, capacity: capacity ?? 4 },
    });
    return Response.json(table, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return Response.json({ error: "Table number already exists" }, { status: 409 });
    }
    return Response.json({ error: "Failed to create table" }, { status: 500 });
  }
}
