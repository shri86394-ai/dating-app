import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.status === "ONBOARDING") {
    redirect("/onboarding");
  }

  if (user.role === "ADMIN") {
    redirect("/admin");
  }

  redirect("/match");
}
