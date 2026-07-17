import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

// Remove qualquer cookie de sessão presente na resposta. Usado quando o cookie
// existe mas não passa na validação (token expirado/inválido/de outro deploy),
// para não deixar um cookie "zumbi" travando o usuário num loop / -> /login -> /.
function clearSessionCookies(req: NextRequest, res: NextResponse) {
  for (const name of SESSION_COOKIE_NAMES) {
    if (req.cookies.has(name)) res.cookies.delete(name);
  }
}

export default async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const path = nextUrl.pathname;

  if (
    path.startsWith("/api/auth") ||
    path.startsWith("/api/feedback") ||
    path.startsWith("/avaliacao")
  ) {
    return NextResponse.next();
  }

  // getToken() por padrão procura o cookie sem o prefixo "__Secure-". Em produção
  // (HTTPS) o NextAuth grava o cookie COM esse prefixo, então detectamos pelo que
  // realmente veio na requisição em vez de assumir com base no ambiente.
  const secureCookie = req.cookies.has("__Secure-authjs.session-token") || req.cookies.has("__Secure-next-auth.session-token");
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET, secureCookie });

  if (path === "/login") {
    if (token) return NextResponse.redirect(new URL("/", nextUrl));
    const res = NextResponse.next();
    clearSessionCookies(req, res);
    return res;
  }

  if (!token) {
    const res = NextResponse.redirect(new URL("/login", nextUrl));
    clearSessionCookies(req, res);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)"],
};
