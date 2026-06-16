'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Upload, Menu, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: readonly NavItem[] = [
  { href: '/listings', label: 'Listings', icon: Building2 },
  { href: '/admin', label: 'Import / Admin', icon: Upload },
];

/** Shared nav-link list used by both the desktop Sidebar and the MobileSidebar. */
function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5 px-3">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-white/65 transition-colors hover:bg-white/[0.07] hover:text-white',
              active && 'bg-white/[0.07] text-white',
            )}
          >
            {active && (
              <span
                aria-hidden
                className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand-accent"
              />
            )}
            <Icon
              className={cn(
                'h-4 w-4 shrink-0 text-white/50 transition-colors group-hover:text-white',
                active && 'text-brand-accent',
              )}
            />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Brand lockup shown at the top of every sidebar surface. */
function SidebarBrand() {
  return (
    <div className="px-5 pb-4 pt-5">
      <div className="font-extrabold leading-none tracking-tight text-white">
        RETT DB
      </div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-brand-gold">
        Opportunities Database
      </div>
    </div>
  );
}

/** Fixed full-height navy sidebar — desktop only (lg and up). */
export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col bg-brand-navy text-white lg:flex">
      <SidebarBrand />
      <div className="mx-5 border-t border-white/10" />
      <div className="px-5 pb-2 pt-4">
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/35">
          Workspace
        </span>
      </div>
      <NavLinks />
      <div className="mt-auto px-5 py-4 text-xs text-white/30">
        Brookhaven &middot; Internal
      </div>
    </aside>
  );
}

/** Hamburger trigger + slide-in nav for small screens (below lg). */
export function MobileSidebar() {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open navigation"
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[260px] border-r-0 bg-brand-navy p-0 text-white"
      >
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SidebarBrand />
        <div className="mx-5 border-t border-white/10" />
        <div className="px-5 pb-2 pt-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/35">
            Workspace
          </span>
        </div>
        <NavLinks onNavigate={() => setOpen(false)} />
        <div className="mt-auto px-5 py-4 text-xs text-white/30">
          Brookhaven &middot; Internal
        </div>
      </SheetContent>
    </Sheet>
  );
}
