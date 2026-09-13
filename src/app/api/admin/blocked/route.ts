import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, toDateOnly } from "@/lib/helpers";
import { ALL_SLOTS, slotsForPeriod } from "@/lib/slots";

// يعرض الأوقات المقفلة.
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const dateParam = request.nextUrl.searchParams.get("date");
  const where = dateParam ? { date: toDateOnly(dateParam) } : {};

  const blocked = await prisma.blockedSlot.findMany({
    where,
    orderBy: [{ date: "asc" }, { timeSlot: "asc" }],
  });

  return NextResponse.json({ blocked });
}

/**
 * يقفل وقت أو فترة أو يوم كامل.
 * scope: "slot"   + timeSlot  -> ساعة وحدة
 * scope: "period" + period    -> فترة كاملة (صباح/ظهر/مساء)
 * scope: "day"                -> اليوم كامل
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { date, scope = "slot", timeSlot, period, reason } = await request.json();
  if (!date) return NextResponse.json({ error: "التاريخ مطلوب" }, { status: 400 });

  // نحدد أي أوقات رح نقفل حسب النطاق المطلوب
  let targets: string[] = [];
  if (scope === "day") {
    targets = [...ALL_SLOTS];
  } else if (scope === "period") {
    targets = slotsForPeriod(period);
    if (targets.length === 0) {
      return NextResponse.json({ error: "فترة غير معروفة" }, { status: 400 });
    }
  } else {
    if (!timeSlot) return NextResponse.json({ error: "الوقت مطلوب" }, { status: 400 });
    targets = [timeSlot];
  }

  const day = toDateOnly(date);

  // ما نقفل وقت فيه حجز قائم — لازم الدكتور يلغي الحجز ويبلغ المريض أولاً.
  const conflicts = await prisma.appointment.findMany({
    where: { date: day, timeSlot: { in: targets }, status: { in: ["pending", "confirmed"] } },
    include: { patient: true },
    orderBy: { timeSlot: "asc" },
  });

  if (conflicts.length > 0) {
    const list = conflicts.map((c: { timeSlot: string; patient: { fullName: string } }) => `${c.timeSlot} — ${c.patient.fullName}`).join("، ");
    return NextResponse.json(
      {
        error:
          conflicts.length === 1
            ? `هذا الوقت محجوز باسم ${conflicts[0].patient.fullName}. ألغِ الحجز أولاً وأبلغ المريض.`
            : `في ${conflicts.length} مواعيد محجوزة ضمن هذه الفترة (${list}). ألغِها أولاً وأبلغ المرضى.`,
        conflicts: conflicts.map((c: { timeSlot: string; patient: { fullName: string } }) => ({ timeSlot: c.timeSlot, name: c.patient.fullName })),
      },
      { status: 409 }
    );
  }

  // نتجاهل اللي مقفول أصلاً بدل ما نرمي خطأ
  const result = await prisma.blockedSlot.createMany({
    data: targets.map((t) => ({ date: day, timeSlot: t, reason: reason?.trim() || null })),
    skipDuplicates: true,
  });

  return NextResponse.json({ success: true, added: result.count });
}

/**
 * يفتح وقت مقفل.
 * إما { id } لوقت واحد، أو { date, scope: "day" | "period", period } لمجموعة.
 */
export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id, date, scope, period } = await request.json();

  if (id) {
    await prisma.blockedSlot.delete({ where: { id } });
    return NextResponse.json({ success: true, removed: 1 });
  }

  if (!date) return NextResponse.json({ error: "معرّف أو تاريخ مطلوب" }, { status: 400 });

  const day = toDateOnly(date);
  const targets = scope === "period" ? slotsForPeriod(period) : [...ALL_SLOTS];

  const result = await prisma.blockedSlot.deleteMany({
    where: { date: day, timeSlot: { in: targets } },
  });

  return NextResponse.json({ success: true, removed: result.count });
}
