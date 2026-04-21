'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { MapPin, Plus, History, X, Clock, Navigation, Star, ChevronUp, Crosshair } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RideMap } from '@/components/map';
import { RatingModal } from '@/components/rating-modal';
import { RideChat } from '@/components/ride-chat';

interface DriverProfile {
  vehicleModel: string;
  vehiclePlate: string;
  mototaxiNumber?: string | null;
  averageRating: number;
  totalRides: number;
  profilePhotoUrl?: string | null;
  bio?: string | null;
  location?: { latitude: number; longitude: number } | null;
}

interface Ride {
  id: string;
  originAddress: string;
  destinationAddress: string;
  status: string;
  fare: number | null;
  createdAt: string;
  driverId?: string | null;
  driverName?: string;
  driver?: {
    id: string;
    name: string;
    email?: string;
    phone?: string | null;
    driverProfile?: DriverProfile | null;
  } | null;
}

interface DriverInfo {
  id: string;
  user: { name: string };
  location: { latitude: number; longitude: number } | null;
  averageRating: number;
}

interface UserLocation {
  latitude: number;
  longitude: number;
}

interface DriverLocationData {
  latitude: number;
  longitude: number;
  speed?: number | null;
}

export default function ClientDashboard() {
  const { data: session } = useSession() || {};
  const [rides, setRides] = useState<Ride[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [nearbyDrivers, setNearbyDrivers] = useState<DriverInfo[]>([]);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocationData | null>(null);
  const [showPanel, setShowPanel] = useState(true);
  const [panelView, setPanelView] = useState<'request' | 'active' | 'history'>('request');
  const [isLocating, setIsLocating] = useState(false);
  const [centerTrigger, setCenterTrigger] = useState(0);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rideToRate, setRideToRate] = useState<Ride | null>(null);
  const [ratedRides, setRatedRides] = useState<Set<string>>(new Set());
  const [previousActiveRideId, setPreviousActiveRideId] = useState<string | null>(null);

  // Obtener ubicación del cliente en tiempo real usando watchPosition
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setUserLocation({ latitude: 25.6866, longitude: -100.3161 });
      return;
    }

    let initialCentered = false;
    let watchId: number | null = null;
    let permissionDenied = false;

    const startWatching = (highAccuracy: boolean) => {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          if (!initialCentered) {
            initialCentered = true;
            setCenterTrigger((prev) => prev + 1);
          }
        },
        (error) => {
          console.error('Geolocation error:', error.code, error.message);
          if (error.code === 1 && !permissionDenied) {
            permissionDenied = true;
            toast.error('Permite el acceso a tu ubicación para mejor experiencia.');
            // Set fallback only on permission denied
            setUserLocation({ latitude: 25.6866, longitude: -100.3161 });
          } else if (error.code === 2 && highAccuracy && watchId !== null) {
            // Position unavailable with high accuracy, retry with low
            navigator.geolocation.clearWatch(watchId);
            startWatching(false);
          }
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    };

    startWatching(true);

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Obtener conductores disponibles cercanos (filtrados por 10km)
  const fetchDrivers = useCallback(async () => {
    try {
      let url = '/api/drivers';
      if (userLocation) {
        url += `?lat=${userLocation.latitude}&lng=${userLocation.longitude}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      setNearbyDrivers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al obtener conductores:', error);
    }
  }, [userLocation]);

  useEffect(() => {
    fetchDrivers();
    const interval = setInterval(fetchDrivers, 8000);
    return () => clearInterval(interval);
  }, [fetchDrivers]);

  // Obtener viajes del cliente
  const fetchRides = useCallback(async () => {
    try {
      const response = await fetch('/api/rides');
      const data = await response.json();
      setRides(data);

      // Verificar si hay un viaje activo
      const active = data.find((r: Ride) =>
        r.status === 'ACCEPTED' || r.status === 'IN_PROGRESS' || r.status === 'REQUESTED'
      );
      if (active) {
        setActiveRide(active);
        setPreviousActiveRideId(active.id);
        setPanelView('active');
        // Driver location is now handled by dedicated polling useEffect
      } else {
        // No hay viaje activo - verificar si el viaje anterior se completó
        if (previousActiveRideId && !ratedRides.has(previousActiveRideId)) {
          const completedRide = data.find(
            (r: Ride) => r.id === previousActiveRideId && r.status === 'COMPLETED'
          );
          if (completedRide && !showRatingModal) {
            setRideToRate(completedRide);
            setShowRatingModal(true);
          }
        }
        setActiveRide(null);
        setDriverLocation(null);
        if (panelView === 'active') setPanelView('request');
      }
    } catch (error) {
      console.error(error);
    }
  }, [panelView, previousActiveRideId, ratedRides, showRatingModal]);

  useEffect(() => {
    fetchRides();
    const interval = setInterval(fetchRides, 5000);
    return () => clearInterval(interval);
  }, [fetchRides]);

  // Polling dedicado para la ubicación del conductor durante viajes activos
  useEffect(() => {
    if (!activeRide || !activeRide.driverId || activeRide.status === 'REQUESTED') return;

    let isMounted = true;

    const fetchDriverLocation = async () => {
      try {
        const res = await fetch(`/api/drivers/location?driverId=${activeRide.driverId}`);
        if (res.ok && isMounted) {
          const loc = await res.json();
          if (loc && loc.latitude && loc.longitude) {
            setDriverLocation({
              latitude: loc.latitude,
              longitude: loc.longitude,
              speed: loc.speed ?? null,
            });
          }
        }
      } catch (e) {
        console.error('Error polling driver location:', e);
      }
    };

    // Fetch immediately
    fetchDriverLocation();
    // Then every 3 seconds for near-real-time updates
    const interval = setInterval(fetchDriverLocation, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeRide?.id, activeRide?.driverId, activeRide?.status]);

  // Los conductores aceptan viajes manualmente desde su dashboard.
  // El cliente simplemente espera a que un conductor acepte su viaje.

  // Reverse geocoding helper
  const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'es' } }
      );

      if (response.ok) {
        const data = await response.json();
        const addr = data.address;
        const parts = [
          addr.road || addr.pedestrian || addr.street || '',
          addr.house_number || '',
          addr.neighbourhood || addr.suburb || '',
          addr.city || addr.town || addr.village || '',
        ].filter(Boolean);
        return parts.join(', ') || data.display_name?.split(',').slice(0, 3).join(',') || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }
    } catch (e) {
      console.error('Error en reverse geocoding:', e);
    }
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  };

  // Obtener dirección a partir de coordenadas (reverse geocoding)
  const handleGetMyLocation = async () => {
    setIsLocating(true);
    try {
      let latitude: number;
      let longitude: number;

      if ('geolocation' in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 8000,
              maximumAge: 60000,
            });
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        } catch (geoError: any) {
          // Si el GPS falla, usar ubicación actual del estado o fallback
          if (userLocation) {
            latitude = userLocation.latitude;
            longitude = userLocation.longitude;
          } else {
            // Fallback: Monterrey centro
            latitude = 25.6866;
            longitude = -100.3161;
          }
          if (geoError?.code === 1) {
            toast.info('Usando ubicación aproximada. Permite GPS para mayor precisión.');
          }
        }
      } else {
        // Sin soporte de geolocalización
        latitude = userLocation?.latitude || 25.6866;
        longitude = userLocation?.longitude || -100.3161;
      }

      setUserLocation({ latitude, longitude });
      setCenterTrigger((prev) => prev + 1);
      const address = await reverseGeocode(latitude, longitude);
      setOrigin(address);
      toast.success('¡Ubicación detectada!');
    } catch (error) {
      toast.error('No se pudo obtener tu ubicación');
      console.error('Error de geolocalización:', error);
    } finally {
      setIsLocating(false);
    }
  };

  const handleRequestRide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination) {
      toast.error('Ingresa origen y destino');
      return;
    }
    setIsLoading(true);

    try {
      const loc = userLocation || { latitude: 25.6866, longitude: -100.3161 };
      const response = await fetch('/api/rides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originAddress: origin,
          originLatitude: loc.latitude,
          originLongitude: loc.longitude,
          destinationAddress: destination,
          destinationLatitude: loc.latitude + 0.01,
          destinationLongitude: loc.longitude + 0.01,
        }),
      });

      if (!response.ok) {
        toast.error('Error al solicitar viaje');
        return;
      }

      const newRide = await response.json();
      setRides([newRide, ...rides]);
      setActiveRide(newRide);
      setPanelView('active');
      setOrigin('');
      setDestination('');
      if (newRide.driver) {
        toast.success(`¡Conductor ${newRide.driver.name} asignado! Ya va en camino 🏍️`);
      } else {
        toast.success('¡Viaje solicitado! Buscando conductor cercano...');
      }
    } catch (error) {
      toast.error('Error al solicitar viaje');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRide = async () => {
    if (!activeRide) return;
    try {
      const response = await fetch('/api/rides/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rideId: activeRide.id }),
      });
      if (!response.ok) {
        const data = await response.json();
        toast.error(data.message || 'Error al cancelar el viaje');
        return;
      }
      toast.success('Viaje cancelado');
      setActiveRide(null);
      setPanelView('request');
      fetchRides();
    } catch (error) {
      toast.error('Error al cancelar el viaje');
      console.error(error);
    }
  };

  const handleNotification = (message: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('MotoGo', { body: message });
    }
    toast.info(message);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const completedRides = rides.filter((r) => r.status === 'COMPLETED');

  const handleRatingSubmitSuccess = () => {
    if (rideToRate) {
      setRatedRides((prev) => new Set([...prev, rideToRate.id]));
    }
    setShowRatingModal(false);
    setRideToRate(null);
    setPreviousActiveRideId(null);
  };

  return (
    <div className="h-full w-full relative">
      {/* MAPA - Siempre visible como interfaz principal */}
      <div className="absolute inset-0">
        <RideMap
          driverLocation={driverLocation || undefined}
          clientLocation={userLocation || undefined}
          rideStatus={activeRide?.status}
          onNotificationNeeded={handleNotification}
          centerTrigger={centerTrigger}
        />
      </div>

      {/* Indicador de conductores cercanos */}
      <div className="absolute top-20 left-4 z-20">
        <div className="glass-card rounded-xl px-3 py-2 flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium text-foreground">
            {nearbyDrivers.length} conductor{nearbyDrivers.length !== 1 ? 'es' : ''} disponible{nearbyDrivers.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Viaje activo - indicador superior derecho */}
      {activeRide && (
        <div className="absolute top-20 right-4 z-20">
          <div className="bg-primary text-primary-foreground rounded-xl shadow-lg px-3 py-2 text-center">
            <p className="text-xs opacity-80">Viaje activo</p>
            <p className="text-sm font-bold">
              {activeRide.status === 'REQUESTED' ? 'Buscando...' :
               activeRide.status === 'ACCEPTED' ? 'En camino' :
               activeRide.status === 'IN_PROGRESS' ? 'En viaje' : activeRide.status}
            </p>
          </div>
        </div>
      )}

      {/* Botón para mostrar panel si está oculto */}
      {!showPanel && (
        <button
          onClick={() => setShowPanel(true)}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-primary text-primary-foreground rounded-full px-6 py-3 shadow-lg flex items-center gap-2 hover:bg-primary/90 transition-all"
        >
          <ChevronUp className="w-4 h-4" />
          {activeRide ? 'Ver viaje activo' : 'Solicitar viaje'}
        </button>
      )}

      {/* Panel inferior deslizable - estilo Uber */}
      {showPanel && (
        <div className="absolute bottom-0 left-0 right-0 z-30 max-h-[55vh] flex flex-col bg-card rounded-t-3xl shadow-2xl border-t border-border/30">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
          </div>

          {/* Header del panel */}
          <div className="flex items-center justify-between px-4 pb-2">
            <div className="flex gap-2">
              <button
                onClick={() => setPanelView('request')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  panelView === 'request'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                }`}
              >
                <span className="flex items-center gap-1"><Plus className="w-3 h-3" /> Solicitar</span>
              </button>
              {activeRide && (
                <button
                  onClick={() => setPanelView('active')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    panelView === 'active'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  <span className="flex items-center gap-1"><Navigation className="w-3 h-3" /> Viaje</span>
                </button>
              )}
              <button
                onClick={() => setPanelView('history')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  panelView === 'history'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                }`}
              >
                <span className="flex items-center gap-1"><History className="w-3 h-3" /> Historial</span>
              </button>
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
            {/* Solicitar viaje */}
            {panelView === 'request' && (
              <form onSubmit={handleRequestRide} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-card shadow" />
                    <div className="w-0.5 h-8 bg-border" />
                    <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="relative flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-green-500" />
                        <Input
                          placeholder="¿Dónde estás?"
                          className="pl-10 pr-3 h-10 bg-secondary/50 border-border/50"
                          value={origin}
                          onChange={(e) => setOrigin(e.target.value)}
                          required
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleGetMyLocation}
                        disabled={isLocating}
                        className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        title="Usar mi ubicación actual"
                      >
                        {isLocating ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Crosshair className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-red-500" />
                      <Input
                        placeholder="¿A dónde vas?"
                        className="pl-10 h-10 bg-secondary/50 border-border/50"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Buscando conductor...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Navigation className="w-4 h-4" />
                      Solicitar MotoGo
                    </span>
                  )}
                </Button>

                {/* Conductores cercanos */}
                {nearbyDrivers.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground mb-2">Conductores cerca de ti</p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {nearbyDrivers.slice(0, 5).map((driver) => (
                        <div
                          key={driver.id}
                          className="flex-shrink-0 bg-secondary/50 rounded-lg px-3 py-2 border border-border/30"
                        >
                          <p className="text-xs font-medium text-foreground">{driver.user.name}</p>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            <span className="text-xs text-muted-foreground">{driver.averageRating.toFixed(1)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </form>
            )}

            {/* Viaje activo */}
            {panelView === 'active' && activeRide && (
              <div className="space-y-3">
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-4">
                    {/* Estado del viaje */}
                    <div className="flex items-center justify-between mb-3">
                      <Badge className={`${
                        activeRide.status === 'REQUESTED' ? 'bg-yellow-100 text-yellow-800' :
                        activeRide.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {activeRide.status === 'REQUESTED' ? '🔍 Buscando conductor...' :
                         activeRide.status === 'ACCEPTED' ? '🏍️ Conductor en camino' :
                         '🚗 En viaje'}
                      </Badge>
                    </div>

                    {/* Ruta */}
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center gap-1 pt-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                        <div className="w-0.5 h-6 bg-border" />
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Origen</p>
                          <p className="font-medium text-sm">{activeRide.originAddress}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Destino</p>
                          <p className="font-medium text-sm">{activeRide.destinationAddress}</p>
                        </div>
                      </div>
                    </div>

                    {/* Conductor asignado */}
                    {activeRide.driver && (
                      <div className="mt-3 bg-secondary/30 rounded-xl border border-border/30 p-3">
                        <p className="text-xs text-muted-foreground mb-2">Tu conductor</p>
                        <div className="flex items-center gap-3">
                          {activeRide.driver.driverProfile?.profilePhotoUrl ? (
                            <img
                              src={activeRide.driver.driverProfile.profilePhotoUrl}
                              alt={activeRide.driver.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold flex-shrink-0">
                              {activeRide.driver.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate">{activeRide.driver.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {activeRide.driver.driverProfile?.vehicleModel && (
                                <span>🏍️ {activeRide.driver.driverProfile.vehicleModel}</span>
                              )}
                              {activeRide.driver.driverProfile?.vehiclePlate && 
                               !activeRide.driver.driverProfile.vehiclePlate.startsWith('TEMP-') && (
                                <span>• {activeRide.driver.driverProfile.vehiclePlate}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="flex items-center gap-0.5">
                              <span className="text-yellow-500">⭐</span>
                              <span className="text-sm font-medium">{activeRide.driver.driverProfile?.averageRating?.toFixed(1) || '0.0'}</span>
                            </div>
                            {activeRide.driver.driverProfile?.mototaxiNumber && (
                              <p className="text-xs text-muted-foreground">#{activeRide.driver.driverProfile.mototaxiNumber}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {activeRide.status === 'REQUESTED' && !activeRide.driver && (
                      <div className="mt-3 flex items-center justify-center gap-2 text-yellow-600 bg-yellow-50 rounded-lg py-2">
                        <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm">Buscando conductor cercano...</span>
                      </div>
                    )}

                    {/* Botón cancelar - si no aceptado, o si ACCEPTED sin conductor real */}
                    {(activeRide.status === 'REQUESTED' || 
                      (activeRide.status === 'ACCEPTED' && !activeRide.driver)) && (
                      <Button
                        variant="outline"
                        className="w-full mt-3 border-red-500/50 text-red-500 hover:bg-red-500/10 hover:text-red-400"
                        onClick={handleCancelRide}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancelar viaje
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Historial */}
            {panelView === 'history' && (
              <div className="space-y-3">
                {completedRides.length > 0 ? (
                  completedRides.slice(0, 10).map((ride) => (
                    <Card key={ride.id} className="border-border/30">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col items-center gap-1 pt-1">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <div className="w-0.5 h-5 bg-border" />
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{ride.originAddress}</p>
                            <p className="text-xs text-muted-foreground">{ride.destinationAddress}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {new Date(ride.createdAt).toLocaleDateString('es-MX')}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <History className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-muted-foreground text-sm">No hay viajes aún</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat - visible durante viajes ACCEPTED o IN_PROGRESS con conductor */}
      {activeRide && activeRide.driver && session?.user?.id &&
        (activeRide.status === 'ACCEPTED' || activeRide.status === 'IN_PROGRESS') && (
        <RideChat rideId={activeRide.id} currentUserId={session.user.id} />
      )}

      {/* Rating Modal - Aparece cuando se completa un viaje */}
      {rideToRate && (
        <RatingModal
          isOpen={showRatingModal}
          rideId={rideToRate.id}
          toUserId={rideToRate.driver?.id || rideToRate.driverId || ''}
          toUserName={rideToRate.driver?.name || rideToRate.driverName || 'Conductor'}
          isClientRating={true}
          userRole="CLIENT"
          onClose={() => {
            setShowRatingModal(false);
            setRideToRate(null);
            setPreviousActiveRideId(null);
          }}
          onSubmitSuccess={handleRatingSubmitSuccess}
        />
      )}
    </div>
  );
}
