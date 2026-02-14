import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "blackout-dev-secret";

export interface JWTPayload {
  userId: string;
  role: string;
  status: string;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("blackout_token")?.value;

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });

  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("Forbidden");
  return user;
}

// OTP helpers
export function generateOTP(): string {
  if (process.env.OTP_MODE === "mock") {
    return "123456";
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOTP(phone: string, otp: string): Promise<boolean> {
  if (process.env.OTP_MODE === "mock") {
    console.log(`[MOCK OTP] Phone: ${phone}, Code: ${otp}`);
    return true;
  }

  // TODO: Integrate Twilio
  // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  // await client.verify.v2.services(process.env.TWILIO_SERVICE_SID).verifications.create({ to: phone, channel: 'sms' });
  return true;
}
