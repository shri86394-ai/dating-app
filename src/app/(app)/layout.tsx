import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { BottomNav } from "./bottom-nav";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.status === "ONBOARDING") {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-dvh bg-background pb-20">
      <main>{children}</main>
      <BottomNav isAdmin={user.role === "ADMIN"} />
    </div>
  );
}
