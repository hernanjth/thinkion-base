"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { useNavigation } from "@/hooks/use-navigation";
import type { UserRole } from "@prisma/client";
import { Menu } from "lucide-react";

interface Props {
  role: UserRole;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  children: React.ReactNode;
}

export function AppShell({ role, userName, userEmail, userAvatar, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { navigate, isPending, navigatingTo } = useNavigation();

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        role={role}
        userName={userName}
        userEmail={userEmail}
        userAvatar={userAvatar}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        navigate={navigate}
        navigatingTo={navigatingTo}
      />
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile hamburger — no topbar on desktop */}
        <div className="md:hidden flex items-center px-3 pt-3 pb-1 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>
        </div>

        <main className="flex-1 overflow-auto p-4 md:p-6 md:px-8 md:pt-7 relative">
          {/*
           * Navigation overlay — appears immediately when navigate() is called
           * and disappears when the new page finishes rendering (isPending → false).
           * This prevents the user from seeing the previous page's content while
           * the next page loads, complementing the route-level loading.tsx.
           */}
          {isPending && (
            <div
              className="absolute inset-0 z-10 bg-white/85 backdrop-blur-[1px]"
              aria-hidden="true"
            />
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
