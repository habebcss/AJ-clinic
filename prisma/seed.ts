// شغّله مرة وحدة بعد تجهيز قاعدة البيانات:  npm run seed
// بينشئ حساب دخول واحد للوحة التحكم.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("changeme123", 10);

  await prisma.staffUser.upsert({
    where: { username: "dr.ahmad" },
    update: {},
    create: {
      name: "د. أحمد الجعفري",
      username: "dr.ahmad",
      passwordHash,
      role: "doctor",
    },
  });

  console.log("تم الإنشاء. الدخول: dr.ahmad / changeme123");
  console.log("مهم: غيّر كلمة المرور فوراً بالأمر: npm run set-login");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
