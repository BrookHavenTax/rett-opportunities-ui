import * as React from 'react';
import { MobileSidebar } from './Sidebar';

export interface TopBarProps {
  title: string;
  breadcrumb?: string;
  children?: React.ReactNode;
}

export function TopBar({ title, breadcrumb, children }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-brand-border bg-brand-light/85 px-5 backdrop-blur-md lg:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <MobileSidebar />
        <div className="flex min-w-0 flex-col">
          {breadcrumb ? (
            <span className="truncate text-xs text-brand-muted">{breadcrumb}</span>
          ) : null}
          <h1 className="truncate text-base font-bold leading-tight text-brand-navy">
            {title}
          </h1>
        </div>
      </div>
      {children ? (
        <div className="flex shrink-0 items-center gap-2">{children}</div>
      ) : null}
    </header>
  );
}
