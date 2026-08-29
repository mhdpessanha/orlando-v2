import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "orlando_session";

// O middleware só olha a presença do cookie (não dá pra usar Prisma aqui);
// a validação real da sessão acontece no layout protegido, no server.
export function middleware(req: NextRequest) {
  const hasCookie = req.cookies.has(SESSION_COOKIE);
  const { pathname } = req.nextUrl;

  // /login sempre renderiza — se o cookie for válido, a própria página manda pra home.
  // (Redirecionar aqui só pela presença do cookie criaria loop com cookie inválido.)
  if (pathname === "/login") {
    return NextResponse.next();
  }

  if (!hasCookie) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|icons/).*)"],
};
