// Current time that ticks (default every 30 s) so relative labels and readiness stay fresh.
import { useEffect, useState } from 'react';

export function useNow(every = 30_000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(id);
  }, [every]);
  return now;
}
