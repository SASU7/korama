import { cookies } from "next/headers";
import {
  ACTIVE_OPERATING_COMPANY_COOKIE,
  authContext,
  OPERATING_COMPANY_IDS,
  trustedRequestOrigin,
} from "@/lib/auth";

export async function POST(request: Request) {
  const originError = trustedRequestOrigin(request);
  if (originError) return originError;
  const context = await authContext();
  if (!context) return Response.json({ error: "Sign in to continue" }, { status: 401 });
  if (!context.isAdministrator)
    return Response.json({ error: "Only administrators can switch operating company" }, { status: 403 });
  const { operatingCompanyId } = (await request.json()) as { operatingCompanyId?: string };
  if (!OPERATING_COMPANY_IDS.includes(operatingCompanyId as typeof OPERATING_COMPANY_IDS[number]))
    return Response.json({ error: "Unknown operating company" }, { status: 400 });
  (await cookies()).set(ACTIVE_OPERATING_COMPANY_COOKIE, operatingCompanyId!, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return Response.json({ operatingCompanyId });
}
