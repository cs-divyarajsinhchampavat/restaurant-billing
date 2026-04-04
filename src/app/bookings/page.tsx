"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface BookingTable {
  id: string;
  number: number;
}

interface BookingData {
  id: string;
  guestName: string;
  guestPhone: string | null;
  guestCount: number;
  tableId: string;
  table: BookingTable;
  date: string;
  notes: string | null;
  status: string;
}

const statusColors: Record<string, string> = {
  CONFIRMED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  COMPLETED: "bg-gray-100 text-gray-700",
  NO_SHOW: "bg-orange-100 text-orange-700",
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [tables, setTables] = useState<{ id: string; number: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<BookingData | null>(null);
  const [filterDate, setFilterDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [filterStatus, setFilterStatus] = useState("");

  // Form fields
  const [formGuestName, setFormGuestName] = useState("");
  const [formGuestPhone, setFormGuestPhone] = useState("");
  const [formGuestCount, setFormGuestCount] = useState("2");
  const [formTableId, setFormTableId] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formNotes, setFormNotes] = useState("");

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date: filterDate });
      if (filterStatus) params.set("status", filterStatus);

      const [bookRes, tabRes] = await Promise.all([
        fetch(`/api/bookings?${params}`),
        fetch("/api/tables"),
      ]);
      const bookData = await bookRes.json();
      const tabData = await tabRes.json();
      setBookings(bookData.bookings || []);
      setTables(tabData.tables || []);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [filterDate, filterStatus]);

  function openAdd() {
    setEditingBooking(null);
    setFormGuestName("");
    setFormGuestPhone("");
    setFormGuestCount("2");
    setFormTableId(tables[0]?.id || "");
    setFormDate(filterDate);
    setFormTime("19:00");
    setFormNotes("");
    setDialogOpen(true);
  }

  function openEdit(b: BookingData) {
    setEditingBooking(b);
    setFormGuestName(b.guestName);
    setFormGuestPhone(b.guestPhone || "");
    setFormGuestCount(String(b.guestCount));
    setFormTableId(b.tableId);
    const d = new Date(b.date);
    setFormDate(d.toISOString().split("T")[0]);
    setFormTime(d.toTimeString().slice(0, 5));
    setFormNotes(b.notes || "");
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formGuestName || !formTableId || !formDate || !formTime)
      return toast.error("Please fill in all required fields");

    const dateTime = `${formDate}T${formTime}`;

    try {
      if (editingBooking) {
        const res = await fetch(`/api/bookings/${editingBooking.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guestName: formGuestName,
            guestPhone: formGuestPhone || undefined,
            guestCount: parseInt(formGuestCount),
            tableId: formTableId,
            date: dateTime,
            notes: formNotes || undefined,
          }),
        });
        if (!res.ok) throw new Error();
        toast.success("Booking updated");
      } else {
        const res = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guestName: formGuestName,
            guestPhone: formGuestPhone || undefined,
            guestCount: parseInt(formGuestCount),
            tableId: formTableId,
            date: dateTime,
            notes: formNotes || undefined,
          }),
        });
        if (!res.ok) throw new Error();
        toast.success("Booking created");
      }
      setDialogOpen(false);
      fetchData();
    } catch {
      toast.error("Something went wrong");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Cancel this booking?")) return;
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Booking cancelled");
      fetchData();
    } catch {
      toast.error("Failed to cancel booking");
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Bookings</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus size={16} />
          New Booking
        </button>
      </div>

      <div className="mb-4 flex gap-3">
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="COMPLETED">Completed</option>
          <option value="NO_SHOW">No Show</option>
        </select>
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : bookings.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
          No bookings for this date/status.
        </div>
      ) : (
        <div className="grid gap-3">
          {bookings.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between rounded-xl border bg-card px-5 py-4"
            >
              <div>
                <div className="flex items-center gap-3">
                  <p className="font-medium text-lg">{b.guestName}</p>
                  <Badge className={statusColors[b.status]} variant="secondary">
                    {b.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Party of {b.guestCount} &middot; Table {b.table.number}
                  {b.guestPhone && ` &middot; ${b.guestPhone}`}
                  {b.notes && ` &middot; ${b.notes}`}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {new Date(b.date).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(b.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(b)}
                    className="rounded-md p-2 hover:bg-muted"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="rounded-md p-2 hover:bg-red-50 text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBooking ? "Edit Booking" : "New Booking"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="guestName">Guest Name *</Label>
              <Input
                id="guestName"
                value={formGuestName}
                onChange={(e) => setFormGuestName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formGuestPhone}
                onChange={(e) => setFormGuestPhone(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guestCount">Number of Guests *</Label>
              <Input
                id="guestCount"
                type="number"
                min="1"
                value={formGuestCount}
                onChange={(e) => setFormGuestCount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="table">Table *</Label>
              <select
                id="table"
                value={formTableId}
                onChange={(e) => setFormTableId(e.target.value)}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    Table {t.number} ({t.number} seats)
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time *</Label>
                <Input
                  id="time"
                  type="time"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Special requests..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingBooking ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
