import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {css} from 'emotion'
import {verifyPermission} from "../utils/verifyPermission";
import {TextGrid} from './TextGrid';
import {useRaf} from "../utils/useRaf";
import {Mark, Marks, TierMarkerState} from "./TierMarkers";
import produce from "immer"
import {useInterval} from "../utils/useInterval";
import {useAudioPlayer} from "../utils/useAudioPlayer";
import {LayoutManager, VirtualView} from "./VirtualView";
import {parseTextgrid} from "praatio";
import {Buffer} from "buffer";
import {AutoSizer} from "react-virtualized";


export type ItemContextType = {
  play: (opts?: {from?: number, to?: number}) => void,
  toggle: () => void,
  seek: (time: number) => void,
  getPosition: () => number,
  getIsPlaying: () => boolean,
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

  const textgrids = useMemo(() => {
    if (!buffers) {
      return null;
    }
    return buffers.map(buffer => parseTextgrid(Buffer.from(buffer)));
  }, [buffers]);

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


  const player = useAudioPlayer(audioUrl);

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

  const toggle = () => {
    if (player.getIsPlaying()) {
      player.pause();
    } else {
      player.play();
    }
  }

  const contextValue = {
    play: player.play,
    toggle,
    seek: player.seek,
    getPosition: player.getPosition,
    getIsPlaying: player.getIsPlaying
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
      {textgrids ?
        <ScrollableCanvas
          item={props.item}
          marks={marks}
          textgrids={textgrids}
          onShiftClick={handleToggleMarker}
        /> : null}
    </ItemContext.Provider>
  </div>
}

function ScrollableCanvas(props: {
  item: ItemSet,
  // The loaded text grid for each file in the set
  textgrids: any[],
  // A mark data struture for each item in the set
  marks: TierMarkerState[],
  onShiftClick?: (itemId: number, entryId: number) => void,
}) {
  const scrollContainer = useRef<HTMLDivElement>(null);
  const [pixelsPerSecond, setPixelsPerSecond] = useState(300);
  const item = useItem();

  const maxTimestamp = useMemo(() => Math.max(...props.textgrids.flatMap(
      grid => Object.values(grid.tierDict)).map((tier: any) => tier.maxTimestamp as number)), [props.textgrids]);

  const handleKeyPress = useCallback((e: any) => {
    if (e.key === ' ') {
      item?.toggle()
    }
  }, [item]);

  const handleMouseDown = useCallback((e: any) => {
    const rect = scrollContainer.current!.getBoundingClientRect();
    const posX = e.clientX - rect.x;
    item?.seek(posX / pixelsPerSecond);
  }, [item, pixelsPerSecond]);

  const handleWheel = useCallback((e: any) => {
    const deltaY = e.deltaY * 0.1;
    setPixelsPerSecond(p => Math.max(20, Math.min(p + deltaY, 1000)))
  }, []);

  // Maybe we can cache this (and udpate on resize!)
  // const boundingClientRect = useMemo(() => {
  //   return scrollContainer.current?.getBoundingClientRect() ?? null;
  // }, [scrollContainer.current])

  useInterval(() => {
    if (!scrollContainer.current) {
      return;
    }

    if (!item?.getIsPlaying()) {
      return;
    }
    const pos = item?.getPosition() ?? 0;

    // Maybe we can cache this?
    const boundingClientRect = scrollContainer.current?.getBoundingClientRect();
    
    // Is it in the range?
    // Performance: accessing scrollLeft causes a "Recalculate Style" in Chrome, but this is fairly fast.
    const maxTime = (scrollContainer.current.scrollLeft + boundingClientRect!.width) / pixelsPerSecond;
    if (pos > maxTime) {
      scrollContainer.current.scrollTo({
        left: pos * pixelsPerSecond
      })
    }
  }, 100)

  const manager: LayoutManager = {
    cellRenderers(opts: { isScrolling: boolean; width: number; x: number }): any {
      return <div>
        {props.textgrids ? props.textgrids.map((textgrid: any, idx: number) => {
          return (
              <div key={idx}>
                <div
                  className={css`
                    transform: translateX(-100%);
                    position: absolute;
                    width: 50px;
                  `}
                >
                  <div style={{height: '50px', backgroundColor: props.item.colors?.[idx]}}/>
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
                    grid={textgrid}
                    marks={props.marks[idx].marks}
                    pixelsPerSecond={pixelsPerSecond}
                    onShiftClick={props.onShiftClick}
                    leftPixel={opts.x}
                    rightPixel={opts.x + opts.width}
                />
              </div>
          )
        }) : null}

        <Cursor pixelsPerSecond={pixelsPerSecond} />
      </div>
    },
    getScrollPositionForCell: () => {},
  };

  return <AutoSizer disableHeight>
    {({ width }: any) => {
      return <VirtualView
        onMouseDown={handleMouseDown}
        onKeyPress={handleKeyPress}
        onWheel={handleWheel}
        innerRef={scrollContainer}
        tabIndex={0}
        className={css`
          outline: none;
          overflow: auto;
          flex: 1;          
          
          padding-bottom: 10px;
          position: relative;
        `}
        layoutManager={manager}
        virtualWidth={maxTimestamp * pixelsPerSecond}
        width={width}
      />
    }}
  </AutoSizer>
}

function Cursor(props: {
  pixelsPerSecond: number
}) {
  const {pixelsPerSecond} = props;
  const item = useItem();
  const [cursorPos, setCursorPos] = useState(0);

  useRaf(() => {
    const pos = item?.getPosition() ?? 0;
    setCursorPos(pos);
  })

  return <div
    className={css`
      position: absolute;
      width: 1px;
      top: 0px;
      bottom: 0px;
      background: red;
    `}
    // Performance: Be sure to use translate, not `left`. The latter requires a long "Paint" cycle
    // in Chrome (if there are many elements).
    style={{transform: `translateX(${(cursorPos ?? 0) * pixelsPerSecond}px)`}} />;
}
