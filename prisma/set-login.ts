// تغيير اسم المستخدم و/أو كلمة المرور:  npm run set-login
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const prisma = new PrismaClient();

async function main() {
  const rl = readline.createInterface({ input, output });
  try {
    const users = await prisma.staffUser.findMany({ select: { username: true, name: true, role: true } });
    if (users.length === 0) {
      console.log("ما في أي حساب. شغّل أولاً: npm run seed");
      return;
    }
    console.log("\nالحسابات الموجودة:");
    users.forEach((u: { username: string; name: string; role: string }) => console.log(`  - ${u.username}   (${u.name} — ${u.role})`));
    console.log("");

    const current = (await rl.question("اسم المستخدم الحالي: ")).trim();
    const user = await prisma.staffUser.findUnique({ where: { username: current } });
    if (!user) { console.log(`\n✖ ما في حساب اسمه "${current}"`); return; }

    const raw = (await rl.question(`اسم المستخدم الجديد (Enter للإبقاء على "${current}"): `)).trim();
    const username = raw === "" ? current : raw;
    if (username !== current) {
      const taken = await prisma.staffUser.findUnique({ where: { username } });
      if (taken) { console.log(`\n✖ الاسم "${username}" مستخدم من حساب ثاني.`); return; }
    }

    const pw = (await rl.question("كلمة المرور الجديدة: ")).trim();
    if (pw.length < 8) { console.log("\n✖ لازم 8 خانات على الأقل. ما تم تغيير شي."); return; }
    const pw2 = (await rl.question("أعد كتابة كلمة المرور: ")).trim();
    if (pw !== pw2) { console.log("\n✖ كلمتا المرور مش متطابقتين. ما تم تغيير شي."); return; }

    await prisma.staffUser.update({
      where: { username: current },
      data: { username, passwordHash: await bcrypt.hash(pw, 10) },
    });
    console.log(`\n✓ تم. اسم المستخدم: ${username}`);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
