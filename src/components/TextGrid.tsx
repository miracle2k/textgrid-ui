import React, { useMemo } from "react";
import {
  parseTextgrid,
} from 'praatio';
import { css } from 'emotion'
import {Buffer} from 'buffer';
import { useItem } from "./Item";



export function TextGrid(props: {
  buffer: string|Buffer,
  color?: string,
  handleStyle?: any
}) {
  const tg = useMemo(() => {
    if (!props.buffer) {
      return null;
    }
    return parseTextgrid(Buffer.from(props.buffer));
  }, [props.buffer]);

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

    <div style={{
      flex: 1,
      overflow: 'auto',
      paddingBottom: '10px'
    }}>
      {tg.tierNameList.map((name: string, idx: number) => {
        return <Tier tier={tg.tierDict[name]} key={idx} />
      })}
    </div>
  </div>
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
}) {
  const item = useItem();
  const {tier} = props;
  const maxValue = tier.maxTimestamp;

  const pixelsPerSecond = 100;


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
    
              .times {
                  font-size: 8px;
                  white-space: nowrap;
                  text-overflow: clip;
                  overflow: hidden;
                  text-align: center;
              }
          `}
          onClick={() => {
            item!.play(from, to);
          }}
          onDoubleClick={() => {
            item!.play(0);
          }}
        >
          {label}

          <div className="times" style={{width: `${width}px`}}>{from} - {to}</div>
        </div>
      })
    }
  </div>;
}