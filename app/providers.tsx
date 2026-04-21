'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/components/theme-provider';
import { PreventZoom } from '@/components/prevent-zoom';
import { CoverageNoticeDialog } from '@/components/coverage-notice-dialog';
import { ReactNode } from 'react';

export function Providers({
  children,
  session,
}: {
  children: ReactNode;
  session: any;
}) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <PreventZoom />
        <CoverageNoticeDialog />
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
