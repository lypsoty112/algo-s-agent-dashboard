import { SignJWT, jwtVerify } from "jose";

export const COOKIE_NAME = "dashboard-token";

function getKey() {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) throw new Error("DASHBOARD_PASSWORD is not set");
  return new TextEncoder().encode(password);
}

export async function signToken(): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getKey());
}

export async function verifyToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getKey());
    return true;
  } catch {
    return false;
  }
}
