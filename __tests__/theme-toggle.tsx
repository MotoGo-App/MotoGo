import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ThemeToggle } from '../components/theme-toggle'
import { ThemeProvider } from '../components/theme-provider'

vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
  }),
}))

describe('ThemeToggle', () => {
  it('debería existir el botón de cambio de tema', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })
})