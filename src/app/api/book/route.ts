import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDateOnly } from "@/lib/helpers";
import { ALL_SLOTS } from "@/lib/slots";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });

  const { fullName, phone, service, date, timeSlot, note } = body;

  if (!fullName?.trim() || !phone?.trim() || !date || !timeSlot) {
    return NextResponse.json({ error: "الاسم والهاتف والتاريخ والوقت مطلوبة" }, { status: 400 });
  }
  if (!ALL_SLOTS.includes(timeSlot)) {
    return NextResponse.json({ error: "وقت غير صالح" }, { status: 400 });
  }

  const day = toDateOnly(date);

  // ما نسمح بحجز وقت مقفل
  const isBlocked = await prisma.blockedSlot.findFirst({ where: { date: day, timeSlot } });
  if (isBlocked) {
    return NextResponse.json({ error: "هذا الوقت غير متاح. اختر وقت ثاني." }, { status: 409 });
  }

  try {
    const patient = await prisma.patient.create({
      data: { fullName: fullName.trim(), phone: phone.trim() },
    });

    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        service: service || "استشارة عامة",
        date: day,
        timeSlot,
        note: note?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, appointmentId: appointment.id });
  } catch (error: unknown) {
    // القيد الفريد (date, timeSlot) بيمنع حجزين بنفس اللحظة
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json(
        { error: "للأسف انحجز هذا الوقت قبلك بلحظات. اختر وقت ثاني." },
        { status: 409 }
      );
    }
    console.error(error);
    return NextResponse.json({ error: "صار خطأ بالخادم" }, { status: 500 });
  }
}
