"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, MessageCircle, Clock, User, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/match", label: "Match", icon: Heart },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/history", label: "History", icon: Clock },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  const items = isAdmin
    ? [...NAV_ITEMS, { href: "/admin", label: "Admin", icon: Shield }]
    : NAV_ITEMS;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-4">
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-all",
                  isActive && "fill-primary"
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Safe area for mobile devices */}
      <div className="h-safe-area-inset-bottom" />
    </nav>
  );
}
