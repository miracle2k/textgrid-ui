import React, {useRef, useCallback} from "react";
import {useState, useMemo, useEffect} from "react";
import {useRafLoop} from "./useRafLoop";


type PlayFunc = (opts?: {from?: number, to?: number}) => void;


export function useAudioPlayer(url: string) {
  const audioElement = useMemo(() => {
    if (!url) {
      return null;
    }
    return new Audio(url);
  }, [url]);

  const targetTime = useRef<number|null>(null);

  // pause() when the target time is reached, if there is a target time!
  useAudioTime(
    audioElement,
    (time) => {
      if (targetTime.current === null) {
        return;
      }

      if (time >= targetTime.current) {
        audioElement?.pause();
      }
    },
    [targetTime]
  );

  const play = useCallback<PlayFunc>(
    (opts?) => {
      if (!audioElement) { return; }
      if (opts?.from !== undefined) {
        audioElement.currentTime = opts?.from;
      }
      targetTime.current = opts?.to ?? null;
      audioElement?.play();

      // set a timeout to pause at the target time!
    },
    [audioElement]
  );

  const pause = useCallback(() => {
    audioElement?.pause();
  }, [audioElement]);

  const seek = useCallback((time: number) => {
    if (!audioElement) { return; }
    audioElement.currentTime = time;
  }, [audioElement]);

  const getPosition = useCallback(() => {
    if (!audioElement) { return 0; }
    return audioElement.currentTime;
  }, [audioElement]);

  const getIsPlaying = useCallback(() => {
    if (!audioElement) { return false; }
    return !audioElement.paused;
  }, [audioElement]);

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
