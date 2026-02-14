import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Build update data object from allowed fields
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) {
        return NextResponse.json(
          { error: "Name cannot be empty" },
          { status: 400 }
        );
      }
      updateData.name = name;
    }

    if (body.bio !== undefined) {
      const bio = String(body.bio).trim().slice(0, 500);
      updateData.bio = bio || null;
    }

    if (body.location !== undefined) {
      updateData.location = String(body.location).trim() || null;
    }

    if (body.gender !== undefined) {
      const validGenders = ["MALE", "FEMALE", "NON_BINARY", "OTHER"];
      if (!validGenders.includes(body.gender)) {
        return NextResponse.json(
          { error: "Invalid gender value" },
          { status: 400 }
        );
      }
      updateData.gender = body.gender;
    }

    if (body.preference !== undefined) {
      const validPreferences = ["MALE", "FEMALE", "EVERYONE"];
      if (!validPreferences.includes(body.preference)) {
        return NextResponse.json(
          { error: "Invalid preference value" },
          { status: 400 }
        );
      }
      updateData.preference = body.preference;
    }

    if (body.interests !== undefined) {
      if (!Array.isArray(body.interests)) {
        return NextResponse.json(
          { error: "Interests must be an array" },
          { status: 400 }
        );
      }
      updateData.interests = body.interests.map(String);
    }

    if (body.photos !== undefined) {
      if (!Array.isArray(body.photos)) {
        return NextResponse.json(
          { error: "Photos must be an array" },
          { status: 400 }
        );
      }
      if (body.photos.length > 6) {
        return NextResponse.json(
          { error: "Maximum 6 photos allowed" },
          { status: 400 }
        );
      }
      updateData.photos = body.photos.map(String);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        bio: true,
        location: true,
        gender: true,
        preference: true,
        interests: true,
        photos: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
