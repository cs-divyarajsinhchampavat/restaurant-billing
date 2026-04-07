"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface TableData {
  id: string;
  number: number;
  capacity: number;
  status: string;
}

const statusColors: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-700",
  OCCUPIED: "bg-orange-100 text-orange-700",
  RESERVED: "bg-blue-100 text-blue-700",
};

export default function TablesPage() {
  const [tables, setTables] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableData | null>(null);
  const [formNumber, setFormNumber] = useState("");
  const [formCapacity, setFormCapacity] = useState("4");
  const [formStatus, setFormStatus] = useState("AVAILABLE");

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/api/tables", { cache: "no-store" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to load tables (${res.status})`);
      }
      const data = await res.json();
      setTables(data.tables || []);
    } catch (e: any) {
      console.error("fetchData error:", e);
      toast.error(e.message || "Failed to load tables");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function openAdd() {
    setEditingTable(null);
    setFormNumber("");
    setFormCapacity("4");
    setFormStatus("AVAILABLE");
    setDialogOpen(true);
  }

  function openEdit(t: TableData) {
    setEditingTable(t);
    setFormNumber(String(t.number));
    setFormCapacity(String(t.capacity));
    setFormStatus(t.status);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formNumber) return toast.error("Table number is required");

    try {
      if (editingTable) {
        const res = await fetch(`/api/tables/${editingTable.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            number: parseInt(formNumber),
            capacity: parseInt(formCapacity),
            status: formStatus,
          }),
        });
        if (!res.ok) throw new Error();
        toast.success("Table updated");
      } else {
        const res = await fetch("/api/tables", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            number: parseInt(formNumber),
            capacity: parseInt(formCapacity),
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to add table");
        }
        toast.success("Table added");
      }
      setDialogOpen(false);
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this table?")) return;
    try {
      const res = await fetch(`/api/tables/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Table deleted");
      fetchData();
    } catch {
      toast.error("Failed to delete");
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Table Management</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus size={16} />
          Add Table
        </button>
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : tables.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
          No tables yet. Click "Add Table" to create one.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Table #</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tables.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">Table {t.number}</TableCell>
                  <TableCell>{t.capacity} seats</TableCell>
                  <TableCell>
                    <Badge className={statusColors[t.status]}>
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(t)}
                        className="rounded-md p-2 hover:bg-muted"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="rounded-md p-2 hover:bg-red-50 text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTable ? "Edit Table" : "Add Table"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="number">Table Number *</Label>
              <Input
                id="number"
                type="number"
                min="1"
                value={formNumber}
                onChange={(e) => setFormNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                value={formCapacity}
                onChange={(e) => setFormCapacity(e.target.value)}
              />
            </div>
            {editingTable && (
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="OCCUPIED">Occupied</option>
                  <option value="RESERVED">Reserved</option>
                </select>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingTable ? "Update" : "Add Table"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
