'use client';

import { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, MapPin as MapPinIcon, Navigation } from 'lucide-react';
import { calculateDistance } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface RideMapProps {
  driverLocation?: {
    latitude: number;
    longitude: number;
    speed?: number | null;
  };
  clientLocation?: {
    latitude: number;
    longitude: number;
  };
  destinationLocation?: {
    latitude: number;
    longitude: number;
  };
  rideStatus?: string;
  onNotificationNeeded?: (message: string) => void;
  centerTrigger?: number;
  isDriverView?: boolean;
}

export function RideMap({
  driverLocation,
  clientLocation,
  destinationLocation,
  rideStatus,
  onNotificationNeeded,
  centerTrigger,
  isDriverView = false
}: RideMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [L, setL] = useState<any>(null);
  const [mapZoom, setMapZoom] = useState(15);
  const [distance, setDistance] = useState(0);
  const notificationSentRef = useRef(false);
  const hasFittedBoundsRef = useRef(false);
  const userInteractedRef = useRef(false);

  // Cargar Leaflet de forma dinámica (solo en cliente)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    import('leaflet').then((leaflet) => {
      setL(leaflet.default);
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(link);
    }).catch(err => console.error('Error cargando Leaflet:', err));
  }, []);

  // Inicializar mapa cuando Leaflet esté disponible
  useEffect(() => {
    if (!L || !containerRef.current || mapInitialized) return;

    try {
      const initialLocation = driverLocation || clientLocation || {
        latitude: 25.6866,
        longitude: -100.3161
      };

      const map = L.map(containerRef.current).setView(
        [initialLocation.latitude, initialLocation.longitude],
        mapZoom
      );

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
      }).addTo(map);

      map.zoomControl.setPosition('bottomright');

      // Track user interaction to avoid fighting with auto-pan
      map.on('dragstart', () => { userInteractedRef.current = true; });
      map.on('zoomstart', () => { userInteractedRef.current = true; });

      mapRef.current = map;
      setMapInitialized(true);

      // Force recalculate tile layout after container is fully rendered
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    } catch (error) {
      console.error('Error al inicializar mapa:', error);
    }
  }, [L, mapInitialized, driverLocation, clientLocation, mapZoom]);

  // Centrar mapa en la ubicación del cliente cuando se solicita explícitamente
  useEffect(() => {
    if (!mapRef.current || !clientLocation || !centerTrigger) return;
    userInteractedRef.current = false;
    mapRef.current.setView(
      [clientLocation.latitude, clientLocation.longitude],
      16,
      { animate: true }
    );
  }, [centerTrigger, clientLocation]);

  // Calcular distancia entre conductor y cliente
  useEffect(() => {
    if (!driverLocation || !clientLocation) return;

    const dist = calculateDistance(
      driverLocation.latitude,
      driverLocation.longitude,
      clientLocation.latitude,
      clientLocation.longitude
    );

    setDistance(dist);

    // Notificar cuando está a menos de 500 metros
    if (dist < 0.5 && !notificationSentRef.current && onNotificationNeeded) {
      notificationSentRef.current = true;
      onNotificationNeeded('¡El conductor está a menos de 500 metros!');
    }
  }, [driverLocation, clientLocation, onNotificationNeeded]);

  // Actualizar marcador del conductor
  useEffect(() => {
    if (!mapRef.current || !L || !driverLocation) return;

    const driverIcon = L.divIcon({
      html: `<div style="background-color: #6b21a8; color: white; border: 3px solid white; border-radius: 50%; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.4); position: relative;">
        <div style="position: absolute;">🏍️</div>
      </div>`,
      iconSize: [50, 50],
      iconAnchor: [25, 25],
      popupAnchor: [0, -25]
    });

    if (mapRef.current.driverMarker) {
      mapRef.current.driverMarker.setLatLng([
        driverLocation.latitude,
        driverLocation.longitude
      ]);
    } else {
      mapRef.current.driverMarker = L.marker(
        [driverLocation.latitude, driverLocation.longitude],
        { icon: driverIcon }
      )
        .bindPopup(`<div><strong>Conductor</strong></div>`)
        .addTo(mapRef.current);
    }

    // Only auto-pan if user hasn't manually interacted with the map
    // For driver view: gently follow the driver
    // For client view: don't auto-pan (driver marker moves, user watches)
    if (isDriverView && !userInteractedRef.current) {
      mapRef.current.panTo([driverLocation.latitude, driverLocation.longitude], { animate: true, duration: 1 });
    }
  }, [L, driverLocation, isDriverView]);

  // Actualizar marcador del cliente
  useEffect(() => {
    if (!mapRef.current || !L || !clientLocation) return;

    const clientIcon = L.divIcon({
      html: `<div style="background-color: #2563eb; color: white; border: 3px solid white; border-radius: 50%; width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">📍</div>`,
      iconSize: [45, 45],
      iconAnchor: [22, 22],
      popupAnchor: [0, -22]
    });

    if (mapRef.current.clientMarker) {
      mapRef.current.clientMarker.setLatLng([
        clientLocation.latitude,
        clientLocation.longitude
      ]);
    } else {
      mapRef.current.clientMarker = L.marker(
        [clientLocation.latitude, clientLocation.longitude],
        { icon: clientIcon }
      )
        .bindPopup('Ubicación del Cliente')
        .addTo(mapRef.current);
    }
  }, [L, clientLocation]);

  // Limpiar marcadores y ruta cuando el viaje se completa o cancela
  useEffect(() => {
    if (!mapRef.current || !L) return;
    if (rideStatus === 'COMPLETED' || rideStatus === 'CANCELED' || !rideStatus) {
      if (mapRef.current.polyline) {
        mapRef.current.removeLayer(mapRef.current.polyline);
        mapRef.current.polyline = null;
      }
      if (mapRef.current.driverMarker && !rideStatus) {
        mapRef.current.removeLayer(mapRef.current.driverMarker);
        mapRef.current.driverMarker = null;
      }
      if (mapRef.current.clientMarker && (!rideStatus || rideStatus === 'COMPLETED' || rideStatus === 'CANCELED')) {
        mapRef.current.removeLayer(mapRef.current.clientMarker);
        mapRef.current.clientMarker = null;
      }
      // Reset bounds fitting flag for next ride
      hasFittedBoundsRef.current = false;
    }
  }, [L, rideStatus]);

  // Dibujar línea entre conductor y cliente
  useEffect(() => {
    if (!mapRef.current || !L || !driverLocation || !clientLocation) return;
    if (rideStatus === 'COMPLETED' || rideStatus === 'CANCELED' || !rideStatus) return;

    if (mapRef.current.polyline) {
      mapRef.current.removeLayer(mapRef.current.polyline);
    }

    mapRef.current.polyline = L.polyline(
      [
        [driverLocation.latitude, driverLocation.longitude],
        [clientLocation.latitude, clientLocation.longitude]
      ],
      {
        color: '#6b21a8',
        weight: 4,
        opacity: 0.8,
        dashArray: '5, 5'
      }
    ).addTo(mapRef.current);

    // Only fit bounds ONCE when ride first starts, not on every update
    if (!hasFittedBoundsRef.current && mapRef.current.driverMarker && mapRef.current.clientMarker) {
      hasFittedBoundsRef.current = true;
      userInteractedRef.current = false;
      const group = L.featureGroup([
        mapRef.current.driverMarker,
        mapRef.current.clientMarker
      ]);
      mapRef.current.fitBounds(group.getBounds().pad(0.2));
    }
  }, [L, driverLocation, clientLocation, rideStatus]);

  const handleZoomIn = () => {
    if (mapRef.current) {
      const newZoom = Math.min(mapRef.current.getZoom() + 1, 19);
      mapRef.current.setZoom(newZoom);
      setMapZoom(newZoom);
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      const newZoom = Math.max(mapRef.current.getZoom() - 1, 5);
      mapRef.current.setZoom(newZoom);
      setMapZoom(newZoom);
    }
  };

  const handleCenterOnLocation = () => {
    if (!mapRef.current) return;
    userInteractedRef.current = false;
    if (isDriverView && driverLocation) {
      mapRef.current.setView([driverLocation.latitude, driverLocation.longitude], 16, { animate: true });
    } else if (clientLocation) {
      mapRef.current.setView([clientLocation.latitude, clientLocation.longitude], 16, { animate: true });
    }
  };

  const handleFitBothMarkers = () => {
    if (!mapRef.current || !L || !driverLocation || !clientLocation) return;
    userInteractedRef.current = false;
    const group = L.featureGroup([
      L.marker([driverLocation.latitude, driverLocation.longitude]),
      L.marker([clientLocation.latitude, clientLocation.longitude])
    ]);
    mapRef.current.fitBounds(group.getBounds().pad(0.2));
  };

  return (
    <div className="relative w-full h-full">
      {/* Mapa */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-hidden"
        style={{
          height: '100%',
          width: '100%',
          minHeight: '500px'
        }}
      />

      {/* Información de viaje - distancia */}
      {driverLocation && clientLocation && rideStatus && rideStatus !== 'COMPLETED' && rideStatus !== 'CANCELED' && (
        <div className="absolute left-3 z-10" style={{ top: isDriverView ? '7rem' : '5rem' }}>
          <div className="glass-card rounded-xl shadow-lg px-3 py-2 max-w-[170px]">
            {/* Distancia */}
            <div className="flex items-center gap-2">
              <MapPinIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground leading-none">Distancia</p>
                <p className="font-bold text-sm text-foreground">{distance.toFixed(2)} km</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controles de zoom y navegación */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
        <Button
          size="sm"
          className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 shadow-md"
          onClick={handleZoomIn}
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 shadow-md"
          onClick={handleZoomOut}
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          className="bg-purple-600 hover:bg-purple-700 text-white shadow-md"
          onClick={handleCenterOnLocation}
          title={isDriverView ? 'Centrar en mi ubicación' : 'Centrar en mi ubicación'}
        >
          <Navigation className="w-4 h-4" />
        </Button>
        {driverLocation && clientLocation && rideStatus && rideStatus !== 'COMPLETED' && rideStatus !== 'CANCELED' && (
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
            onClick={handleFitBothMarkers}
            title="Ver ambos puntos"
          >
            <MapPinIcon className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}