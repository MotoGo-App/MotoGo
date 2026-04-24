import { describe, it, expect } from 'vitest';
import { cn, calculateDistance, formatCurrency } from '../lib/utils';

describe('Utils Functions', () => {
  
  describe('cn (Tailwind Merge)', () => {
    it('debería combinar clases de tailwind correctamente', () => {
      const result = cn('px-2 py-2', 'bg-red-500');
      expect(result).toContain('px-2 py-2 bg-red-500');
    });

    it('debería resolver conflictos de Tailwind (twMerge)', () => {
      const result = cn('p-4', 'p-2');
      expect(result).toBe('p-2');
    });
  });

// 2. Test para calcular distancia (Haversine Formula)
  describe('calculateDistance', () => {
    it('debería calcular la distancia entre dos puntos conocidos', () => {
      // Coordenadas aproximadas de Ciudad de México a Puebla
      const cdmx = { lat: 19.4326, lon: -99.1332 };
      const puebla = { lat: 19.0414, lon: -98.2063 };
      
      const distance = calculateDistance(cdmx.lat, cdmx.lon, puebla.lat, puebla.lon);
      
      // Ajustamos a 106.6 que es el resultado real de la fórmula para estos puntos
      expect(distance).toBeCloseTo(106.6, 1); 
    });

    it('debería retornar 0 si las coordenadas son las mismas', () => {
      expect(calculateDistance(10, 10, 10, 10)).toBe(0);
    });
  });

  // 3. Test para formato de moneda
  describe('formatCurrency', () => {
    it('debería formatear números a pesos mexicanos (MXN) por defecto', () => {
      const result = formatCurrency(1500);
      // Verificamos que contenga el símbolo de peso y el formato de miles
      // Nota: Intl usa espacios de no-ruptura, por eso a veces es mejor usar toContain
      expect(result).toContain('$');
      expect(result).toContain('1,500');
    });

    it('debería soportar otras monedas como USD', () => {
      const result = formatCurrency(100, 'USD');
      expect(result).toContain('USD');
    });
  });
});