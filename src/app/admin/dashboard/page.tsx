import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/helpers";
import DashboardClient from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();

  // يتفحّص على الخادم، فما ينفع يتخطّى من المتصفح.
  if (!session) redirect("/admin/login");

  const appointments = await prisma.appointment.findMany({
    orderBy: [{ date: "asc" }, { timeSlot: "asc" }],
    include: { patient: true },
    take: 200,
  });

  return (
    <DashboardClient
      initialAppointments={JSON.parse(JSON.stringify(appointments))}
      role={session.role}
      name={session.name}
    />
  );
}
