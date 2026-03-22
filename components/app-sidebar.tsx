"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, TrendingUp, Briefcase, BookOpen, Lightbulb, LogOut } from "lucide-react";
import logo from "@/images/algo-s-logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Performance", href: "/performance", icon: TrendingUp },
  { label: "Positions", href: "/positions", icon: Briefcase },
  { label: "Knowledge Base", href: "/knowledge-base", icon: BookOpen },
  { label: "Strategies", href: "/strategies", icon: Lightbulb },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();
  const [isLive, setIsLive] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/system-status")
      .then((r) => r.json())
      .then((d) => setIsLive(d.live ?? false))
      .catch(() => setIsLive(false));
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  function handleNavClick() {
    if (isMobile) setOpenMobile(false);
  }

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link href="/" />} size="lg" tooltip="algo-s">
              <Image
                src={logo}
                alt="algo-s logo"
                width={32}
                height={32}
                className="rounded-lg shrink-0"
              />
              <span className="font-semibold tracking-tight">algo-s</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navItems.map(({ label, href, icon: Icon }) => {
              const isActive =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    render={<Link href={href} />}
                    isActive={isActive}
                    tooltip={label}
                    onClick={handleNavClick}
                  >
                    <Icon />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="pointer-events-none">
              {isLive === null ? (
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 shrink-0" />
              ) : isLive ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 shrink-0" />
              )}
              <span className="text-sm text-muted-foreground">
                {isLive === null ? "—" : isLive ? "Live" : "Offline"}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip="Log out">
              <LogOut />
              <span className="text-sm text-muted-foreground">Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
