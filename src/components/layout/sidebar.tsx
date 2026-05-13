"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOut } from "@/app/login/actions";
import type { UserRole } from "@prisma/client";

const STORAGE_KEY = "sidebar-collapsed";

/**
 * ALL_NAV_ITEMS — Base navigation items for the app.
 * Add your project-specific routes here.
 * - roles: which roles can see this item
 * - prefetch: set to false for heavy pages with expensive DB queries on hover
 */
const ALL_NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    roles: ["ADMIN", "SUPERVISOR", "EJECUTIVO", "VIEWER", "FACTURACION"],
    prefetch: false,
  },
  // TODO: Add your app-specific nav items here, for example:
  // { label: "Casos",    href: "/casos",   icon: FolderOpen, roles: ["ADMIN", "SUPERVISOR", "EJECUTIVO", "VIEWER"], prefetch: false },
  // { label: "Facturas", href: "/facturas", icon: Receipt,    roles: ["ADMIN", "FACTURACION"] },
  {
    label: "Administración",
    href: "/admin",
    icon: Settings,
    roles: ["ADMIN"],
  },
];

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

interface Props {
  role: UserRole;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  open?: boolean;
  onClose?: () => void;
  /** Called instead of default Link navigation — enables isPending overlay. */
  navigate?: (href: string) => void;
  /** Href of the route currently being navigated to. */
  navigatingTo?: string | null;
}

export function Sidebar({ role, userName, userEmail, userAvatar, open, onClose, navigate, navigatingTo }: Props) {
  const pathname = usePathname();
  const navItems = ALL_NAV_ITEMS.filter((item) => item.roles.includes(role));

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setCollapsed(true);
  }, []);

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  }

  useEffect(() => {
    onClose?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "flex-shrink-0 flex flex-col relative transition-all duration-200",
          "fixed inset-y-0 left-0 z-40 md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          collapsed ? "md:w-12" : "w-56"
        )}
        style={{ backgroundColor: "#0F0F11" }}
      >
        {/* Logo */}
        <div className={cn(
          "h-14 flex items-center border-b border-white/8",
          collapsed ? "justify-center px-0" : "justify-between px-5 overflow-hidden"
        )}>
          {collapsed ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src="/logo-symbol.svg" alt=">" className="h-5 w-auto opacity-75" />
          ) : (
            <>
              <div className="flex flex-col items-center gap-0.5 flex-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.svg"
                  alt="Thinkion"
                  className="h-4 w-auto"
                  style={{ filter: "brightness(0) invert(1)" }}
                />
                {/* TODO: Update this subtitle with your app name */}
                <span
                  className="text-xs font-medium tracking-widest uppercase"
                  style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.15em" }}
                >
                  App
                </span>
              </div>
              <button
                onClick={onClose}
                className="md:hidden text-white/40 hover:text-white/70 transition-colors shrink-0"
              >
                <X size={16} />
              </button>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className={cn("flex-1 px-2 py-3 md:pt-5 space-y-0.5")}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
            const isNavigating = navigatingTo === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                prefetch={item.prefetch ?? undefined}
                onClick={navigate ? (e) => { e.preventDefault(); navigate(item.href); } : undefined}
                className={cn(
                  "flex items-center rounded-lg text-base transition-colors",
                  collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-3 py-2",
                  isActive
                    ? "text-white font-medium"
                    : "text-white/50 hover:text-white/80 hover:bg-white/5"
                )}
                style={isActive ? { backgroundColor: "rgba(107,78,255,0.15)" } : undefined}
              >
                <Icon
                  size={18}
                  className={cn("shrink-0", isNavigating && "opacity-60")}
                  style={isActive ? { color: "#9B83FF" } : undefined}
                />
                {!collapsed && <span className="flex-1">{item.label}</span>}
                {/* Loading pulse — only in expanded mode, while this item is navigating */}
                {!collapsed && isNavigating && (
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        {!collapsed && (
          <div className="px-3 py-3 border-t border-white/8 flex items-center gap-2.5">
            <Avatar className="w-7 h-7 shrink-0">
              <AvatarImage src={userAvatar} alt={userName} />
              <AvatarFallback
                className="text-xs font-medium text-white"
                style={{ backgroundColor: "#6B4EFF" }}
              >
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: "rgba(255,255,255,0.75)" }}>{userName}</p>
              <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{userEmail}</p>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                title="Cerrar sesión"
                className="text-white/30 hover:text-white/60 transition-colors"
              >
                <LogOut size={14} />
              </button>
            </form>
          </div>
        )}

        {/* Desktop collapse toggle — tab on right edge */}
        <button
          onClick={toggleCollapse}
          className={cn(
            "hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-50",
            "w-6 h-6 rounded-full items-center justify-center",
            "border border-white/10 shadow-sm transition-colors hover:bg-white/10"
          )}
          style={{ backgroundColor: "#1A1A1E" }}
          title={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
        >
          {collapsed
            ? <ChevronRight size={12} style={{ color: "rgba(255,255,255,0.5)" }} />
            : <ChevronLeft size={12} style={{ color: "rgba(255,255,255,0.5)" }} />
          }
        </button>
      </aside>
    </>
  );
}
