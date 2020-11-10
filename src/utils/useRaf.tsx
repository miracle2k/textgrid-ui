import {useCallback, useEffect, useRef} from "react";

// Call callback in a RaF.
export function useRaf(callback: Function) {
  let requestId = useRef<number | null>(null);
  let cancelled = useRef<boolean>(false);
  const currentCallbackFunc = useRef<Function>(callback);

  const loop = useCallback(() => {
    currentCallbackFunc.current();
    if (cancelled.current) {
      return;
    }
    requestId.current = window.requestAnimationFrame(loop);
  }, [currentCallbackFunc, cancelled, requestId])

  const cancelLoop = useCallback(() => {
    if (requestId.current) {
      window.cancelAnimationFrame(requestId.current);
    }
    cancelled.current = true;
  }, [cancelled, requestId]);

  useEffect(() => {
    currentCallbackFunc.current = callback;
  })

  useEffect(() => {
    loop();
    return () => {
      cancelLoop();
    }
  }, [loop, cancelLoop])
}

