'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { AuthLayout } from '@/components/layouts/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Mail, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const { status } = useSession() || {};
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: 'CLIENT',
  });

  if (status === 'authenticated') {
    router.push('/client/dashboard');
  }

  // Real-time password validation
  const passwordTooShort = formData.password.length > 0 && formData.password.length < 6;
  const passwordsDoNotMatch =
    formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword;
  const passwordsMatch =
    formData.confirmPassword.length > 0 &&
    formData.password === formData.confirmPassword &&
    formData.password.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSignupError(null);

    try {
      if (!acceptedPrivacy) {
        const msg = 'Debes aceptar el Aviso de Privacidad para continuar';
        setSignupError(msg);
        toast.error(msg);
        setIsLoading(false);
        return;
      }

      if (formData.password.length < 6) {
        const msg = 'La contraseña debe tener al menos 6 caracteres';
        setSignupError(msg);
        toast.error(msg);
        setIsLoading(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        const msg = 'Las contraseñas no coinciden. Verifica e intenta de nuevo.';
        setSignupError(msg);
        toast.error(msg);
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          role: formData.role,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        const msg = data.message || data.error || 'Error en el registro';
        setSignupError(msg);
        toast.error(msg);
        setIsLoading(false);
        return;
      }

      const signInResult = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (signInResult?.ok) {
        toast.success('Registro exitoso');
        if (formData.role === 'CLIENT') {
          router.push('/client/dashboard');
        } else if (formData.role === 'DRIVER') {
          router.push('/driver/dashboard');
        } else if (formData.role === 'ADMIN') {
          router.push('/admin/dashboard');
        }
      } else {
        const msg = 'Error al iniciar sesión';
        setSignupError(msg);
        toast.error(msg);
      }
    } catch (error) {
      const msg = 'Error al registrarse. Intenta de nuevo.';
      setSignupError(msg);
      toast.error(msg);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Crear Cuenta" description="Únete a la plataforma MotoGo">
      <form onSubmit={handleSubmit} className="space-y-4">
        {signupError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3"
          >
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive font-medium leading-snug">{signupError}</p>
          </div>
        )}

        <div>
          <Label htmlFor="name" className="text-muted-foreground text-sm">Nombre Completo</Label>
          <div className="relative mt-1.5">
            <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              id="name"
              type="text"
              placeholder="Tu nombre"
              className="pl-10 bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground/60 rounded-xl h-11"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="email" className="text-muted-foreground text-sm">Correo Electrónico</Label>
          <div className="relative mt-1.5">
            <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              className="pl-10 bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground/60 rounded-xl h-11"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="role" className="text-muted-foreground text-sm">Tipo de Cuenta</Label>
          <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
            <SelectTrigger className="mt-1.5 bg-secondary/50 border-border/50 text-foreground rounded-xl h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="CLIENT">Cliente</SelectItem>
              <SelectItem value="DRIVER">Conductor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="password" className="text-muted-foreground text-sm">Contraseña</Label>
          <div className="relative mt-1.5">
            <Lock
              className={`absolute left-3 top-3 w-4 h-4 ${
                passwordTooShort ? 'text-destructive' : 'text-muted-foreground'
              }`}
            />
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              className={`pl-10 bg-secondary/50 text-foreground placeholder:text-muted-foreground/60 rounded-xl h-11 ${
                passwordTooShort
                  ? 'border-destructive focus-visible:ring-destructive'
                  : 'border-border/50'
              }`}
              value={formData.password}
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value });
                if (signupError) setSignupError(null);
              }}
              required
              minLength={6}
            />
          </div>
          {passwordTooShort && (
            <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              La contraseña debe tener al menos 6 caracteres
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="confirmPassword" className="text-muted-foreground text-sm">Confirmar Contraseña</Label>
          <div className="relative mt-1.5">
            <Lock
              className={`absolute left-3 top-3 w-4 h-4 ${
                passwordsDoNotMatch
                  ? 'text-destructive'
                  : passwordsMatch
                    ? 'text-green-500'
                    : 'text-muted-foreground'
              }`}
            />
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Repite tu contraseña"
              className={`pl-10 bg-secondary/50 text-foreground placeholder:text-muted-foreground/60 rounded-xl h-11 ${
                passwordsDoNotMatch
                  ? 'border-destructive focus-visible:ring-destructive'
                  : passwordsMatch
                    ? 'border-green-500 focus-visible:ring-green-500'
                    : 'border-border/50'
              }`}
              value={formData.confirmPassword}
              onChange={(e) => {
                setFormData({ ...formData, confirmPassword: e.target.value });
                if (signupError) setSignupError(null);
              }}
              required
            />
            {passwordsMatch && (
              <CheckCircle2 className="absolute right-3 top-3 w-5 h-5 text-green-500" />
            )}
          </div>
          {passwordsDoNotMatch && (
            <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Las contraseñas no coinciden
            </p>
          )}
          {passwordsMatch && (
            <p className="mt-1.5 text-xs text-green-500 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Las contraseñas coinciden
            </p>
          )}
        </div>

        {/* Privacy Policy Acceptance */}
        <div className="flex items-start gap-3 pt-2">
          <Checkbox
            id="privacy"
            checked={acceptedPrivacy}
            onCheckedChange={(checked) => setAcceptedPrivacy(checked === true)}
            className="mt-0.5 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <Label
            htmlFor="privacy"
            className="text-sm text-muted-foreground leading-snug cursor-pointer"
          >
            He leído y acepto el{' '}
            <Link
              href="/privacidad"
              target="_blank"
              className="text-primary hover:underline font-medium"
            >
              Aviso de Privacidad
            </Link>
            {' '}y doy mi consentimiento para el tratamiento de mis datos personales.
          </Label>
        </div>

        <Button
          type="submit"
          className="w-full h-12 text-base font-semibold rounded-xl shadow-lg shadow-primary/25"
          disabled={
            isLoading ||
            !acceptedPrivacy ||
            passwordTooShort ||
            passwordsDoNotMatch ||
            formData.password.length === 0 ||
            formData.confirmPassword.length === 0
          }
        >
          {isLoading ? 'Registrando...' : 'Crear Cuenta'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{' '}
          <a href="/login" className="text-primary hover:underline font-medium">
            Inicia sesión
          </a>
        </p>
      </form>
    </AuthLayout>
  );
}
