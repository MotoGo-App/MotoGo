'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { MapPin, CheckCircle, Clock, DollarSign, ChevronUp, ChevronDown, X, List, Navigation, User } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { RideMap } from '@/components/map';
import { RatingModal } from '@/components/rating-modal';
import { RideChat } from '@/components/ride-chat';

interface Ride {
  id: string;
  originAddress: string;
  destinationAddress: string;
  originLatitude?: number | null;
  originLongitude?: number | null;
  destinationLatitude?: number | null;
  destinationLongitude?: number | null;
  status: string;
  fare: number | null;
  clientName?: string;
  createdAt: string;
  client?: { id: string; name: string; phone?: string | null; email?: string };
  clientId?: string;
}

interface DriverLocation {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
}

export default function DriverDashboard() {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const [profileChecked, setProfileChecked] = useState(false);
  const [rides, setRides] = useState<Ride[]>([]);

  // Guard: redirect to profile if driver hasn't completed their data
  useEffect(() => {
    const checkProfile = async () => {
      try {
        // cache-buster + no-store para asegurar que siempre obtenemos el estado más
        // reciente del perfil (evita loop "dashboard -> profile" tras guardar cambios).
        const res = await fetch(`/api/auth/user?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.role === 'DRIVER' && data.isProfileComplete === false) {
            router.replace('/driver/profile');
            return;
          }
        }
      } catch (e) {
        // ignore, let them stay
      }
      setProfileChecked(true);
    };
    checkProfile();
  }, [router]);
  const [isOnline, setIsOnline] = useState(false);
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [clientLocation, setClientLocation] = useState<DriverLocation | null>(null);
  const [showPanel, setShowPanel] = useState(true);
  const [panelView, setPanelView] = useState<'rides' | 'active'>('rides');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingRideId, setRatingRideId] = useState<string | null>(null);
  const [ratedRides, setRatedRides] = useState<Set<string>>(new Set());
  const [justCompletedRide, setJustCompletedRide] = useState<Ride | null>(null);
  const noSleepRef = useRef<any>(null);

  // NoSleep: mantener pantalla activa mientras el conductor está en línea
  // Usa un video invisible en loop (funciona en iOS Safari, Android Chrome, etc.)
  useEffect(() => {
    let noSleep: any = null;

    const initNoSleep = async () => {
      if (!noSleepRef.current) {
        const NoSleep = (await import('nosleep.js')).default;
        noSleep = new NoSleep();
        noSleepRef.current = noSleep;
      } else {
        noSleep = noSleepRef.current;
      }

      if (isOnline && statusLoaded) {
        try {
          await noSleep.enable();
          console.log('NoSleep activado - pantalla no se apagará');
        } catch (err) {
          console.log('NoSleep error:', err);
        }
      } else {
        try {
          noSleep.disable();
          console.log('NoSleep desactivado');
        } catch {}
      }
    };

    initNoSleep();

    return () => {
      if (noSleepRef.current) {
        try { noSleepRef.current.disable(); } catch {}
      }
    };
  }, [isOnline, statusLoaded]);

  // Cargar estado online/offline real desde la base de datos
  useEffect(() => {
    const loadStatus = async () => {
      // Intentar hasta 3 veces por si hay desconexión de DB
      for (let i = 0; i < 3; i++) {
        try {
          const res = await fetch('/api/drivers/status');
          if (res.ok) {
            const data = await res.json();
            setIsOnline(data.isOnline);
            setStatusLoaded(true);
            return;
          }
        } catch (e) {
          console.error(`Error cargando estado (intento ${i + 1}):`, e);
        }
        // Esperar antes de reintentar
        if (i < 2) await new Promise((r) => setTimeout(r, 1000));
      }
      // Si fallan todos los intentos, asumir offline pero permitir interacción
      setStatusLoaded(true);
    };
    loadStatus();
  }, []);

  // Cambiar estado online/offline en la base de datos con reintentos
  const handleToggleOnline = async () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus); // Actualización optimista

    // Activar/desactivar NoSleep desde el gesto del usuario (requerido por iOS)
    if (noSleepRef.current) {
      try {
        if (newStatus) {
          await noSleepRef.current.enable();
        } else {
          noSleepRef.current.disable();
        }
      } catch {}
    }

    // Intentar guardar en DB con reintentos
    let saved = false;
    for (let i = 0; i < 3; i++) {
      try {
        const res = await fetch('/api/drivers/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isOnline: newStatus }),
        });
        if (res.ok) {
          saved = true;
          toast.success(newStatus ? '¡Estás en línea! Recibirás viajes.' : 'Desconectado. No recibirás viajes.');
          break;
        }
      } catch (e) {
        console.error(`Error guardando estado (intento ${i + 1}):`, e);
      }
      if (i < 2) await new Promise((r) => setTimeout(r, 1000));
    }

    if (!saved) {
      // Solo revertir si TODOS los intentos fallaron
      setIsOnline(!newStatus);
      toast.error('Error al cambiar estado. Intenta de nuevo.');
    }
  };

  // Sincronizar estado online con la DB periódicamente (cada 30s)
  // Esto previene que se desincronice por errores transitorios
  useEffect(() => {
    if (!statusLoaded) return;

    const syncStatus = async () => {
      if (!isOnline) return; // Solo sincronizar si está online
      try {
        const res = await fetch('/api/drivers/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isOnline: true }),
        });
        // No revertir si falla — el usuario ya eligió estar online
      } catch (e) {
        // Ignorar errores de sincronización silenciosa
      }
    };

    const interval = setInterval(syncStatus, 30000);
    return () => clearInterval(interval);
  }, [isOnline, statusLoaded]);

  // Update geolocation using watchPosition for continuous real-time tracking
  useEffect(() => {
    if (!isOnline || !statusLoaded) return;
    if (!('geolocation' in navigator)) {
      toast.error('Tu navegador no soporta geolocalización');
      return;
    }

    let watchId: number | null = null;
    let sendInterval: ReturnType<typeof setInterval> | null = null;
    let latestLocation: DriverLocation | null = null;
    let permissionDenied = false;

    // Use watchPosition for continuous tracking
    const startWatching = (highAccuracy: boolean) => {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const location: DriverLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed,
            heading: position.coords.heading,
          };
          latestLocation = location;
          setDriverLocation(location);
        },
        (error) => {
          console.error('Geolocation error:', error.code, error.message);
          if (error.code === 1) {
            // Permission denied
            if (!permissionDenied) {
              permissionDenied = true;
              toast.error('Permite el acceso a tu ubicación para usar MotoGo. Activa el GPS en la configuración de tu navegador.');
            }
          } else if (error.code === 2) {
            // Position unavailable - retry with low accuracy
            if (highAccuracy && watchId !== null) {
              navigator.geolocation.clearWatch(watchId);
              startWatching(false);
            }
          }
          // code 3 = timeout, watchPosition will keep trying
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: 15000,
          maximumAge: 5000,
        }
      );
    };

    startWatching(true);

    // Send location to server every 5 seconds
    sendInterval = setInterval(() => {
      if (latestLocation) {
        fetch('/api/drivers/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(latestLocation),
        }).catch((error) => console.error('Error enviando ubicación:', error));
      }
    }, 5000);

    // Also do an immediate send
    const initialSendTimeout = setTimeout(() => {
      if (latestLocation) {
        fetch('/api/drivers/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(latestLocation),
        }).catch((error) => console.error('Error enviando ubicación:', error));
      }
    }, 2000);

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (sendInterval) clearInterval(sendInterval);
      clearTimeout(initialSendTimeout);
    };
  }, [isOnline, statusLoaded]);

  const fetchRides = useCallback(async () => {
    try {
      const response = await fetch('/api/rides');
      const data = await response.json();
      setRides(data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    fetchRides();
    const interval = setInterval(fetchRides, 5000);
    return () => clearInterval(interval);
  }, [fetchRides]);

  // Track previous active ride id so we only auto-switch view when it actually changes
  const prevActiveRideIdRef = useRef<string | null>(null);

  // Actualizar viaje seleccionado cuando hay viajes activos
  useEffect(() => {
    const activeRides = rides?.filter((r) => r.status === 'ACCEPTED' || r.status === 'IN_PROGRESS') ?? [];
    if (activeRides.length > 0) {
      const active = activeRides[0];
      setSelectedRide(active);
      // Solo cambiar a la vista "active" cuando RECIÉN se acepta un viaje (transición),
      // no en cada polling. Así respetamos la elección manual del conductor y además
      // al re-abrir el panel con "Ver viaje activo" siempre encontrará el viaje.
      if (prevActiveRideIdRef.current !== active.id) {
        setPanelView('active');
        setShowPanel(true);
        prevActiveRideIdRef.current = active.id;
      }
      // Usar las coordenadas reales del origen del viaje como ubicación del cliente
      if (active.originLatitude && active.originLongitude) {
        setClientLocation({
          latitude: active.originLatitude,
          longitude: active.originLongitude,
        });
      }
    } else {
      setSelectedRide(null);
      setClientLocation(null);
      prevActiveRideIdRef.current = null;
      setPanelView((prev) => (prev === 'active' ? 'rides' : prev));
    }
  }, [rides]);

  const handleAcceptRide = async (rideId: string) => {
    try {
      const response = await fetch('/api/drivers/accept-ride', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rideId }),
      });
      if (response.ok) {
        toast.success('¡Viaje aceptado!');
        fetchRides();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Error al aceptar viaje');
      }
    } catch (error) {
      toast.error('Error al aceptar viaje');
      console.error(error);
    }
  };

  const handleRejectRide = async (rideId: string) => {
    try {
      const response = await fetch('/api/drivers/reject-ride', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rideId }),
      });
      if (response.ok) {
        toast.info('Viaje rechazado');
        fetchRides();
      } else {
        toast.error('Error al rechazar viaje');
      }
    } catch (error) {
      toast.error('Error al rechazar viaje');
      console.error(error);
    }
  };

  const handleStartRide = async (rideId: string) => {
    try {
      const response = await fetch('/api/drivers/start-ride', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rideId }),
      });
      if (response.ok) {
        toast.success('¡Viaje iniciado! Lleva al pasajero a su destino 🚀');
        fetchRides();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Error al iniciar viaje');
      }
    } catch (error) {
      toast.error('Error al iniciar viaje');
      console.error(error);
    }
  };

  const handleCompleteRide = async (rideId: string) => {
    try {
      const response = await fetch('/api/drivers/complete-ride', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rideId }),
      });
      if (response.ok) {
        const completedRide = await response.json();
        toast.success('¡Viaje completado!');
        await fetchRides();
        setJustCompletedRide(completedRide);
        setRatingRideId(rideId);
        setShowRatingModal(true);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Error al completar viaje');
      }
    } catch (error) {
      toast.error('Error al completar viaje');
      console.error(error);
    }
  };

  const handleNotification = (message: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('MotoGo', { body: message });
    }
    toast.info(message);
  };

  // Solicitar permisos de notificación
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const availableRides = rides?.filter((r) => r.status === 'REQUESTED') ?? [];
  const completedRides = rides?.filter((r) => r.status === 'COMPLETED') ?? [];

  const handleRatingSubmitSuccess = () => {
    if (ratingRideId) {
      setRatedRides((prev) => new Set([...prev, ratingRideId]));
      setShowRatingModal(false);
      setJustCompletedRide(null);
    }
  };

  return (
    <div className="h-full w-full relative">
      {/* MAPA - Siempre visible como interfaz principal */}
      <div className="absolute inset-0">
        <RideMap
          driverLocation={driverLocation || undefined}
          clientLocation={clientLocation || undefined}
          rideStatus={selectedRide?.status}
          onNotificationNeeded={handleNotification}
          isDriverView={true}
        />
      </div>

      {/* Indicador de estado online/offline - esquina superior izquierda debajo del header */}
      <div className="absolute top-16 left-3 z-20 flex flex-col gap-1.5">
        <button
          onClick={handleToggleOnline}
          className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg font-semibold text-sm transition-all ${
            isOnline
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
          }`}
        >
          <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-white animate-pulse' : 'bg-muted-foreground/50'}`} />
          {isOnline ? 'En Línea' : 'Desconectado'}
        </button>
      </div>

      {/* Mini stats - esquina superior derecha debajo del header */}
      <div className="absolute top-16 right-3 z-20 flex gap-2">
        <Link href="/driver/profile">
          <Button
            size="sm"
            variant="outline"
            className="glass-card border-border/50 hover:bg-secondary/50 gap-2"
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Perfil</span>
          </Button>
        </Link>
        <div className="glass-card rounded-xl px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground">Viajes</p>
          <p className="text-sm font-bold text-primary">{completedRides.length}</p>
        </div>
      </div>

      {/* Botón para mostrar/ocultar panel inferior */}
      {!showPanel && (
        <button
          type="button"
          onClick={(e) => {
            // Garantizar que el click no sea absorbido por el mapa de Leaflet en Android.
            e.preventDefault();
            e.stopPropagation();
            // Al abrir el panel, seleccionar automáticamente la vista correcta:
            // - Si hay viaje activo, abrir en "Viaje Activo" (para poder Iniciar/Finalizar).
            // - Si no, abrir en "Disponibles".
            if (selectedRide) {
              setPanelView('active');
            } else {
              setPanelView('rides');
            }
            setShowPanel(true);
          }}
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 bg-primary text-primary-foreground rounded-full px-6 py-4 shadow-xl flex items-center gap-2 hover:bg-primary/90 active:scale-95 transition-all font-semibold min-h-[52px]"
        >
          <List className="w-5 h-5" />
          {selectedRide
            ? 'Ver viaje activo'
            : availableRides.length > 0
            ? `${availableRides.length} viaje${availableRides.length > 1 ? 's' : ''} disponible${availableRides.length > 1 ? 's' : ''}`
            : 'Ver viajes'}
        </button>
      )}

      {/* Panel inferior deslizable - estilo Uber */}
      {showPanel && (
        <div className="absolute bottom-0 left-0 right-0 z-30 max-h-[50vh] flex flex-col bg-card rounded-t-3xl shadow-2xl border-t border-border/30 transition-all">
          {/* Handle para arrastrar */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
          </div>

          {/* Header del panel */}
          <div className="flex items-center justify-between px-4 pb-2">
            <div className="flex gap-2">
              <button
                onClick={() => setPanelView('rides')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  panelView === 'rides'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                }`}
              >
                Disponibles ({availableRides.length})
              </button>
              {selectedRide && (
                <button
                  onClick={() => setPanelView('active')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    panelView === 'active'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  Viaje Activo
                </button>
              )}
            </div>
            <button
              onClick={() => setShowPanel(false)}
              className="p-1.5 rounded-full hover:bg-secondary"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Contenido del panel */}
          <div className="overflow-y-auto px-4 pb-6">
            {/* Vista de viaje activo */}
            {panelView === 'active' && selectedRide && (
              <div className="space-y-3">
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-4">
                    {/* Info del cliente en viaje activo */}
                    {selectedRide.client && (
                      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border/30">
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold flex-shrink-0">
                          {selectedRide.client.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{selectedRide.client.name}</p>
                          {selectedRide.client.phone && (
                            <a href={`tel:${selectedRide.client.phone}`} className="text-xs text-primary hover:underline">
                              📞 {selectedRide.client.phone}
                            </a>
                          )}
                        </div>
                        <Badge className={`text-xs ${
                          selectedRide.status === 'ACCEPTED' ? 'bg-blue-500/15 text-blue-400' : 'bg-green-500/15 text-green-400'
                        }`}>
                          {selectedRide.status === 'ACCEPTED' ? '🏍️ En camino' : '🚗 En viaje'}
                        </Badge>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow" />
                        <div className="w-0.5 h-8 bg-border" />
                        <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow" />
                      </div>
                      <div className="flex-1 space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Recoger en</p>
                          <p className="font-medium text-sm">{selectedRide.originAddress}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Destino</p>
                          <p className="font-medium text-sm">{selectedRide.destinationAddress}</p>
                        </div>
                      </div>
                    </div>
                    {/* ACCEPTED: Mostrar botón Iniciar Viaje (conductor llegó al cliente) */}
                    {selectedRide.status === 'ACCEPTED' && (
                      <Button
                        onClick={() => handleStartRide(selectedRide.id)}
                        className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-semibold"
                      >
                        <Navigation className="w-5 h-5 mr-2" />
                        Iniciar Viaje
                      </Button>
                    )}

                    {/* IN_PROGRESS: Mostrar botón Finalizar Viaje */}
                    {selectedRide.status === 'IN_PROGRESS' && (
                      <Button
                        onClick={() => handleCompleteRide(selectedRide.id)}
                        className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white h-12 text-base font-semibold"
                      >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Finalizar Viaje
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Vista de viajes disponibles */}
            {panelView === 'rides' && (
              <div className="space-y-3">
                {availableRides.length > 0 ? (
                  availableRides.map((ride) => (
                    <Card key={ride.id} className="border-border/30 hover:border-primary/30 hover:shadow-md transition-all">
                      <CardContent className="p-4">
                        {/* Info del cliente */}
                        {ride.client && (
                          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/30">
                            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                              {ride.client.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{ride.client.name}</p>
                              {ride.client.phone && (
                                <p className="text-xs text-muted-foreground">📞 {ride.client.phone}</p>
                              )}
                            </div>
                          </div>
                        )}
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                            <div className="w-0.5 h-6 bg-border" />
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{ride.originAddress}</p>
                            <p className="text-sm text-muted-foreground mt-1">{ride.destinationAddress}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(ride.createdAt).toLocaleString('es-MX')}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2 w-32">
                            <div className="flex gap-2 w-full">
                              <Button
                                size="sm"
                                onClick={() => handleAcceptRide(ride.id)}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                              >
                                Aceptar
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleRejectRide(ride.id)}
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                              >
                                Rechazar
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Clock className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-muted-foreground text-sm">Esperando viajes...</p>
                    <p className="text-muted-foreground/60 text-xs mt-1">Los nuevos viajes aparecerán aquí</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat - visible durante viajes ACCEPTED o IN_PROGRESS */}
      {selectedRide && session?.user?.id &&
        (selectedRide.status === 'ACCEPTED' || selectedRide.status === 'IN_PROGRESS') && (
        <RideChat rideId={selectedRide.id} currentUserId={session.user.id} />
      )}

      {/* Rating Modal - Aparece cuando se completa un viaje */}
      {justCompletedRide && (
        <RatingModal
          isOpen={showRatingModal}
          rideId={justCompletedRide.id}
          toUserId={justCompletedRide.client?.id || justCompletedRide.clientId || ''}
          toUserName={justCompletedRide.client?.name || justCompletedRide.clientName || 'Cliente'}
          isClientRating={false}
          userRole="DRIVER"
          onClose={() => {
            setShowRatingModal(false);
            setJustCompletedRide(null);
          }}
          onSubmitSuccess={handleRatingSubmitSuccess}
        />
      )}
    </div>
  );
}