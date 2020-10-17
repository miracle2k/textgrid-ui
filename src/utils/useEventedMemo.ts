import {EventEmitter} from "events";
import {useEffect, useRef, useState} from "react";

export function useEventedMemo<T>(emitter: EventEmitter|undefined|null, eventName: string, callback: (o: {prev?: T}) => T) {
  const [state, setState] = useState(callback({}));

  const callbackRef = useRef(callback);
  useEffect(() => { callbackRef.current = callback });

  useEffect(() => {
    if (!emitter) { return; }
    const handleEvent = () => {
      setState(prev => callbackRef.current({prev: prev}))
    }
    emitter.on(eventName, handleEvent)
    return () => {
      emitter.off(eventName, handleEvent)
    }
  }, [emitter, eventName]);

  return state;
}

export function useUpdateOnEvent(emitter: EventEmitter|undefined|null, eventName: string) {
  useEventedMemo<number>(emitter, eventName, ({prev}) => (prev ?? 0) + 1);
}