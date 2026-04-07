"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Power, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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

interface Category {
  id: string;
  name: string;
  _count: { items: number };
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: string;
  category: Category;
  categoryId: string;
  isAvailable: boolean;
}

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [filterCategory, setFilterCategory] = useState("");

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false);

  async function fetchData() {
    setLoading(true);
    try {
      const [itemsRes, catRes] = await Promise.all([
        fetch("/api/menu-items", { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" }),
      ]);
      if (!itemsRes.ok || !catRes.ok) {
        let errMsg = "";
        if (!itemsRes.ok) {
          const errJson = await itemsRes.json().catch(() => ({}));
          errMsg = errJson.error || `menu items fetch failed (${itemsRes.status})`;
        } else {
          const errJson = await catRes.json().catch(() => ({}));
          errMsg = errJson.error || `categories fetch failed (${catRes.status})`;
        }
        throw new Error(errMsg);
      }
      const [itemsData, catData] = await Promise.all([itemsRes.json(), catRes.json()]);
      setItems(itemsData.items || []);
      setCategories(catData.categories || []);
    } catch (e: any) {
      console.error("fetchData error:", e);
      toast.error(e.message || "Failed to load menu data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function openAddDialog() {
    setEditingItem(null);
    setFormName("");
    setFormDescription("");
    setFormPrice("");
    setFormCategoryId(categories[0]?.id || "");
    setDialogOpen(true);
  }

  function openEditDialog(item: MenuItem) {
    setEditingItem(item);
    setFormName(item.name);
    setFormDescription(item.description || "");
    setFormPrice(String(parseFloat(item.price)));
    setFormCategoryId(item.categoryId);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName || !formPrice || !formCategoryId) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const method = editingItem ? "PUT" : "POST";
      const url = editingItem
        ? `/api/menu-items/${editingItem.id}`
        : "/api/menu-items";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          description: formDescription || undefined,
          price: parseFloat(formPrice),
          categoryId: formCategoryId,
        }),
      });

      if (!res.ok) throw new Error();
      toast.success(editingItem ? "Item updated" : "Item added");
      setDialogOpen(false);
      fetchData();
    } catch {
      toast.error("Something went wrong");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this menu item?")) return;
    try {
      const res = await fetch(`/api/menu-items/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Item deleted");
      fetchData();
    } catch {
      toast.error("Failed to delete");
    }
  }

  async function toggleAvailability(item: MenuItem) {
    try {
      const res = await fetch(
        `/api/menu-items/${item.id}/toggle-availability`,
        { method: "PATCH" }
      );
      if (!res.ok) throw new Error();
      await fetchData();
      toast.success(`Item ${item.isAvailable ? "unavailable" : "available"}`);
    } catch {
      toast.error("Failed to update");
    }
  }

  async function addCategory() {
    if (!newCategoryName.trim()) return;
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName }),
      });
      if (!res.ok) throw new Error();
      toast.success("Category added");
      setNewCategoryName("");
      setShowNewCategoryDialog(false);
      fetchData();
    } catch {
      toast.error("Failed to add category");
    }
  }

  const filtered = filterCategory
    ? items.filter((i) => i.categoryId === filterCategory)
    : items;

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Menu Management</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowNewCategoryDialog(true)}
            className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            <Plus size={16} />
            Category
          </button>
          <button
            onClick={openAddDialog}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus size={16} />
            New Item
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge
          onClick={() => setFilterCategory("")}
          className={`cursor-pointer ${!filterCategory ? "bg-primary" : "bg-muted text-muted-foreground"}`}
          variant={!filterCategory ? "default" : "secondary"}
        >
          All
        </Badge>
        {categories.map((cat) => (
          <Badge
            key={cat.id}
            onClick={() => setFilterCategory(cat.id)}
            className={`cursor-pointer ${filterCategory === cat.id ? "bg-primary" : "bg-muted text-muted-foreground"}`}
            variant={filterCategory === cat.id ? "default" : "secondary"}
          >
            {cat.name} ({cat._count.items})
          </Badge>
        ))}
      </div>

      {/* Menu items table */}
      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
          No menu items yet. Click "New Item" to add one.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Available</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow
                  key={item.id}
                  className={
                    item.isAvailable ? "" : "opacity-50"
                  }
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{item.category.name}</TableCell>
                  <TableCell className="font-medium">
                    Rs. {parseFloat(item.price).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={item.isAvailable}
                      onCheckedChange={() => toggleAvailability(item)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditDialog(item)}
                        className="rounded-md p-2 hover:bg-muted"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="rounded-md p-2 hover:bg-red-50 text-red-500"
                        title="Delete"
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

      {/* Add/Edit Menu Item Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Menu Item" : "Add Menu Item"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Butter Chicken"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price (Rs.) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <div className="flex gap-2">
                <select
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(e.target.value)}
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingItem ? "Update" : "Add Item"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={showNewCategoryDialog} onOpenChange={setShowNewCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNewCategoryDialog(false)}>
                Cancel
              </Button>
              <Button onClick={addCategory}>Add Category</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
