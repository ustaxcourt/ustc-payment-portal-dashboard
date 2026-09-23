import { NextResponse } from "next/server";
import { getFederatedLogoutUrl } from "@/lib/auth";

export async function GET(request: Request) {
  const logoutUrl = getFederatedLogoutUrl("/login");

  if (!logoutUrl) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.redirect(logoutUrl);
}
