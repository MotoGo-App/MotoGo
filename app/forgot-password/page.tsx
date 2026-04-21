'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthLayout } from '@/components/layouts/auth-layout';
import { toast } from 'sonner';
import { Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Ingresa tu correo electrónico');
      return;
    }
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setSent(true);
        toast.success('¡Correo enviado!');
      } else {
        toast.error(data.message || 'Error al enviar el correo');
      }
    } catch (error) {
      toast.error('Error de conexión. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title={sent ? '¡Correo enviado!' : 'Recuperar contraseña'}
      description={sent ? 'Revisa tu bandeja de entrada' : 'Te enviaremos un enlace para restablecer tu contraseña'}
    >
      {sent ? (
        <div className="space-y-4">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Si <strong className="text-foreground">{email}</strong> está registrado, recibirás un enlace para restablecer tu contraseña.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              El enlace expira en 1 hora. Revisa también tu carpeta de spam.
            </p>
          </div>

          <Button
            onClick={() => { setSent(false); setEmail(''); }}
            variant="outline"
            className="w-full h-11 rounded-xl border-border/50 hover:bg-secondary/50"
          >
            Enviar otro correo
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
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-muted-foreground text-sm">Correo electrónico</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-11 bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground/60 rounded-xl"
                required
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
                Enviando...
              </span>
            ) : (
              'Enviar enlace de recuperación'
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
      )}
    </AuthLayout>
  );
}
