import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Measures an element's width with a ResizeObserver.
 *
 * Charts need an explicit width: recharts' ResponsiveContainer reports -1 on the
 * first paint inside a lazily mounted flex column and leaves the chart blank
 * until an unrelated resize happens.
 */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const measure = () => setWidth(element.clientWidth);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener('resize', measure);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  return { ref, width };
}
