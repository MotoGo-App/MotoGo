'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const pathname = usePathname();

  const isMapPage = pathname === '/driver/dashboard';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated' && session?.user?.role !== 'DRIVER') {
      router.push('/');
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Para páginas con mapa (dashboard): layout fijo sin scroll
  if (isMapPage) {
    return (
      <div className="h-screen w-screen overflow-hidden relative">
        <header className="absolute top-0 left-0 right-0 z-50 pointer-events-none">
          <div className="flex justify-between items-center p-3">
            <div className="flex items-center glass-card rounded-xl px-3 py-2 pointer-events-auto">
              <Image 
                src="/motogo-logo.png" 
                alt="MotoGo" 
                width={100} 
                height={38}
                priority
                className="h-8 w-auto"
              />
            </div>
            <div className="flex items-center gap-2 pointer-events-auto">
              <span className="text-sm text-foreground glass-card rounded-xl px-3 py-2 font-medium">
                {session?.user?.name}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="glass-card border-border/50 hover:bg-secondary/50 rounded-xl"
                onClick={() => signOut({ callbackUrl: '/' })}
              >
                <LogOut className="w-4 h-4 text-foreground" />
              </Button>
            </div>
          </div>
        </header>
        <main className="h-full w-full">
          {children}
        </main>
      </div>
    );
  }

  // Para páginas normales (perfil, etc.): layout con scroll
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass-card border-b border-border/30">
        <div className="flex justify-between items-center px-4 py-3">
          <div className="flex items-center">
            <Image 
              src="/motogo-logo.png" 
              alt="MotoGo" 
              width={100} 
              height={38}
              priority
              className="h-8 w-auto"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {session?.user?.name}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="border-border/50 hover:bg-secondary/50"
              onClick={() => signOut({ callbackUrl: '/' })}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="pb-8">
        {children}
      </main>
    </div>
  );
}
