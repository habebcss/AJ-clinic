// حماية افتراضية لكل ما تحت /admin و /api/admin.
// أي مسار جديد بيصير محمي تلقائياً — الاستثناء لازم يُكتب صراحةً في PUBLIC_PATHS.
// بيشتغل على Edge runtime، فما بينفع يستورد من "@/lib/helpers" لأنها تستعمل next/headers.
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// لازم يطابق COOKIE في src/lib/helpers.ts
const COOKIE = "clinic_session";

// المسارات العامة بالضرورة: صفحة الدخول، ومسارا الدخول والخروج.
const PUBLIC_PATHS = new Set([
  "/admin/login",
  "/api/admin/login",
  "/api/admin/logout",
]);

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(COOKIE)?.value;
  if (!token) return false;

  const secret = process.env.SESSION_SECRET;
  if (!secret) return false; // مفتاح مفقود = ما حدا مصرّح له (نفشل مغلقين)

  try {
    await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  // نشيل الشرطة الأخيرة حتى "/admin/login/" ما يوقع بحلقة إعادة توجيه
  const pathname = request.nextUrl.pathname.replace(/\/+$/, "") || "/";

  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();
  if (await isAuthenticated(request)) return NextResponse.next();

  // الـ API يرجّع 401، والصفحات تُحوَّل لتسجيل الدخول.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
