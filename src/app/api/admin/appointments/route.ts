import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/helpers";

// تحديث حالة موعد: confirmed | cancelled
export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id, status } = await request.json().catch(() => ({}));
  if (!id || !["pending", "confirmed", "cancelled"].includes(status)) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: { status },
    include: { patient: true },
  });

  return NextResponse.json({ success: true, appointment: updated });
}

// حذف موعد نهائياً
export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await request.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "معرّف مطلوب" }, { status: 400 });

  await prisma.appointment.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
