'use client';

import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-white group-[.toaster]:text-brand-text group-[.toaster]:border-brand-border group-[.toaster]:shadow-md group-[.toaster]:rounded-xl',
          description: 'group-[.toast]:text-brand-muted',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-brand-light group-[.toast]:text-brand-muted',
          error:
            'group-[.toaster]:!border-status-sold/30 group-[.toaster]:!text-status-sold',
          success: 'group-[.toaster]:!text-status-active',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
