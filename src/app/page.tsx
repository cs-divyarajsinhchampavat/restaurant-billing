import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Receipt, CalendarCheck, BookOpen, TrendingUp } from "lucide-react";

export default async function DashboardPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const paidToday = await prisma.bill.findMany({
    where: { issuedAt: { gte: today, lt: tomorrow } },
  });
  const openOrders = await prisma.order.count({ where: { status: "OPEN" } });
  const todayBookings = await prisma.booking.count({
    where: { date: { gte: today, lt: tomorrow }, status: "CONFIRMED" },
  });
  const upcomingBookings = await prisma.booking.findMany({
    where: { date: { gte: today }, status: "CONFIRMED" },
    orderBy: { date: "asc" },
    take: 5,
    include: { table: true },
  });

  const totalRevenue = paidToday.reduce(
    (sum, b) => sum + parseFloat(String(b.total)),
    0
  );

  const stats = [
    {
      label: "Today's Revenue",
      value: `Rs. ${formatCurrency(totalRevenue)}`,
      icon: TrendingUp,
      color: "text-green-600",
    },
    { label: "Open Orders", value: openOrders.toString(), icon: Receipt, color: "text-orange-600" },
    { label: "Today's Bookings", value: todayBookings.toString(), icon: CalendarCheck, color: "text-blue-600" },
    { label: "Menu Items", value: (await prisma.menuItem.count()).toString(), icon: BookOpen, color: "text-purple-600" },
  ];

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold">{stat.value}</p>
                </div>
                <Icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-8 flex gap-3">
        <Link href="/billing">
          <button className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
            <Receipt size={18} />
            New Order
          </button>
        </Link>
        <Link href="/bookings">
          <button className="flex items-center gap-2 rounded-lg border border-border bg-background px-6 py-3 text-sm font-medium transition hover:bg-muted">
            <CalendarCheck size={18} />
            View Bookings
          </button>
        </Link>
        <Link href="/menu">
          <button className="flex items-center gap-2 rounded-lg border border-border bg-background px-6 py-3 text-sm font-medium transition hover:bg-muted">
            <BookOpen size={18} />
            Manage Menu
          </button>
        </Link>
      </div>

      {upcomingBookings.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="border-b px-5 py-4">
            <h2 className="text-lg font-semibold">Upcoming Bookings</h2>
          </div>
          <div className="divide-y">
            {upcomingBookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-medium">{booking.guestName}</p>
                  <p className="text-sm text-muted-foreground">
                    Party of {booking.guestCount} &middot; Table {booking.table.number}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {new Date(booking.date).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(booking.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
