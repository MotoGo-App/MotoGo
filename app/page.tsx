'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MapPin, Shield, Star } from 'lucide-react';

export default function Home() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role) {
      if (session.user.role === 'CLIENT') {
        router.push('/client/dashboard');
      } else if (session.user.role === 'DRIVER') {
        router.push('/driver/dashboard');
      } else if (session.user.role === 'ADMIN') {
        router.push('/admin/dashboard');
      }
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center hero-gradient">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen hero-gradient flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        {/* Logo */}
        <div className="mb-8 animate-fade-in">
          <Image
            src="/motogo-logo.png"
            alt="MotoGo - Tu mototaxi seguro y rápido"
            width={300}
            height={164}
            priority
            unoptimized
            className="h-28 sm:h-32 w-auto drop-shadow-2xl"
          />
        </div>

        {/* Tagline */}
        <h2 className="text-xl sm:text-2xl font-bold font-display text-primary mb-2 text-center">
          ¡Usa MotoGo!
        </h2>
        <p className="text-muted-foreground text-base sm:text-lg mb-10 text-center max-w-md">
          Solicita tu mototaxi, llega a tu destino rápido y seguro
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <Button
            size="lg"
            onClick={() => router.push('/signup')}
            className="w-full text-lg font-semibold py-6 bg-primary hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/25"
          >
            Registrarse
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => router.push('/login')}
            className="w-full text-lg font-semibold py-6 border-2 border-primary/50 text-primary hover:bg-primary/10 rounded-xl"
          >
            Iniciar Sesión
          </Button>
        </div>
      </div>

      {/* Features Section */}
      <div className="px-4 pb-12 max-w-lg mx-auto w-full space-y-4">
        <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold font-display text-foreground">Mapa en Tiempo Real</h3>
            <p className="text-sm text-muted-foreground">Rastrea conductores cerca de ti al instante</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h3 className="font-semibold font-display text-foreground">Viajes Seguros</h3>
            <p className="text-sm text-muted-foreground">Conductores verificados para tu tranquilidad</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Star className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold font-display text-foreground">Sistema de Calificaciones</h3>
            <p className="text-sm text-muted-foreground">Mantén la calidad del servicio</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 border-t border-border/30">
        <div className="max-w-lg mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} MotoGo</p>
          <Link href="/privacidad" className="hover:text-primary transition-colors">
            Aviso de Privacidad
          </Link>
        </div>
      </footer>
    </div>
  );
}
