import { cookies } from "next/headers";
import {
  ACTIVE_ROLE_COOKIE,
  authContext,
  trustedRequestOrigin,
} from "@/lib/auth";
import type { UserRole } from "@/lib/domain";

export async function POST(request: Request) {
  const originError = trustedRequestOrigin(request);
  if (originError) return originError;
  const context = await authContext();
  if (!context)
    return Response.json({ error: "Sign in to continue" }, { status: 401 });
  const { role } = (await request.json()) as { role?: UserRole };
  if (!role || !context.roles.includes(role))
    return Response.json(
      { error: "That role is not assigned to your account" },
      { status: 403 },
    );
  (await cookies()).set(ACTIVE_ROLE_COOKIE, role, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return Response.json({ role });
}
