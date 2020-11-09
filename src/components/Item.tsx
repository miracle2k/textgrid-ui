import useSound from 'use-sound';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import { css } from 'emotion'
import 'howler';
import {verifyPermission} from "../utils/verifyPermission";
import { TextGrid } from './TextGrid';
import {useRaf} from "../utils/useRaf";
import {Mark, Marks, TierMarkerState} from "./TierMarkers";
import produce from "immer"
import {useInterval} from "../utils/useInterval";


export type ItemContextType = {
  play: (opts?: {from?: number, to?: number}) => void,
  toggle: () => void,

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
  audio?: File|FileSystemFileHandle|string|null = null;
  grids: (File|FileSystemFileHandle|string)[] = [];
  colors?: string[];

  metadata?: unknown;

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


export async function readFileHighLevel(file: FileSystemFileHandle|File|string) {
  if (typeof file === 'string') {
    return file;
  }
  return await readFile(await resolveFileHandle(file));
}


export function useResolveAudio(audio: File|FileSystemFileHandle|string|undefined|null) {
  const [file, setFile] = useState<File|string>();
  useEffect(() => {
    (async () => {
      if (audio) {
        if (typeof audio === 'string') {
          setFile(audio);
        } else {
          setFile(await resolveFileHandle(audio));
        }
      }
    })();
  }, [audio]);

  return file;
}


/**
 * An item is the parent element, rendering a <TextGrid> component with audio-playing logic.
 */
export function Item(props: {
  item: ItemSet,
  onMarksChanged?: (item: ItemSet, fileIdx: number, marks: Marks) => void
}) {
  const [buffers, setBuffers] = useState<(ArrayBuffer|string)[]>();
  useEffect(() => {
    (async () => {
      if (!props.item.grids.length) { return; }
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

    let finalUrl: string;
    let isObjectUrl: boolean = false;
    if (typeof audioFile === 'string') {
      finalUrl = audioFile;
    } else {
      finalUrl = URL.createObjectURL(audioFile);
      isObjectUrl = true;
    }

    // https://github.com/joshwcomeau/use-sound/issues/23
    window.setTimeout(() => {
      setAudioUrl(finalUrl);
    }, 100)

    return () => {
      if (isObjectUrl) {
        URL.revokeObjectURL(finalUrl);
      }
    }
  }, [audioFile]);

  const [_, {sound}] = useSound(audioUrl, {
    // @ts-ignore
    format: ['mp3'],
  });

  const [soundId, setSoundId] = useState<number|undefined>(undefined);

  const initialMarks = (props.item.metadata as any).initialMarks ?? props.item.grids.map(x =>  null);
  const [marks, setMarks] = useState<TierMarkerState[]>(
    initialMarks.map((data: Mark[]) => {
      return {
        totalError: data ? data.filter(x => x === Mark.Error).length : 0,
        totalCorrect: data ? data.filter(x => x === Mark.Correct).length : 0,
        marks: data ?? []
      }
    })
  );

  const handleToggleMarker = (fileIdx: number, entryIdx: number) => {
    const current = marks[fileIdx].marks[entryIdx];
    let next: Mark|undefined = undefined;
    if (current === Mark.Error) {
      next = Mark.Correct;
    } else if (current === Mark.Correct) {
      next = undefined;
    } else {
      next = Mark.Error;
    }

    const nextState = produce(marks, draftState => {
      draftState[fileIdx].marks[entryIdx] = next;
      draftState[fileIdx].totalError += (current === Mark.Error) ? -1 : 0;
      draftState[fileIdx].totalError += (next === Mark.Error) ? 1 : 0;
      draftState[fileIdx].totalCorrect += (current === Mark.Correct) ? -1 : 0;
      draftState[fileIdx].totalCorrect += (next === Mark.Correct) ? 1 : 0;
    });
    setMarks(nextState);

    props.onMarksChanged?.(props.item, fileIdx, nextState[fileIdx].marks)
  }

  const play = (opts?: {from?: number, to?: number}) => {
    // https://github.com/goldfire/howler.js/issues/535
    const to = opts?.to ?? 999;
    const from = opts?.from ?? sound.seek(soundId);
    sound._sprite.clickedSprite = [from * 1000, (to-from) * 1000];

    // A pause() should make sure we we re-use the current sound id.
    if (soundId) { sound.stop(soundId) }
    const newSoundId = sound.play("clickedSprite");
    console.log('playing old=', soundId, 'new', newSoundId, 'sprite', sound._sprite.clickedSprite);
    //setSoundId(newSoundId);
  }

  const toggle = () => {
    if (sound.playing(soundId)) {
      sound.pause();
    } else {
      play();
    }
  }

  const contextValue = {
    play,
    toggle,
    sound,
    soundId
  }

  return <div
    className={css`
      strong {
        color: silver;
        font-weight: normal;
        display: block;
      }
  `}>
    <strong>{props.item.name}</strong>

    <ItemContext.Provider value={contextValue}>
      <ScrollableCanvas
        item={props.item}
        buffers={buffers!}
        marks={marks}
        onShiftClick={handleToggleMarker}
      />
    </ItemContext.Provider>
  </div>
}

function ScrollableCanvas(props: {
  item: ItemSet,
  // A buffer for each item in the set
  buffers: any[],
  // A mark data struture for each item in the set
  marks: TierMarkerState[],
  onShiftClick?: (itemId: number, entryId: number) => void,
}) {
  const scrollContainer = useRef<HTMLDivElement>(null);
  const [pixelsPerSecond, setPixelsPerSecond] = useState(300);
  const item = useItem();

  const handleKeyPress = useCallback((e: any) => {
    if (e.key === ' ') {
      item?.toggle()
    }
  }, [item]);

  const handleMouseDown = useCallback((e: any) => {
    const rect = scrollContainer.current!.getBoundingClientRect();
    const posX = e.clientX - rect.x;
    item?.sound.seek(posX / pixelsPerSecond, item?.soundId);
  }, [item, pixelsPerSecond]);

  const handleWheel = useCallback((e: any) => {
    const deltaY = e.deltaY * 0.1;
    setPixelsPerSecond(p => Math.max(20, Math.min(p + deltaY, 1000)))
  }, []);

  // TODO: maybe instead of raf, this should be a  more conservative interval, say 100ms
  useInterval(() => {
    if (!scrollContainer.current) {
      return;
    }
    const sound = item?.sound;
    if (!sound) { return; }
    if (sound.state() === "unloaded") {
      return;
    }
    if (!sound.playing()) {
      return;
    }
    const pos = sound.seek(item?.soundId);

    // Is it in the range?
    const rect = scrollContainer.current!.getBoundingClientRect();
    const maxTime = (scrollContainer.current.scrollLeft + rect.width) / pixelsPerSecond;
    if (pos > maxTime) {
      scrollContainer.current.scrollTo({
        left: pos * pixelsPerSecond
      })
    }
  }, 100)

  return <div
    onMouseDown={handleMouseDown}
    onKeyPress={handleKeyPress}
    onWheel={handleWheel}
    ref={scrollContainer}
    tabIndex={0}
    className={css`
      outline: none;
      overflow: auto;
      flex: 1;
      margin-left: 50px; // space for the handles
      
      padding-bottom: 10px;
      position: relative;
    `}
  >
    {props.buffers ? props.buffers.map((buffer: any, idx: number) => {
      return (
        <div key={idx}>
          <div
            className={css`
              transform: translateX(-100%);
              position: fixed;
              width: 50px;
            `}
          >
            <div style={{height: '50px', backgroundColor: props.item.colors?.[idx]}} />
            <div className={css`
              display: flex;
              flex-direction: row;
              align-items: center;
              justify-content: center;
            `}>
              <div className={css`
                font-size: 10px;
                color: back;
                padding: 0.3em 0.5em;
                background-color: #ffebee;
                border: 1px solid red;
                border-radius: 4px;
                margin: 2px;
              `}>
                {props.marks[idx].totalError}
              </div>
              <div className={css`
                font-size: 10px;
                color: back;
                padding: 0.3em 0.5em;
                background-color: #e8f5e9;
                border: 1px solid green;
                border-radius: 4px;
                margin: 2px;
              `}>
                {props.marks[idx].totalCorrect}
              </div>
            </div>
          </div>

          <TextGrid
            key={idx}
            itemIndex={idx}
            buffer={buffer}
            marks={props.marks[idx].marks}
            pixelsPerSecond={pixelsPerSecond}
            onShiftClick={props.onShiftClick}
          />
        </div>
      )
    }) : null}

    <Cursor pixelsPerSecond={pixelsPerSecond} />
  </div>
}

function Cursor(props: {
  pixelsPerSecond: number
}) {
  const {pixelsPerSecond} = props;
  const item = useItem();
  const [cursorPos, setCursorPos] = useState(0);

  useRaf(() => {
    const sound = item?.sound;
    if (!sound) { return; }
    if (sound.state() === "unloaded") {
      return;
    }
    const pos = sound.seek(item?.soundId);
    setCursorPos(pos);
  })

  return <div className={css`
    position: absolute;
    width: 1px;
    top: 0px;
    bottom: 0px;
    background: red;
  `} style={{left: (cursorPos ?? 0) * pixelsPerSecond}} />;
}
