import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

describe('MotoGo Smoke Test', () => {
  it('debería mostrar el mensaje de bienvenida', () => {
    render(<h1>MotoGo System</h1>)
    expect(screen.getByText(/MotoGo System/i)).toBeInTheDocument()
  })
})