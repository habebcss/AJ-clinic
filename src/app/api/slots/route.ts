import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDateOnly } from "@/lib/helpers";
import { ALL_SLOTS } from "@/lib/slots";

// يرجع الأوقات الفاضية فعلياً بيوم معيّن (بعد طرح المحجوز والمقفل).
export async function GET(request: NextRequest) {
  const dateParam = request.nextUrl.searchParams.get("date");
  if (!dateParam) return NextResponse.json({ error: "التاريخ مطلوب" }, { status: 400 });

  const day = toDateOnly(dateParam);

  const [appointments, blocked] = await Promise.all([
    prisma.appointment.findMany({
      where: { date: day, status: { in: ["pending", "confirmed"] } },
      select: { timeSlot: true },
    }),
    prisma.blockedSlot.findMany({ where: { date: day }, select: { timeSlot: true } }),
  ]);

  const taken = new Set([
    ...appointments.map((a: { timeSlot: string }) => a.timeSlot),
    ...blocked.map((b: { timeSlot: string }) => b.timeSlot),
  ]);

  // ما نعرض أوقات فاتت لو التاريخ هو اليوم
  const isToday = dateParam === new Date().toISOString().slice(0, 10);
  const nowHM = new Date().toTimeString().slice(0, 5);

  const available = ALL_SLOTS.filter((s) => {
    if (taken.has(s)) return false;
    if (isToday && s <= nowHM) return false;
    return true;
  });

  return NextResponse.json({ available });
}
