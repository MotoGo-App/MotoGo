import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'

it('el enlace de login debe apuntar a la ruta correcta', () => {
  render(<a href="/login">Entrar</a>)
  const link = screen.getByRole('link', { name: /entrar/i })
  expect(link).toHaveAttribute('href', '/login')
})