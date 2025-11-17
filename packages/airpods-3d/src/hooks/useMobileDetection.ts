import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { detectMobile } from '@/utils/helpers';

/**
 * Hook para detectar dispositivos móviles
 */
export const useMobileDetection = () => {
  const setIsMobile = useStore((state) => state.setIsMobile);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(detectMobile());
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, [setIsMobile]);
};
