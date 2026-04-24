import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useToast } from '../hooks/use-toast' // Verifica que la ruta sea correcta

describe('useToast Hook', () => {
  it('debería inicializarse con una lista vacía de toasts', () => {
    const { result } = renderHook(() => useToast())
    expect(result.current.toasts).toEqual([])
  })

  it('debería agregar un toast cuando se llama a la función toast()', () => {
    const { result } = renderHook(() => useToast())
    
    act(() => {
      result.current.toast({ 
        title: 'MotoGo Test', 
        description: 'Probando notificaciones' 
      })
    })

    expect(result.current.toasts.length).toBe(1)
    expect(result.current.toasts[0].title).toBe('MotoGo Test')
  })

  it('debería respetar el límite de 1 toast a la vez', () => {
    const { result } = renderHook(() => useToast())
    
    act(() => {
      result.current.toast({ title: 'Toast 1' })
    })
    act(() => {
      result.current.toast({ title: 'Toast 2' })
    })

    // Gracias al .slice(0, TOAST_LIMIT) en tu reducer, 
    // la longitud debe seguir siendo 1
    expect(result.current.toasts.length).toBe(1)
    expect(result.current.toasts[0].title).toBe('Toast 2')
  })
})