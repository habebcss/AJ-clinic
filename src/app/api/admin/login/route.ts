import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/helpers";

// بعد 5 محاولات فاشلة من نفس الـ IP خلال 15 دقيقة، نرفض الطلبات مؤقتاً.
const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

// تجزئة وهمية بنفس كلفة الحقيقية (10 جولات)، لسلسلة عشوائية رُميت فوراً.
// نقارن عليها لما الحساب مش موجود، حتى يتطابق زمن الرد وما ينكشف وجود الاسم.
// ما بتطابق أي كلمة مرور، ووجودها في الكود بلا ضرر.
const DUMMY_HASH = "$2a$10$gtjBs2hkn888pb4w5MNX9.UsdwgAUxCr7H5uzIV9rB3FEg2OaFrue";

// على Vercel الـ IP الحقيقي بييجي من x-forwarded-for، وأول قيمة هي العميل.
function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

export async function POST(request: NextRequest) {
  const { username, password } = await request.json().catch(() => ({}));
  if (!username || !password) {
    return NextResponse.json({ error: "اسم المستخدم وكلمة المرور مطلوبان" }, { status: 400 });
  }

  const name = String(username).trim();
  const ip = clientIp(request);
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000);

  const failures = await prisma.loginAttempt.count({ where: { ip, createdAt: { gte: since } } });
  if (failures >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: `محاولات كثيرة. حاول بعد ${WINDOW_MINUTES} دقيقة.` },
      { status: 429, headers: { "Retry-After": String(WINDOW_MINUTES * 60) } }
    );
  }

  const user = await prisma.staffUser.findUnique({ where: { username: name } });
  const ok = await bcrypt.compare(String(password), user?.passwordHash ?? DUMMY_HASH);

  if (!user || !ok) {
    await prisma.loginAttempt.create({ data: { ip, username: name } });
    // نفس الرسالة بالحالتين حتى ما نكشف إذا الاسم موجود أو لأ
    return NextResponse.json({ error: "اسم المستخدم أو كلمة السر غير صحيحة" }, { status: 401 });
  }

  // دخول ناجح: نصفّر عدّاد هذا الـ IP وننظّف السجلات المنتهية بنفس الاستعلام.
  await prisma.loginAttempt.deleteMany({
    where: { OR: [{ ip }, { createdAt: { lt: since } }] },
  });

  await createSession({ userId: user.id, name: user.name, role: user.role });
  return NextResponse.json({ success: true });
}
