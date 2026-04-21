'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { AlertTriangle, MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

const DISMISS_KEY = 'motogo_coverage_notice_dismissed';
const SESSION_SHOWN_KEY = 'motogo_coverage_notice_shown_session';

export function CoverageNoticeDialog() {
  const { data: session, status } = useSession() || {};
  const [open, setOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Cuando el usuario cierra sesión, limpiar la marca de sesión
    // para que al volver a iniciar sesión se muestre el aviso de nuevo
    if (status === 'unauthenticated') {
      try {
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem(SESSION_SHOWN_KEY);
        }
      } catch {}
      return;
    }

    if (status !== 'authenticated') return;
    if (!session?.user) return;

    try {
      // Si el usuario ya marcó "no volver a mostrar", no mostrar nunca
      const dismissedForever =
        typeof window !== 'undefined' &&
        window.localStorage.getItem(DISMISS_KEY) === 'true';
      if (dismissedForever) return;

      // Si ya se mostró en esta sesión del navegador, no volver a mostrar hasta el siguiente login
      const shownInSession =
        typeof window !== 'undefined' &&
        window.sessionStorage.getItem(SESSION_SHOWN_KEY) === 'true';
      if (shownInSession) return;

      // Mostrar después de un pequeño delay para no interrumpir la transición de login
      const timer = setTimeout(() => {
        setOpen(true);
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(SESSION_SHOWN_KEY, 'true');
        }
      }, 800);

      return () => clearTimeout(timer);
    } catch (err) {
      // localStorage/sessionStorage pueden estar deshabilitados (modo incógnito estricto, etc.)
      console.warn('CoverageNoticeDialog: storage access error', err);
    }
  }, [mounted, status, session?.user]);

  const handleClose = (nextOpen: boolean) => {
    if (nextOpen) {
      setOpen(true);
      return;
    }

    if (dontShowAgain) {
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(DISMISS_KEY, 'true');
        }
      } catch (err) {
        console.warn('CoverageNoticeDialog: could not persist dismissal', err);
      }
    }
    setOpen(false);
  };

  if (!mounted) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <DialogTitle className="text-center text-lg">
            Área de cobertura
          </DialogTitle>
          <DialogDescription className="text-center text-base text-foreground/80 pt-2 leading-relaxed">
            <span className="block">
              ¡Recuerda que los servicios de mototaxis solo están disponibles en
              el pueblo!
            </span>
            <span className="block mt-3">
              No hay alcance hacia la{' '}
              <strong className="text-foreground">zona norte</strong>,{' '}
              <strong className="text-foreground">malecón</strong>,{' '}
              <strong className="text-foreground">Avenida Melgar</strong> y
              destinos aledaños.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-2 py-3">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            ¡Disfruta tu viaje!
          </span>
        </div>
        <p className="text-center text-xs text-muted-foreground italic -mt-2">
          — Equipo de MotoGo
        </p>

        <div className="flex items-center space-x-2 pt-2 border-t border-border/50 mt-2">
          <Checkbox
            id="coverage-dont-show"
            checked={dontShowAgain}
            onCheckedChange={(checked) => setDontShowAgain(checked === true)}
          />
          <label
            htmlFor="coverage-dont-show"
            className="text-sm text-muted-foreground cursor-pointer select-none"
          >
            No volver a mostrar este mensaje
          </label>
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={() => handleClose(false)}
            className="w-full"
          >
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
