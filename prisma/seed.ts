// إنشاء حساب الدخول الأول للوحة التحكم:  npm run seed
// كلمة المرور تُقرأ من SEED_ADMIN_PASSWORD في ملف .env — لازم تحدّدها قبل التشغيل.
// آمن للتكرار: إذا الحساب "ahmad" موجود أصلاً ما بيتغيّر شي — ولا حتى كلمة المرور.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) {
    throw new Error(
      "SEED_ADMIN_PASSWORD مفقود أو فاضي.\n" +
      "ضِف السطر التالي لملف .env ثم أعد التشغيل:\n" +
      '  SEED_ADMIN_PASSWORD="كلمة-مرور-قوية"'
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.staffUser.upsert({
    where: { username: "ahmad" },
    update: {},
    create: {
      name: "د. أحمد الجعفري",
      username: "ahmad",
      passwordHash,
      role: "doctor",
    },
  });

  console.log("✓ تم. حساب الدخول جاهز.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
