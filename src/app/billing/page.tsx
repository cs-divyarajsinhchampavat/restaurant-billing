"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Minus, Trash2, Printer, UtensilsCrossed, ShoppingBag, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
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

// Remove OrderTypeModal and replace it with integrated UI in BillingPage

export default function BillingPage() {
  const [items, setItems] = useState<MenuItemData[]>([]);
  const [tables, setTables] = useState<TableData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState("");
  const [openOrders, setOpenOrders] = useState<any[]>([]);
  const [showResumeModal, setShowResumeModal] = useState(false);

  // Order initialization state
  const [newOrderType, setNewOrderType] = useState<"DINE_IN" | "TAKE_AWAY">("DINE_IN");
  const [newOrderTableId, setNewOrderTableId] = useState<string>("");

  const {
    orderId,
    orderNumber,
    tableId,
    orderType,
    items: orderItems,
    taxRate,
    discount,
    setOrderId,
    setOrderNumber,
    setTableId,
    setOrderType: storeSetOrderType,
    addItem,
    removeItem,
    incrementItem,
    decrementItem,
    setTaxRate,
    setDiscount,
    reset,
    loadFromOrder,
    subtotal,
    tax,
    total,
  } = useOrderStore();

  async function fetchData() {
    setLoading(true);
    try {
      const [itemsRes, tablesRes, catRes, openOrdersRes] = await Promise.all([
        fetch("/api/menu-items?available=true", { cache: "no-store" }),
        fetch("/api/tables", { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" }),
        fetch("/api/orders?status=OPEN", { cache: "no-store" }),
      ]);
      if (!itemsRes.ok || !tablesRes.ok || !catRes.ok || !openOrdersRes.ok) {
        let errMsg = "";
        for (const r of [itemsRes, tablesRes, catRes, openOrdersRes]) {
          if (!r.ok) {
            const errJson = await r.json().catch(() => ({}));
            errMsg = errJson.error || `fetch failed (${r.status})`;
            break;
          }
        }
        throw new Error(errMsg);
      }
      const [itemsData, tablesData, catData, openOrdersData] = await Promise.all([
        itemsRes.json(),
        tablesRes.json(),
        catRes.json(),
        openOrdersRes.json(),
      ]);
      setItems(itemsData.items || []);
      setTables(tablesData.tables || []);
      setCategories(catData.categories || []);
      setOpenOrders(openOrdersData || []);
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

  // Starts a new order based on the current selection in the top bar
  const handleStartOrder = useCallback(async () => {
    if (newOrderType === "DINE_IN" && !newOrderTableId) {
      return toast.error("Please select a table for dine-in orders");
    }

    reset();
    storeSetOrderType(newOrderType);
    setTableId(newOrderType === "DINE_IN" ? newOrderTableId : null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType: newOrderType,
          tableId: newOrderType === "DINE_IN" ? newOrderTableId : undefined,
          notes: "",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create order");
      }
      const data = await res.json();
      setOrderId(data.order.id);
      setOrderNumber(data.order.orderNumber);
      setActiveCategoryId("");

      const typeLabel = newOrderType === "DINE_IN" ? "Dine-in" : "Take-away";
      const tableLabel = newOrderType === "DINE_IN"
        ? ` (Table ${tables.find((t) => t.id === newOrderTableId)?.number})`
        : "";
      toast.success(`Order #${data.order.orderNumber} created — ${typeLabel}${tableLabel}`);

      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Failed to create order");
    }
  }, [newOrderType, newOrderTableId, reset, storeSetOrderType, setTableId, setOrderId, setOrderNumber, tables, fetchData]);

  const handleSwitchOrder = useCallback(async (order: any) => {
    // Save current order items before switching to prevent data loss
    if (orderId && orderItems.length > 0) {
      try {
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
      } catch (e) {
        console.error("Failed to auto-save order before switching:", e);
      }
    }

    loadFromOrder(order);
    toast.success(`Switched to Order #${order.orderNumber}`);
  }, [orderId, orderItems, loadFromOrder]);

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
        fetchData();
      } catch (e: any) {
        toast.error(e.message || "Failed to generate bill");
      }
    },
    [orderId, orderItems, taxRate, discount, reset, fetchData]
  );

  const handleCancelOrder = useCallback(async () => {
    if (!orderId) return;
    if (!confirm("Are you sure you want to cancel this order? This will release the table.")) return;

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Order cancelled");
      reset();
      fetchData();
    } catch {
      toast.error("Failed to cancel order");
    }
  }, [orderId, reset, fetchData]);

  const handlePrintBill = useCallback(async () => {
    if (!orderId) {
      toast.error("No active order");
      return;
    }
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();

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
          <p class="center">${data.order.orderType === "DINE_IN" ? "Dine-in" : "Take Away"}${data.order.table ? " — Table " + data.order.table.number : ""}</p>
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

  const selectedTable = tables.find((t) => t.id === tableId);

  return (
    <div className="flex h-screen">
      {/* LEFTMOST: Active Orders Panel */}
      <div className="w-64 flex flex-col border-r bg-muted/20">
        <div className="p-4 border-b bg-muted/50">
          <h2 className="font-bold text-sm flex items-center gap-2">
            <UtensilsCrossed size={16} />
            Active Orders
          </h2>
          <p className="text-xs text-muted-foreground">Current open bills</p>
        </div>
        <div className="flex-1 overflow-auto p-2 space-y-2">
          {openOrders.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No active orders
            </div>
          ) : (
            openOrders.map((order) => (
              <button
                key={order.id}
                onClick={() => handleSwitchOrder(order)}
                className={`w-full text-left p-3 rounded-lg border transition ${
                  orderId === order.id
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background hover:bg-muted border-border"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">Order #{order.orderNumber}</span>
                  <Badge variant="secondary" className="text-[10px] px-1 h-4">
                    {order.orderType === "DINE_IN" ? "Dine" : "Take"}
                  </Badge>
                </div>
                <div className="text-[11px] opacity-80">
                  {order.table ? `Table ${order.table.number}` : "Takeaway"} &bull; Rs. {formatCurrency(order.total)}
                </div>
              </button>
            ))
          )}
        </div>
        <div className="p-4 border-t bg-muted/50">
          <Button
            onClick={handleStartOrder}
            className="w-full flex items-center justify-center gap-2"
            size="sm"
          >
            <Plus size={14} />
            New Order
          </Button>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold">Billing</h1>

          {/* Order Setup Bar */}
          {!orderId && (
            <div className="flex flex-wrap items-center gap-3 p-2 rounded-lg bg-muted/50 border">
              <div className="flex gap-1 p-1 bg-background rounded-md border">
                <button
                  onClick={() => {
                    setNewOrderType("DINE_IN");
                    setNewOrderTableId("");
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-sm transition ${
                    newOrderType === "DINE_IN"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  Dine In
                </button>
                <button
                  onClick={() => {
                    setNewOrderType("TAKE_AWAY");
                    setNewOrderTableId("");
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-sm transition ${
                    newOrderType === "TAKE_AWAY"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  Take Away
                </button>
              </div>

              {newOrderType === "DINE_IN" && (
                <select
                  value={newOrderTableId}
                  onChange={(e) => setNewOrderTableId(e.target.value)}
                  className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                >
                  <option value="">Select Table</option>
                  {tables
                    .filter((t) => t.status === "AVAILABLE")
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        Table {t.number} ({t.capacity} seats)
                      </option>
                    ))}
                </select>
              )}

              <Button
                onClick={handleStartOrder}
                size="sm"
                className="flex items-center gap-2"
                disabled={newOrderType === "DINE_IN" && !newOrderTableId}
              >
                <Plus size={14} />
                Start Order
              </Button>
              <Button
                onClick={() => setShowResumeModal(true)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <History size={14} />
                Resume
              </Button>
            </div>
          )}
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
                className={`flex flex-col items-center justify-center rounded-xl border p-4 min-h-22.5 text-left transition ${
                  !item.isAvailable
                    ? "opacity-40 cursor-not-allowed bg-muted/50"
                    : "cursor-pointer hover:border-primary hover:bg-primary/5"
                }`}
              >
                <span className="text-sm font-medium leading-tight">{item.name}</span>
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
        {/* Order header with type + table */}
        <div className="shrink-0 border-b px-4 py-3">
          {orderId ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Order</p>
                  <p className="text-lg font-bold">
                    #{orderNumber || "..."}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleSaveOrder}>
                  Save
                </Button>
              </div>
              <div className="flex gap-2 items-center">
                <Badge
                  variant={orderType === "DINE_IN" ? "default" : "secondary"}
                  className={orderType === "DINE_IN" ? "bg-green-600 text-white" : ""}
                >
                  {orderType === "DINE_IN" ? "Dine In" : "Take Away"}
                </Badge>
                {orderType === "DINE_IN" && selectedTable && (
                  <Badge variant="outline">Table {selectedTable.number}</Badge>
                )}
              </div>
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
                  key={item.id}
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
        <div className="shrink-0 border-t px-4 py-3 space-y-2">
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
        <div className="shrink-0 border-t p-4 space-y-2">
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
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handlePrintBill}
              className="flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium hover:bg-muted transition"
            >
              <Printer size={16} />
              Print
            </button>
            <button
              onClick={handleCancelOrder}
              className="flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-100 transition"
            >
              <Trash2 size={16} />
              Cancel
            </button>
          </div>
        </div>
      </div>

      <Dialog open={showResumeModal} onOpenChange={setShowResumeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resume Open Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-auto py-4">
            {openOrders.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">No open orders found.</p>
            ) : (
              openOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => {
                    loadFromOrder(order);
                    setShowResumeModal(false);
                    toast.success(`Resumed Order #${order.orderNumber}`);
                  }}
                  className="w-full flex items-center justify-between rounded-lg border p-3 text-left hover:bg-muted transition"
                >
                  <div>
                    <p className="text-sm font-medium">Order #{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.orderType === "DINE_IN" ? `Table ${order.table?.number}` : "Take Away"} &bull; Rs. {formatCurrency(order.total)}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost">Resume</Button>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
