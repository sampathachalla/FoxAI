import { useEffect, useRef } from 'react';

export function useScrollToBottom<T>(dependency: T) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [dependency]);

  return containerRef;
}
