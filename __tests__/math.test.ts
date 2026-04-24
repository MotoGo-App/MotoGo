import { describe, it, expect } from 'vitest'

const calculateTax = (price: number) => price * 1.16

describe('Lógica de Negocio', () => {
  it('debería calcular el IVA del 16% correctamente', () => {
    expect(calculateTax(100)).toBeCloseTo(116, 5) 
    expect(calculateTax(0)).toBe(0)
  })
})