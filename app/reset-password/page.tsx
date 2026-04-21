'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthLayout } from '@/components/layouts/auth-layout';
import { toast } from 'sonner';
import { Lock, CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error('Enlace inválido. Solicita un nuevo enlace de recuperación.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        toast.success('¡Contraseña actualizada!');
      } else {
        toast.error(data.message || 'Error al restablecer la contraseña');
      }
    } catch (error) {
      toast.error('Error de conexión. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout title="Enlace inválido" description="No se encontró un token de recuperación válido">
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            El enlace que usaste es inválido o ha expirado. Solicita un nuevo enlace de recuperación.
          </p>
          <Link href="/forgot-password">
            <Button className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/25">
              Solicitar nuevo enlace
            </Button>
          </Link>
          <div>
            <Link
              href="/login"
              className="text-sm text-primary hover:underline font-medium inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout title="¡Contraseña actualizada!" description="Ya puedes iniciar sesión con tu nueva contraseña">
        <div className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-sm text-muted-foreground">
            Tu contraseña ha sido restablecida exitosamente.
          </p>
          <Button
            onClick={() => router.push('/login')}
            className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/25"
          >
            Iniciar sesión
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Nueva contraseña" description="Ingresa tu nueva contraseña">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password" className="text-muted-foreground text-sm">Nueva contraseña</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-11 bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground/60 rounded-xl"
              required
              minLength={6}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-muted-foreground text-sm">Confirmar contraseña</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Repite tu contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-11 bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground/60 rounded-xl"
              required
              minLength={6}
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/25"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Actualizando...
            </span>
          ) : (
            'Restablecer contraseña'
          )}
        </Button>

        <div className="text-center">
          <Link
            href="/login"
            className="text-sm text-primary hover:underline font-medium inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" />
            Volver al inicio de sesión
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <AuthLayout title="Cargando..." description="">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AuthLayout>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
