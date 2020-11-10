import React, {useState} from "react";
import { css } from 'emotion'
import { useItem } from "./Item";
import {Mark, Marks} from "./TierMarkers";
import {useRaf} from "../utils/useRaf";
import { isEqual } from "lodash";


export function TextGrid(props: {
  itemIndex: number,
  grid: any,
  marks?: Marks,
  pixelsPerSecond: number,
  onShiftClick?: (itemId: number, entryId: number) => void,
  leftPixel: number,
  rightPixel: number
}) {
  return <div className={css`
    margin-bottom: 15px;
  `}>
    {props.grid.tierNameList.map((name: string, idx: number) => {
      return <Tier
        itemIndex={props.itemIndex}
        tier={props.grid.tierDict[name]}
        key={idx}
        pixelsPerSecond={props.pixelsPerSecond}
        marks={name === 'phones' ? props.marks : undefined}
        onShiftClick={props.onShiftClick}
        leftPixel={props.leftPixel}
        rightPixel={props.rightPixel}
      />
    })}
  </div>
}

export function Tier(props: {
  itemIndex: number,
  tier: any,
  pixelsPerSecond: number,
  onShiftClick?: (itemId: number, entryId: number) => void,
  marks?: Marks,
  leftPixel: number,
  rightPixel: number
}) {
  const item = useItem();
  const {tier, pixelsPerSecond} = props;
  const [highlighted, setHighlighted] = useState<boolean[]>([]);

  const visibleEntries = tier.entryList.filter((entry: [number, number, string], idx: number) => {
    const from = entry[0];
    const to = entry[1];

    const left = from * pixelsPerSecond;
    const width = (to - from) * pixelsPerSecond;

    if (left + width < props.leftPixel) {
      return false;
    }
    if (left > props.rightPixel) {
      return false;
    }

    return true;
  });

  useRaf(() => {
    const pos = item?.getPosition() ?? 0;

    const current = visibleEntries.map((entry: [number, number, string], idx: number) => {
      const from = entry[0];
      const to = entry[1];

      if (pos >= from && pos <= to) {
        return true;
      }
      return false;
    });
    if (isEqual(current, highlighted)) {
      return;
    }
    setHighlighted(current);
  })

  return <div className={css`
    padding: 10px;
    font-size: 24px;
    border-radius: 4px;
    position: relative;
    height: 35px;    
  `}>
    {
      visibleEntries.map((entry: [number, number, string], idx: number) => {
        const from = entry[0];
        const to = entry[1];
        const label = entry[2];

        const left = from * pixelsPerSecond;
        const width = (to - from) * pixelsPerSecond;

        const doHighlight = highlighted[idx];

        return <div
          key={idx}
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
          style={{
            left: `${left}px`,
            width: `${width}px`,
            color: doHighlight ? 'red' : 'inherit',
            backgroundColor: props.marks?.[idx] === Mark.Correct ? "#e8f5e9" : props.marks?.[idx] === Mark.Error ? "#ffebee" : ""
          }}
          onMouseDown={(e) => {
            if (e.altKey) {
              props.onShiftClick?.(props.itemIndex, idx);
              e.stopPropagation();
              return;
            }

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