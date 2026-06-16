import * as React from 'react';
import { Sidebar } from './Sidebar';

export interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-brand-light">
      <Sidebar />
      <div className="min-h-screen lg:pl-[260px]">{children}</div>
    </div>
  );
}
