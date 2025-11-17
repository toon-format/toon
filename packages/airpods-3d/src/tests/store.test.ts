import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/useStore';

describe('useStore', () => {
  beforeEach(() => {
    // Reset store antes de cada test
    useStore.setState({
      selectedColor: 'white',
      caseOpen: false,
      exploded: false,
      hoveredPart: null,
      scrollProgress: 0,
      cameraReset: false,
      isMobile: false,
      isLoading: true,
    });
  });

  it('tiene el estado inicial correcto', () => {
    const state = useStore.getState();
    expect(state.selectedColor).toBe('white');
    expect(state.caseOpen).toBe(false);
    expect(state.exploded).toBe(false);
    expect(state.isLoading).toBe(true);
  });

  it('puede cambiar el color seleccionado', () => {
    const { setSelectedColor } = useStore.getState();
    setSelectedColor('blue');
    expect(useStore.getState().selectedColor).toBe('blue');
  });

  it('puede abrir/cerrar el estuche', () => {
    const { setCaseOpen } = useStore.getState();
    setCaseOpen(true);
    expect(useStore.getState().caseOpen).toBe(true);
    setCaseOpen(false);
    expect(useStore.getState().caseOpen).toBe(false);
  });

  it('puede activar/desactivar el modo explode', () => {
    const { setExploded } = useStore.getState();
    setExploded(true);
    expect(useStore.getState().exploded).toBe(true);
  });

  it('puede establecer la parte en hover', () => {
    const { setHoveredPart } = useStore.getState();
    setHoveredPart('right');
    expect(useStore.getState().hoveredPart).toBe('right');
  });

  it('puede actualizar el progreso de scroll', () => {
    const { setScrollProgress } = useStore.getState();
    setScrollProgress(0.5);
    expect(useStore.getState().scrollProgress).toBe(0.5);
  });

  it('puede detectar dispositivos móviles', () => {
    const { setIsMobile } = useStore.getState();
    setIsMobile(true);
    expect(useStore.getState().isMobile).toBe(true);
  });

  it('puede cambiar el estado de carga', () => {
    const { setIsLoading } = useStore.getState();
    setIsLoading(false);
    expect(useStore.getState().isLoading).toBe(false);
  });
});
