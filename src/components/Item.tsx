import useSound from 'use-sound';
import React, {useEffect, useRef, useState} from 'react';
import { css } from 'emotion'
import 'howler';
import {verifyPermission} from "../utils/verifyPermission";
import { TextGrid } from './TextGrid';
import GeoPattern from 'geopattern';


export type ItemContextType = {
  play: (from: number, to?: number) => void,

  // When using the howler sound object directly, be sure to use it with "soundId" to get the one that is newest.
  sound: any,
  soundId?: number,
};
const ItemContext = React.createContext<ItemContextType|null>(null);

export function useItem() {
  return React.useContext(ItemContext);
}


export class ItemSet {
  name: string = "";
  audio?: File|FileSystemFileHandle|null = null;
  grids: (File|FileSystemFileHandle)[] = [];
  patternSeeds?: string[];

  constructor(name: string) {
    this.name = name;
  }

  get hasAudio() {
    return !!this.audio;
  }

  get hasGrid() {
    return !!this.grids.length;
  }
}


// For files from the NativeFileSystem API
export async function resolveFileHandle(file: FileSystemFileHandle|File): Promise<File> {
  if (file && 'getFile' in file) {
    await verifyPermission(file);
    file = await file.getFile();
  }
  return file;
}

export function readFile(file: File, as: 'string'): Promise<string>;
export function readFile(file: File, as: 'arraybuffer'): Promise<ArrayBuffer>;
export function readFile(file: File): Promise<ArrayBuffer>;
export function readFile(file: File, as?:  'arraybuffer'|'string'): Promise<ArrayBuffer|string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onabort = () => reject('file reading was aborted')
    reader.onerror = () => reject('file reading has failed')
    reader.onload = () => {
      // Do whatever you want with the file contents
      const binaryStr = reader.result
      if (binaryStr === null) {
        reject('null');
        return;
      }
      resolve(binaryStr as ArrayBuffer);
    }
    if (as === 'arraybuffer') {
      return reader.readAsArrayBuffer(file)
    }
    else {
      return reader.readAsText(file);
    }
  })
}


export async function readFileHighLevel(file: FileSystemFileHandle|File) {
  return await readFile(await resolveFileHandle(file));
}


export function useResolveAudio(audio: File|FileSystemFileHandle|undefined|null) {
  const [file, setFile] = useState<File>();
  useEffect(() => {
    (async () => {
      if (audio) {
        setFile(await resolveFileHandle(audio));
      }
    })();
  }, [audio]);

  return file;
}


/**
 * An item is the parent element, rendering a <TextGrid> component with audio-playing logic.
 */
export function Item(props: {
  item: ItemSet
}) {
  const [buffers, setBuffers] = useState<(ArrayBuffer|string)[]>();
  useEffect(() => {
    (async () => {
      if (!props.item.grids.length) { return; }
      //const response = await fetch(props.item.audio);
      //const data = await response.text();
      const buffers = await Promise.all(
          props.item.grids.map(file => readFileHighLevel(file))
      );
      setBuffers(buffers);
    })();
  }, [props.item.grids]);

  const [audioUrl, setAudioUrl] = useState<string>("");
  const audioFile = useResolveAudio(props.item.audio);
  React.useEffect(() => {
    if (!audioFile) {
      setAudioUrl("");
      return;
    }
    const objectURL = URL.createObjectURL(audioFile);
    // https://github.com/joshwcomeau/use-sound/issues/23
    window.setTimeout(() => {
      setAudioUrl(objectURL);
    }, 100)
    return () => {
      URL.revokeObjectURL(objectURL);
    }
  }, [audioFile]);

  const [playInternal, {sound}] = useSound(audioUrl, {
    // @ts-ignore
    format: ['mp3'],
  });

  const soundId = useRef<any>();
  const play = (from: number, to?: number) => {
    // https://github.com/goldfire/howler.js/issues/535
    to = to ?? 99;
    sound._sprite.clickedSprite = [from * 1000, (to-from) * 1000];

    // A pause() should make sure we we re-use the current sound id.
    if (soundId.current) { sound.stop(soundId.current) }
    soundId.current = sound.play("clickedSprite");
  }

  const contextValue = {
    play,
    sound,
    soundId: soundId.current
  }

  return <div
      className={css`
        margin: 40px 10px;
        strong {
            color: silver;
            font-weight: normal;
            display: block;
        }
    `}>
    <strong>{props.item.name}</strong>
    <ItemContext.Provider value={contextValue}>
      {buffers ? buffers.map((buffer: any, idx: number) => {
        const pattern = props.item.patternSeeds? GeoPattern.generate(props.item.patternSeeds?.[idx]) : null;
        return <TextGrid
          buffer={buffer}
          handleStyle={{
            backgroundImage: pattern?.toDataUrl()
          }}
        />
      }) : null}
    </ItemContext.Provider>
  </div>
}