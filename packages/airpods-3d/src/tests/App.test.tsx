import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

// Mock de @react-three/fiber y @react-three/drei
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: any) => <div data-testid="canvas">{children}</div>,
  useFrame: () => {},
  useThree: () => ({}),
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => null,
  Environment: () => null,
  PerspectiveCamera: () => null,
  AdaptiveDpr: () => null,
  AdaptiveEvents: () => null,
  ContactShadows: () => null,
  Float: ({ children }: any) => <>{children}</>,
  useGLTF: () => ({ scene: {} }),
}));

describe('App', () => {
  it('renderiza el título principal', () => {
    render(<App />);
    const title = screen.getByText(/AirPods 3D/i);
    expect(title).toBeInTheDocument();
  });

  it('renderiza el Canvas 3D', () => {
    render(<App />);
    const canvas = screen.getByTestId('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('renderiza el botón de compra', () => {
    render(<App />);
    const buyButtons = screen.getAllByText(/Comprar/i);
    expect(buyButtons.length).toBeGreaterThan(0);
  });

  it('renderiza la sección de características', () => {
    render(<App />);
    const featuresTitle = screen.getByText(/Tecnología que te mueve/i);
    expect(featuresTitle).toBeInTheDocument();
  });

  it('renderiza el selector de color', () => {
    render(<App />);
    const colorPickerTitle = screen.getByText(/Elige tu color/i);
    expect(colorPickerTitle).toBeInTheDocument();
  });

  it('renderiza los controles', () => {
    render(<App />);
    const controlsTitle = screen.getByText(/Controles/i);
    expect(controlsTitle).toBeInTheDocument();
  });

  it('renderiza el footer', () => {
    render(<App />);
    const footer = screen.getByText(/Proyecto demostrativo/i);
    expect(footer).toBeInTheDocument();
  });
});
