'use client';

import { useEffect } from 'react';

export function PreventZoom() {
  useEffect(() => {
    // Check if touch originates inside a Leaflet map container
    const isInsideMap = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof HTMLElement)) return false;
      return !!target.closest('.leaflet-container');
    };

    // Block multi-touch zoom (pinch) outside the map
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1 && !isInsideMap(e.target)) {
        e.preventDefault();
      }
    };

    // Block Safari gesture events (pinch/rotate) outside the map
    const handleGestureStart = (e: Event) => {
      if (!isInsideMap(e.target)) {
        e.preventDefault();
      }
    };

    const handleGestureChange = (e: Event) => {
      if (!isInsideMap(e.target)) {
        e.preventDefault();
      }
    };

    // Block double-tap zoom outside the map
    let lastTouchEnd = 0;
    const handleTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300 && !isInsideMap(e.target)) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };

    // passive: false is required to allow preventDefault on touch events
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('gesturestart', handleGestureStart, { passive: false } as any);
    document.addEventListener('gesturechange', handleGestureChange, { passive: false } as any);
    document.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('gesturestart', handleGestureStart);
      document.removeEventListener('gesturechange', handleGestureChange);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return null;
}
