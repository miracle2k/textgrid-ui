import { useEffect, useRef, useCallback } from 'react';

/**
 * NB: You can update the callback, this will not restart the loop.
 */
export function useRafLoop(callback: () => void) {
  const handle = useRef<number | null>(null);
  const refToCallback = useRef<() => void>(callback);
  useEffect(() => {
    refToCallback.current = callback;
  }, [callback]);

  const loopingCall = useCallback(() => {
    refToCallback.current();
    handle.current = requestAnimationFrame(loopingCall);
  }, [handle]);

  const startRaf = useCallback(() => {
    if (!handle.current) {
      handle.current = requestAnimationFrame(loopingCall);
    }
  }, [loopingCall, handle]);

  const stopRaf = useCallback(() => {
    if (handle.current) {
      cancelAnimationFrame(handle.current);
      handle.current = null;
    }
  }, [loopingCall, handle]);

  return [startRaf, stopRaf];
}