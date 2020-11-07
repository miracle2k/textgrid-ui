import React, {useCallback, useMemo, useRef, useState} from "react";
import {
  parseTextgrid,
} from 'praatio';
import { css } from 'emotion'
import {Buffer} from 'buffer';
import { useItem } from "./Item";
import {useRaf} from "../utils/useRaf";



export function TextGrid(props: {
  buffer: string|Buffer,
  color?: string,
  handleStyle?: any
}) {
  const [pixelsPerSecond, setPixelsPerSecond] = useState(300);
  const parent = useRef<any>();
  const tg = useMemo(() => {
    if (!props.buffer) {
      return null;
    }
    return parseTextgrid(Buffer.from(props.buffer));
  }, [props.buffer]);

  const item = useItem();

  const handleMouseDown = useCallback((e: any) => {
    const rect = parent.current.getBoundingClientRect()
    const posX = e.clientX - rect.x;
    item?.sound.seek(posX / pixelsPerSecond, item?.soundId);
  }, [item, pixelsPerSecond]);

  const handleWheel = useCallback((e: any) => {
    const deltaY = e.deltaY;
    setPixelsPerSecond(p => Math.min(p + deltaY, 1000))
  }, []);

  const handleKeyPress = useCallback((e: any) => {
    if (e.key === ' ') {
      item?.toggle()
    }
  }, [item]);

  if (!tg) {
    return <React.Fragment>(no text grid)</React.Fragment>;
  }

  return <div style={{
    display: 'flex',
    flexDirection: 'row'
  }}>
    <div style={{
      width: '20px',
      ...props.handleStyle
    }} />

    <div
      tabIndex={1}
      style={{
        flex: 1,
        overflow: 'auto',
        paddingBottom: '10px',
        position: 'relative'
      }}
      onMouseDown={handleMouseDown}
      onKeyPress={handleKeyPress}
      onWheel={handleWheel}
      ref={parent}
    >
      {tg.tierNameList.map((name: string, idx: number) => {
        return <Tier tier={tg.tierDict[name]} key={idx} pixelsPerSecond={pixelsPerSecond} />
      })}

      <Cursor pixelsPerSecond={pixelsPerSecond} />
    </div>
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
  `} style={{left: cursorPos * pixelsPerSecond}} />;
}

/**
 * work on better/cleaner exports*
 *   add speaker support
 *
 * first test case:
 *    speaker specific vs not
 */

export function Tier(props: {
  tier: any,
  pixelsPerSecond: number
}) {
  const item = useItem();
  const {tier, pixelsPerSecond} = props;
  const maxValue = tier.maxTimestamp;

  return <div className={css`
        padding: 10px;
        font-size: 24px;
        border-radius: 4px;
        position: relative;
        height: 35px;
  `}>
    {
      tier.entryList.map((entry: any, idx: number) => {
        const from = entry[0];
        const to = entry[1];
        const label = entry[2];

        const left = from * pixelsPerSecond;
        const width = (to - from) * pixelsPerSecond;

        return <div
            key={idx} style={{left: `${left}px`, width: `${width}px`}}
            className={css`
              position: absolute;
              border: 1px solid silver;
              margin: 1px;
              cursor: pointer;
              font-size: 14px;
    
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
    
              top: 0;
              bottom: 0;                    
    
              .times, .label {
                white-space: nowrap;
                text-overflow: clip;
                overflow: hidden;
                text-align: center;
              }
              .times {
                font-size: 8px;
              }
          `}
          onMouseDown={(e) => {
            item?.play({from, to});
            e.stopPropagation();
          }}
        >
          <div className="label" style={{width: `${width}px`}}>{label}</div>
          <div className="times" style={{width: `${width}px`}}>{from} - {to}</div>
        </div>
      })
    }
  </div>;
}