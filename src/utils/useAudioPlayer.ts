import React, {useRef, useCallback} from "react";
import {useState, useMemo, useEffect} from "react";
import {useRafLoop} from "./useRafLoop";


type PlayFunc = (opts?: {from?: number, to?: number}) => void;

/**
 * An attempt to stop the playback by scheduling a timeout. Saw howler doing this, but this does not seem to
 * work well, it stops early. Howler may just hide this by resetting to the start when done.
 */
function usePlayTargetTime(audio: HTMLAudioElement|undefined|null) {
  const timeoutId = useRef<any|null>(0);

  const cancel = useCallback(() => {
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
      timeoutId.current = null;
    }
  }, [timeoutId])

  const schedulePause = useCallback((endTime: number|null|undefined) => {
    cancel();

    if (!audio || endTime === null || endTime === undefined) {
      return;
    }

    const timeout = (endTime - audio.currentTime) * 1000;
    console.log(endTime, audio.currentTime, timeout)
    timeoutId.current = setTimeout(() => {
      audio.pause();
      console.log(audio.currentTime);
    }, timeout)
  }, [audio, cancel]);

  return useMemo(() => ({
    schedulePause,
    cancel
  }), [cancel,schedulePause]);
}

/**
 * Uses the webAudio API to be able to stop playback at a precise moment. The price is we have to do a lot
 * of logic (currentTime, seeking) by ourselves.
 */
export function useAudioPlayer(buffer: ArrayBuffer|undefined) {
  const audioContext = useMemo(() => new AudioContext(), []);

  const seekPosition = useRef(0);
  const playStartTime = useRef(0);
  const isPlaying = useRef(false);

  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer|null>(null);
  useEffect(() => {
    if (!buffer) { return; }
    audioContext.decodeAudioData(buffer).then(b => setAudioBuffer(b));
  }, [audioContext, buffer])

  const currentSource = useRef<AudioBufferSourceNode|null>(null);

  // If the audio buffer changes, reset
  useEffect(() => {
    seekPosition.current = 0;
  }, [audioBuffer]);

  // Disconnect on unmount
  useEffect(() => {
    return () => {
      if (currentSource.current) {
        currentSource.current.disconnect();
        currentSource.current = null;
      }
    }
  })

  const play = useCallback<PlayFunc>(
    (opts?) => {
      if (currentSource.current) { currentSource.current.disconnect() }

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.onended = () => {
        seekPosition.current = seekPosition.current + audioContext.currentTime - playStartTime.current;
        isPlaying.current = false;
      }

      const startTime = opts?.from ?? seekPosition.current;
      source.start(0, startTime, opts?.to ? opts.to - startTime : undefined);
      currentSource.current = source;
      seekPosition.current = startTime;
      playStartTime.current = audioContext.currentTime;
      isPlaying.current = true;
    },
    [audioBuffer, audioContext]
  );

  const pause = useCallback(() => {
    if (isPlaying.current) {
      // onended will trigger and update the state
      currentSource.current?.stop();
    }
  }, [audioContext.currentTime]);

  const seek = useCallback((time: number) => {
    pause();
    seekPosition.current = time;

    // if (playing) {
    //   // continue playing at the new position
    // }
  }, [audioContext.currentTime, pause]);

  const getPosition = useCallback(() => {
    if (isPlaying.current) {
      return seekPosition.current + (audioContext.currentTime - playStartTime.current);
    }
    return seekPosition.current;
  }, [audioContext.currentTime]);

  const getIsPlaying = useCallback(() => {
    return isPlaying.current;
  }, []);

  return {
    play,
    pause,
    seek,
    getPosition,
    getIsPlaying,
  };
}

export function useAudioTime(
  audio: HTMLAudioElement|null,
  callback: (time: number) => void,
  deps: any[]
) {
  const handleTimeUpdate = useCallback(
   () => {
      if (!audio) { return; }
      callback(audio.currentTime);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
   [audio, ...deps]
  );

  const [startRaf, stopRaf] = useRafLoop(handleTimeUpdate);

  useEffect(() => {
    if (!audio) { return; }
    audio.addEventListener("play", startRaf);
    audio.addEventListener("pause", stopRaf);
    audio.addEventListener("ended", stopRaf);
    return () => {
      audio.removeEventListener("play", startRaf);
      audio.removeEventListener("pause", stopRaf);
      audio.removeEventListener("ended", stopRaf);
    };
  }, [audio, startRaf, stopRaf]);

  useEffect(() => {
    if (!audio) { return; }
    audio.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [audio, handleTimeUpdate]);
}
