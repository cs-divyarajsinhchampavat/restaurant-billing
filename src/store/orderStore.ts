import { create } from "zustand";

export interface OrderItemData {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

interface OrderState {
  orderId: string | null;
  orderNumber: number | null;
  tableId: string | null;
  orderType: "DINE_IN" | "TAKE_AWAY";
  items: OrderItemData[];
  taxRate: number;
  discount: number;
  notes: string;
  status: string;

  setOrderId: (id: string) => void;
  setOrderNumber: (num: number) => void;
  setTableId: (id: string | null) => void;
  setOrderType: (type: "DINE_IN" | "TAKE_AWAY") => void;
  addItem: (item: { menuItemId: string; name: string; price: number }) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  incrementItem: (menuItemId: string) => void;
  decrementItem: (menuItemId: string) => void;
  setTaxRate: (rate: number) => void;
  setDiscount: (amount: number) => void;
  setNotes: (notes: string) => void;
  setStatus: (status: string) => void;
  loadFromOrder: (order: any) => void;
  reset: () => void;

  subtotal: () => number;
  tax: () => number;
  total: () => number;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orderId: null,
  orderNumber: null,
  tableId: null,
  orderType: "DINE_IN",
  items: [],
  taxRate: 5,
  discount: 0,
  notes: "",
  status: "OPEN",

  setOrderId: (id) => set({ orderId: id }),
  setOrderNumber: (num) => set({ orderNumber: num }),
  setTableId: (id) => set({ tableId: id }),
  setOrderType: (type) => set({ orderType: type }),

  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.menuItemId === item.menuItemId);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.menuItemId === item.menuItemId
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }
      return { items: [...state.items, { ...item, quantity: 1 }] };
    }),

  removeItem: (menuItemId) =>
    set((state) => ({
      items: state.items.filter((i) => i.menuItemId !== menuItemId),
    })),

  updateQuantity: (menuItemId, quantity) =>
    set((state) => ({
      items:
        quantity <= 0
          ? state.items.filter((i) => i.menuItemId !== menuItemId)
          : state.items.map((i) =>
              i.menuItemId === menuItemId ? { ...i, quantity } : i
            ),
    })),

  incrementItem: (menuItemId) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.menuItemId === menuItemId ? { ...i, quantity: i.quantity + 1 } : i
      ),
    })),

  decrementItem: (menuItemId) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.menuItemId === menuItemId
          ? { ...i, quantity: Math.max(0, i.quantity - 1) }
          : i
      ),
    })),

  setTaxRate: (rate) => set({ taxRate: rate }),
  setDiscount: (amount) => set({ discount: amount }),
  setNotes: (notes) => set({ notes }),
  setStatus: (status) => set({ status }),

  loadFromOrder: (order) => {
    const items = order.items.map((item: any) => ({
      menuItemId: item.menuItemId,
      name: item.menuItem?.name || "Unknown",
      price: parseFloat(String(item.unitPrice)) || 0,
      quantity: item.quantity,
      notes: item.notes || "",
    }));
    set({
      orderId: order.id,
      orderNumber: order.orderNumber,
      tableId: order.tableId,
      orderType: order.orderType || "DINE_IN",
      items,
      taxRate: parseFloat(String(order.tax)) || 5,
      discount: parseFloat(String(order.discount)) || 0,
      notes: order.notes || "",
      status: order.status,
    });
  },

  reset: () =>
    set({
      orderId: null,
      orderNumber: null,
      tableId: null,
      orderType: "DINE_IN",
      items: [],
      taxRate: 5,
      discount: 0,
      notes: "",
      status: "OPEN",
    }),

  subtotal: () =>
    get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),

  tax: () => get().subtotal() * (get().taxRate / 100),

  total: () => get().subtotal() + get().tax() - get().discount,
}));
