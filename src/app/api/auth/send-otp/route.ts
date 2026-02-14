import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateOTP, sendOTP } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = body;

    if (!phone || typeof phone !== "string") {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Normalize phone number (basic trim)
    const normalizedPhone = phone.trim();

    // Create user if they don't exist, or find existing
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await prisma.user.upsert({
      where: { phone: normalizedPhone },
      update: {
        otpCode: otp,
        otpExpiresAt,
      },
      create: {
        phone: normalizedPhone,
        otpCode: otp,
        otpExpiresAt,
      },
    });

    // Send OTP via SMS (mock in dev)
    const sent = await sendOTP(normalizedPhone, otp);

    if (!sent) {
      return NextResponse.json(
        { error: "Failed to send OTP" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "OTP sent" });
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
