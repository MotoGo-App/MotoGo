'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Image from 'next/image';
import { Container } from '@/components/layouts/container';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession() || {};
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
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

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-card border-b border-border/30 sticky top-0 z-50">
        <Container size="lg">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Image 
                src="/motogo-logo.png" 
                alt="MotoGo" 
                width={120} 
                height={45}
                priority
                className="h-10 w-auto"
              />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{session?.user?.name}</span>
              <Button
                size="sm"
                variant="outline"
                className="border-border/50 hover:bg-secondary/50"
                onClick={() => signOut({ callbackUrl: '/' })}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>
        </Container>
      </header>
      <main className="py-8">
        {children}
      </main>
    </div>
  );
}
