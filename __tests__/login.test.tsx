import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import LoginPage from '@/app/login/page'

// Mocks necesarios
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
}));

describe('Login Flow', () => {
  it('debería mostrar los campos necesarios para iniciar sesión', () => {
    render(<LoginPage />)
    
    // 1. Buscamos por el texto de la etiqueta <label> (visto en tus fotos)
    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument()
    
    // 2. Verificamos el botón (visto en tus fotos dice "Iniciar Sesión")
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument()
  })
})