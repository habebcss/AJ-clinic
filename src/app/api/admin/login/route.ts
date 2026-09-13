import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/helpers";

export async function POST(request: NextRequest) {
  const { username, password } = await request.json().catch(() => ({}));
  if (!username || !password) {
    return NextResponse.json({ error: "اسم المستخدم وكلمة المرور مطلوبان" }, { status: 400 });
  }

  const user = await prisma.staffUser.findUnique({ where: { username: String(username).trim() } });

  // نفس الرسالة بالحالتين حتى ما نكشف إذا الاسم موجود أو لأ
  const invalid = NextResponse.json({ error: "اسم المستخدم أو كلمة السر غير صحيحة" }, { status: 401 });
  if (!user) return invalid;

  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) return invalid;

  await createSession({ userId: user.id, name: user.name, role: user.role });
  return NextResponse.json({ success: true });
}
