"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Printer, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

interface OrderData {
  id: string;
  orderNumber: number;
  tableId: string | null;
  table: { number: number } | null;
  total: number;
  status: string;
  createdAt: string;
  orderType: string;
}

const statusColors: Record<string, string> = {
  OPEN: "bg-orange-100 text-orange-700",
  FINALIZED: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [filterStatus, setFilterStatus] = useState("");

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("startDate", startDate);
      params.set("endDate", endDate);
      if (filterStatus) params.set("status", filterStatus);

      const res = await fetch(`/api/orders?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load orders");
      const data = await res.json();
      setOrders(data || []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load order history");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, filterStatus]);

  const handlePrintBill = async (orderId: string) => {
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
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Order History</h1>
      </div>

      <div className="mb-6 flex flex-wrap gap-4 items-end bg-muted/30 p-4 rounded-xl border">
        <div className="grid gap-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm w-40"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="FINALIZED">Finalized</option>
            <option value="PAID">Paid</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <Button onClick={fetchData} variant="outline" className="flex items-center gap-2">
          <Search size={16} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
          No orders found for the selected filters.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">#{order.orderNumber}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {order.orderType === "DINE_IN" ? "Dine In" : "Take Away"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {order.table ? `Table ${order.table.number}` : "N/A"}
                  </TableCell>
                  <TableCell className="font-medium">
                    Rs. {formatCurrency(order.total)}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[order.status] || "bg-muted"}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(order.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrintBill(order.id)}
                      className="flex items-center gap-2"
                    >
                      <Printer size={14} />
                      Print
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// Note: I need to import Label since I used it in the UI.
// I'll add the imports.
