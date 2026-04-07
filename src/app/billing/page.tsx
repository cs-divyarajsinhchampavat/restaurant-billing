"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Minus, Trash2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, generateBillNumber } from "@/lib/utils";
import { useOrderStore } from "@/store/orderStore";

interface Category {
  id: string;
  name: string;
}

interface MenuItemData {
  id: string;
  name: string;
  description: string | null;
  price: string;
  categoryId: string;
  category: Category;
  isAvailable: boolean;
}

interface TableData {
  id: string;
  number: number;
  status: string;
}

export default function BillingPage() {
  const router = useRouter();
  const [items, setItems] = useState<MenuItemData[]>([]);
  const [tables, setTables] = useState<TableData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState("");

  const {
    orderId,
    orderNumber,
    items: orderItems,
    taxRate,
    discount,
    setOrderId,
    setOrderNumber,
    setTableId,
    addItem,
    removeItem,
    incrementItem,
    decrementItem,
    setTaxRate,
    setDiscount,
    setStatus,
    reset,
    subtotal,
    tax,
    total,
  } = useOrderStore();

  async function fetchData() {
    setLoading(true);
    try {
      const [itemsRes, tablesRes, catRes] = await Promise.all([
        fetch("/api/menu-items?available=true", { cache: "no-store" }),
        fetch("/api/tables", { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" }),
      ]);
      if (!itemsRes.ok || !tablesRes.ok || !catRes.ok) {
        let errMsg = "";
        for (const r of [itemsRes, tablesRes, catRes]) {
          if (!r.ok) {
            const errJson = await r.json().catch(() => ({}));
            errMsg = errJson.error || `fetch failed (${r.status})`;
            break;
          }
        }
        throw new Error(errMsg);
      }
      const [itemsData, tablesData, catData] = await Promise.all([
        itemsRes.json(),
        tablesRes.json(),
        catRes.json(),
      ]);
      setItems(itemsData.items || []);
      setTables(tablesData.tables || []);
      setCategories(catData.categories || []);
    } catch (e: any) {
      console.error("fetchData error:", e);
      toast.error(e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const handleNewOrder = useCallback(async () => {
    reset();
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "" }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOrderId(data.order.id);
      setOrderNumber(data.order.orderNumber);
      setActiveCategoryId("");
      toast.success(`Order #${data.order.orderNumber} created`);
    } catch {
      toast.error("Failed to create order");
    }
  }, [reset, setOrderId, setOrderNumber]);

  const handleAddItem = useCallback(
    (item: MenuItemData) => {
      if (!item.isAvailable) return;
      if (!orderId) {
        toast.error("Please create a new order first");
        return;
      }
      addItem({
        menuItemId: item.id,
        name: item.name,
        price: parseFloat(item.price),
      });
    },
    [orderId, addItem]
  );

  const handleSaveOrder = useCallback(async () => {
    if (!orderId) return toast.error("No active order");
    if (orderItems.length === 0) return toast.error("Order is empty");

    try {
      // Sync items to server
      for (const item of orderItems) {
        await fetch(`/api/orders/${orderId}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            notes: item.notes || "",
          }),
        });
      }

      toast.success("Order saved. You can continue adding items.");
    } catch {
      toast.error("Failed to save order");
    }
  }, [orderId, orderItems]);

  const handleCheckout = useCallback(
    async (paymentMethod: "CASH" | "CARD" | "UPI") => {
      if (!orderId) return toast.error("No active order");
      if (orderItems.length === 0) return toast.error("Order is empty");

      try {
        // First sync all items
        for (const item of orderItems) {
          await fetch(`/api/orders/${orderId}/items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              notes: item.notes || "",
            }),
          });
        }

        const res = await fetch(`/api/orders/${orderId}/finalize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taxRate,
            discount,
            paymentMethod,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error);
        }

        const data = await res.json();
        toast.success(`Bill ${data.bill.billNumber} generated!`);
        reset();
      } catch (e: any) {
        toast.error(e.message || "Failed to generate bill");
      }
    },
    [orderId, orderItems, taxRate, discount, reset]
  );

  const handlePrintBill = useCallback(async () => {
    if (!orderId) {
      toast.error("No active order");
      return;
    }
    // Fetch latest order data and print
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();

      // Create a print window
      const printWindow = window.open("", "_blank");
      if (!printWindow) return;

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Bill - Order #${data.order.orderNumber}</title>
          <style>
            body { font-family: monospace; max-width: 300px; margin: 0 auto; padding: 10px; }
            h2 { text-align: center; margin: 0; font-size: 18px; }
            .center { text-align: center; }
            .line { border-top: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; padding: 2px 0; }
            .bold { font-weight: bold; }
            .total { font-size: 16px; }
          </style>
        </head>
        <body>
          <h2>RestoBill Restaurant</h2>
          <p class="center">Order #${data.order.orderNumber}</p>
          <p class="center">${new Date().toLocaleString()}</p>
          <div class="line"></div>
          ${data.order.items
            .map(
              (item: any) => `
            <div class="row">
              <span>${item.quantity}x ${item.menuItem.name}</span>
              <span>Rs. ${(parseFloat(item.unitPrice) * item.quantity).toFixed(2)}</span>
            </div>
          `
            )
            .join("")}
          <div class="line"></div>
          <div class="row"><span>Subtotal:</span><span>Rs. ${formatCurrency(data.order.subtotal)}</span></div>
          <div class="row"><span>Tax:</span><span>Rs. ${formatCurrency(data.order.tax)}</span></div>
          ${parseFloat(data.order.discount) > 0
            ? `<div class="row"><span>Discount:</span><span>-Rs. ${formatCurrency(data.order.discount)}</span></div>`
            : ""}
          <div class="line"></div>
          <div class="row total bold"><span>TOTAL:</span><span>Rs. ${formatCurrency(data.order.total)}</span></div>
          <div class="line"></div>
          <p class="center">Thank you for dining with us!</p>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    } catch {
      toast.error("Failed to print bill");
    }
  }, [orderId]);

  const filteredItems = filterCategory
    ? items.filter((i) => i.categoryId === filterCategory)
    : items;

  return (
    <div className="flex h-screen">
      {/* LEFT: Menu Grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Billing</h1>
          <Button
            onClick={handleNewOrder}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            New Order
          </Button>
        </div>

        {/* Category tabs */}
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => {
              setFilterCategory("");
              setActiveCategoryId("");
            }}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              !filterCategory
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setFilterCategory(cat.id);
                setActiveCategoryId(cat.id);
              }}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                activeCategoryId === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Menu items grid */}
        {loading ? (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleAddItem(item)}
                disabled={!item.isAvailable || !orderId}
                className={`flex flex-col items-center justify-center rounded-xl border p-4 min-h-[90px] text-left transition ${
                  !item.isAvailable
                    ? "opacity-40 cursor-not-allowed bg-muted/50"
                    : "cursor-pointer hover:border-primary hover:bg-primary/5"
                }`}
              >
                <span className="text-sm font-medium leading-tight">
                  {item.name}
                </span>
                <span className="mt-1 text-xs text-muted-foreground">
                  Rs. {parseFloat(item.price).toFixed(2)}
                </span>
                {!item.isAvailable && (
                  <Badge variant="secondary" className="mt-1 text-xs">
                    Unavailable
                  </Badge>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT: Order Summary */}
      <div className="w-96 flex flex-col border-l bg-background">
        {/* Order header */}
        <div className="flex-shrink-0 border-b px-4 py-3">
          {orderId ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Order</p>
                <p className="text-lg font-bold">
                  #{orderId ? orderNumber || "..." : "N/A"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveOrder}
              >
                Save
              </Button>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <p className="text-sm">No active order</p>
              <p className="text-xs">Click &quot;New Order&quot; to start</p>
            </div>
          )}
        </div>

        {/* Order items */}
        <div className="flex-1 overflow-auto px-4 py-2">
          {orderItems.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
              Tap menu items to add
            </div>
          ) : (
            <div className="space-y-2">
              {orderItems.map((item) => (
                <div
                  key={item.menuItemId}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Rs. {formatCurrency(item.price)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => decrementItem(item.menuItemId)}
                      className="flex h-7 w-7 items-center justify-center rounded-md border text-sm hover:bg-muted"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-6 text-center text-sm font-medium">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => incrementItem(item.menuItemId)}
                      className="flex h-7 w-7 items-center justify-center rounded-md border text-sm hover:bg-muted"
                    >
                      <Plus size={12} />
                    </button>
                    <span className="w-16 text-right text-sm font-medium">
                      Rs. {formatCurrency(item.price * item.quantity)}
                    </span>
                    <button
                      onClick={() => removeItem(item.menuItemId)}
                      className="ml-1 rounded-md p-1 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="flex-shrink-0 border-t px-4 py-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">Rs. {formatCurrency(subtotal())}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-10">Tax %</span>
            <input
              type="number"
              value={taxRate}
              onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
              className="w-16 rounded-md border border-input bg-background px-2 py-1 text-sm text-right"
              min="0"
              max="100"
            />
            <span className="text-sm font-medium flex-1 text-right">
              Rs. {formatCurrency(tax())}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-10">Disc</span>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              className="w-16 rounded-md border border-input bg-background px-2 py-1 text-sm text-right"
              min="0"
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-lg font-bold">Total</span>
            <span className="text-lg font-bold">
              Rs. {formatCurrency(total())}
            </span>
          </div>
        </div>

        {/* Payment buttons */}
        <div className="flex-shrink-0 border-t p-4 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleCheckout("CASH")}
              className="rounded-lg bg-green-600 px-3 py-3 text-sm font-medium text-white hover:bg-green-700 transition"
            >
              Cash
            </button>
            <button
              onClick={() => handleCheckout("CARD")}
              className="rounded-lg bg-blue-600 px-3 py-3 text-sm font-medium text-white hover:bg-blue-700 transition"
            >
              Card
            </button>
            <button
              onClick={() => handleCheckout("UPI")}
              className="rounded-lg bg-purple-600 px-3 py-3 text-sm font-medium text-white hover:bg-purple-700 transition"
            >
              UPI
            </button>
          </div>
          <button
            onClick={handlePrintBill}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium hover:bg-muted transition"
          >
            <Printer size={16} />
            Print Bill
          </button>
        </div>
      </div>
    </div>
  );
}
