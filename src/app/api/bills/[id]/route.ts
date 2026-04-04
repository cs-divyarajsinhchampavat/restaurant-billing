import { prisma } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bill = await prisma.bill.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            items: { include: { menuItem: true } },
            table: true,
          },
        },
      },
    });
    if (!bill) {
      return Response.json({ error: "Bill not found" }, { status: 404 });
    }
    return Response.json({
      bill: {
        ...bill,
        subtotal: Number(bill.subtotal),
        tax: Number(bill.tax),
        discount: Number(bill.discount),
        total: Number(bill.total),
        order: {
          ...bill.order,
          subtotal: Number(bill.order.subtotal),
          tax: Number(bill.order.tax),
          discount: Number(bill.order.discount),
          total: Number(bill.order.total),
        },
      },
    });
  } catch (error) {
    return Response.json({ error: "Failed to fetch bill" }, { status: 500 });
  }
}
