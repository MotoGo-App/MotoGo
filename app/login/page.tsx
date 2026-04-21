'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { AuthLayout } from '@/components/layouts/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail, Lock, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession() || {};
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  if (status === 'authenticated') {
    router.push('/client/dashboard');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);

    try {
      // Retry signIn up to 2 times for transient connection errors
      let result = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        });
        if (result?.ok || result?.error === 'CredentialsSignin') break;
        // If it's a server error (not invalid creds), wait and retry
        await new Promise(r => setTimeout(r, 1000));
      }

      if (result?.ok) {
        toast.success('Sesión iniciada');
        
        // Retry fetching user role
        let userData = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const response = await fetch(`/api/auth/user?t=${Date.now()}`, {
              cache: 'no-store',
              headers: { 'Cache-Control': 'no-cache' },
            });
            if (response.ok) {
              userData = await response.json();
              break;
            }
          } catch {
            // retry
          }
          await new Promise(r => setTimeout(r, 500));
        }
        
        if (userData?.role === 'CLIENT') {
          router.push('/client/dashboard');
        } else if (userData?.role === 'DRIVER') {
          if (userData?.isProfileComplete === false) {
            router.push('/driver/profile');
          } else {
            router.push('/driver/dashboard');
          }
        } else if (userData?.role === 'ADMIN') {
          router.push('/admin/dashboard');
        } else {
          // Fallback if user fetch fails
          router.push('/');
        }
      } else {
        const errorMsg = 'Usuario o contraseña incorrectos. Verifica tus datos e intenta de nuevo.';
        setLoginError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      const errorMsg = 'Error al iniciar sesión. Intenta de nuevo.';
      setLoginError(errorMsg);
      toast.error(errorMsg);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasError = loginError !== null;

  return (
    <AuthLayout title="Iniciar Sesión" description="Bienvenido de vuelta a MotoGo">
      <form onSubmit={handleSubmit} className="space-y-5">
        {loginError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3"
          >
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive font-medium leading-snug">{loginError}</p>
          </div>
        )}

        <div>
          <Label htmlFor="email" className="text-muted-foreground text-sm">Correo Electrónico</Label>
          <div className="relative mt-1.5">
            <Mail className={`absolute left-3 top-3 w-4 h-4 ${hasError ? 'text-destructive' : 'text-muted-foreground'}`} />
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              className={`pl-10 bg-secondary/50 text-foreground placeholder:text-muted-foreground/60 rounded-xl h-11 ${hasError ? 'border-destructive focus-visible:ring-destructive' : 'border-border/50'}`}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (loginError) setLoginError(null);
              }}
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="password" className="text-muted-foreground text-sm">Contraseña</Label>
          <div className="relative mt-1.5">
            <Lock className={`absolute left-3 top-3 w-4 h-4 ${hasError ? 'text-destructive' : 'text-muted-foreground'}`} />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className={`pl-10 bg-secondary/50 text-foreground placeholder:text-muted-foreground/60 rounded-xl h-11 ${hasError ? 'border-destructive focus-visible:ring-destructive' : 'border-border/50'}`}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (loginError) setLoginError(null);
              }}
              required
            />
          </div>
        </div>

        <div className="flex justify-end">
          <a href="/forgot-password" className="text-xs text-primary hover:underline font-medium">
            ¿Olvidaste tu contraseña?
          </a>
        </div>

        <Button
          type="submit"
          className="w-full h-12 text-base font-semibold rounded-xl shadow-lg shadow-primary/25"
          disabled={isLoading}
        >
          {isLoading ? 'Iniciando...' : 'Iniciar Sesión'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          ¿No tienes cuenta?{' '}
          <a href="/signup" className="text-primary hover:underline font-medium">
            Regístrate
          </a>
        </p>
      </form>
    </AuthLayout>
  );
}
