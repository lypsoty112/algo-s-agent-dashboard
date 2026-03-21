"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import logo from "@/images/algo-s-logo.png";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Overview", href: "/" },
  { label: "Performance", href: "/performance" },
  { label: "Positions", href: "/positions" },
  { label: "Knowledge Base", href: "/knowledge-base" },
  { label: "Strategies", href: "/strategies" },
];

export function Nav({ lastUpdated }: { lastUpdated?: Date }) {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 bg-[#0f1117] border-b border-white/8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Image
            src={logo}
            alt="algo-s logo"
            width={32}
            height={32}
            className="rounded-lg"
          />
          <span className="text-sm font-semibold text-white tracking-tight">
            algo-s
          </span>
        </Link>

        {/* Tab navigation — hidden below md */}
        <div className="hidden md:flex">
          <NavigationMenu>
            <NavigationMenuList className="gap-0.5">
              {tabs.map((tab) => {
                const isActive =
                  tab.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(tab.href);
                return (
                  <NavigationMenuItem key={tab.href}>
                    <NavigationMenuLink
                      render={<Link href={tab.href} />}
                      className={cn(
                        "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                        "bg-transparent! hover:bg-white/8!",
                        isActive
                          ? "text-white!"
                          : "text-zinc-400! hover:text-white!"
                      )}
                    >
                      {tab.label}
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                );
              })}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Live indicator */}
        <Badge
          variant="outline"
          className="border-white/15 text-zinc-400 bg-transparent gap-1.5 shrink-0"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </Badge>
      </div>
    </nav>
  );
}
