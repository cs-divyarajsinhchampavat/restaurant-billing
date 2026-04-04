"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Minus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrderStore } from "@/store/orderStore";
import { formatCurrency } from "@/lib/utils";

export default function EditOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const orderId = params.then((p) => p.orderId);

  const {
    items: orderItems,
    taxRate,
    discount,
    incrementItem,
    decrementItem,
    removeItem,
    setTaxRate,
    setDiscount,
    loadFromOrder,
    reset,
    subtotal,
    tax,
    total,
  } = useOrderStore();

  useEffect(() => {
    orderId.then(async (id) => {
      try {
        const res = await fetch(`/api/orders/${id}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        loadFromOrder(data.order);
      } catch {
        toast.error("Failed to load order");
      } finally {
        setLoading(false);
      }
    });
    return () => reset();
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Order</h1>
        <button
          onClick={() => router.push("/billing")}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Back to Billing
        </button>
      </div>

      <div className="space-y-2">
        {orderItems.map((item) => (
          <div key={item.menuItemId} className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-muted-foreground">Rs. {formatCurrency(item.price)} each</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => decrementItem(item.menuItemId)} className="flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted">
                <Minus size={14} />
              </button>
              <span className="w-8 text-center font-medium">{item.quantity}</span>
              <button onClick={() => incrementItem(item.menuItemId)} className="flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted">
                <Plus size={14} />
              </button>
              <span className="w-20 text-right font-medium">Rs. {formatCurrency(item.price * item.quantity)}</span>
              <button onClick={() => removeItem(item.menuItemId)} className="rounded-md p-2 text-red-500 hover:bg-red-50">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-2 rounded-xl border p-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>Rs. {formatCurrency(subtotal())}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Tax ({taxRate}%)</span>
          <span>Rs. {formatCurrency(tax())}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Discount</span>
          <span>-Rs. {formatCurrency(discount)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold border-t pt-2">
          <span>Total</span>
          <span>Rs. {formatCurrency(total())}</span>
        </div>
      </div>
    </div>
  );
}
