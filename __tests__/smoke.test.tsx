import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Home from '../app/page';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

vi.mock('next-auth/react');
vi.mock('next/navigation');

describe('Home Page Auth Redirection', () => {
  const mockPush = vi.fn();
  (useRouter as any).mockReturnValue({ push: mockPush });

  it('debería redirigir al dashboard de CLIENT si el rol es CLIENT', async () => {
    (useSession as any).mockReturnValue({
      data: { user: { role: 'CLIENT' } },
      status: 'authenticated'
    });

    render(<Home />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/client/dashboard');
    });
  });

  it('debería mostrar los botones de Registro/Login si no hay sesión', () => {
    (useSession as any).mockReturnValue({ data: null, status: 'unauthenticated' });

    render(<Home />);

    expect(screen.getByText(/Registrarse/i)).toBeInTheDocument();
    expect(screen.getByText(/Iniciar Sesión/i)).toBeInTheDocument();
  });
});