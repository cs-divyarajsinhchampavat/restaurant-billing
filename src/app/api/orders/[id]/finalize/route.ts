import { prisma } from "@/lib/db";
import { generateBillNumber } from "@/lib/utils";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { taxRate, discount, paymentMethod } = await req.json();

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status === "FINALIZED" || order.status === "PAID") {
      return Response.json(
        { error: "Order is already finalized or paid" },
        { status: 400 }
      );
    }

    const subtotal = order.items.reduce((sum, item) => {
      return sum + Number(item.unitPrice) * item.quantity;
    }, 0);

    const effectiveTaxRate = taxRate ?? 5;
    const tax = subtotal * (effectiveTaxRate / 100);
    const effectiveDiscount = discount ?? 0;
    const total = subtotal + tax - effectiveDiscount;

    const newStatus = paymentMethod ? "PAID" : "FINALIZED";

    const bill = await prisma.bill.create({
      data: {
        orderId: order.id,
        billNumber: generateBillNumber(),
        subtotal,
        tax,
        discount: effectiveDiscount,
        total,
        paymentMethod: paymentMethod,
        issuedAt: new Date(),
      },
    });

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: newStatus,
        subtotal,
        tax,
        discount: effectiveDiscount,
        total,
        paymentMethod: paymentMethod,
      },
      include: {
        table: true,
        items: { include: { menuItem: true } },
      },
    });

    // Release table back to AVAILABLE when Dine-in order is paid
    if (newStatus === "PAID" && updatedOrder.tableId) {
      await prisma.table.update({
        where: { id: updatedOrder.tableId },
        data: { status: "AVAILABLE" },
      });
    }

    return Response.json({
      order: {
        ...updatedOrder,
        subtotal: Number(updatedOrder.subtotal),
        tax: Number(updatedOrder.tax),
        discount: Number(updatedOrder.discount),
        total: Number(updatedOrder.total),
      },
      bill: {
        ...bill,
        subtotal: Number(bill.subtotal),
        tax: Number(bill.tax),
        discount: Number(bill.discount),
        total: Number(bill.total),
      },
    });
  } catch (error) {
    return Response.json({ error: "Failed to finalize order" }, { status: 500 });
  }
}
