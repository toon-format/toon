import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { throttle } from '@/utils/helpers';

/**
 * Hook para sincronizar animaciones con scroll
 */
export const useScrollAnimation = () => {
  const setScrollProgress = useStore((state) => state.setScrollProgress);

  useEffect(() => {
    const handleScroll = throttle(() => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min(Math.max(scrollTop / docHeight, 0), 1) : 0;

      setScrollProgress(progress);
    }, 16); // ~60fps

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [setScrollProgress]);
};
