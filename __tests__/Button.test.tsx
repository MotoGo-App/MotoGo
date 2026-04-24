import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

describe('Componente Botón', () => {
  it('debería mostrar el texto dinámico correctamente', () => {
    render(<button>Click aquí</button>)
    expect(screen.getByText('Click aquí')).toBeInTheDocument()
  })

  it('debería ejecutar la función al hacer click', () => {
    const handleClick = vi.fn()
    render(<button onClick={handleClick}>Enviar</button>)
    
    fireEvent.click(screen.getByText('Enviar'))
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})