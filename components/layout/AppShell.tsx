import * as React from 'react';

export interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  // No persistent nav sidebar — pages are full-width and navigate via top-bar
  // actions (Listings ⇄ Import/Admin).
  return <div className="min-h-screen bg-brand-light">{children}</div>;
}
