/** @jsx jsx */
import React, { useMemo } from "react";
import {
    Textgrid, IntervalTier, PointTier, parseTextgrid,
    serializeTextgrid, serializeTextgridToCsv
  } from 'praatio';
  import { css, jsx } from '@emotion/core'
import { useItem } from "./Item";
import {Buffer} from 'buffer';


export function TextGrid(props: {
    buffer: string|Buffer
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
    
    return <div>
       {tg.tierNameList.map((name: string, idx: number) => {
          return <Tier tier={tg.tierDict[name]} key={idx} />
       })}
    </div>
}


export function Tier(props: {
    tier: any
}) {
    const item = useItem();
    const {tier} = props;
    const maxValue = tier.maxTimestamp;
    const pixelsPerSecond = 500;


    return <div css={css`
        padding: 10px;
        font-size: 24px;
        border-radius: 4px;
        position: relative;
        height: 30px;
  `}>
        {
            tier.entryList.map((entry: any, idx: number) => {
                const from = entry[0];
                const to = entry[1];
                const label = entry[2];

                const left = from * pixelsPerSecond;
                const width = (to - from) * pixelsPerSecond;

                return <div key={idx} css={css`
                    position: absolute;
                    border: 1px solid silver;
                    margin: 1px;
                    cursor: pointer;
                    font-size: 16px;

                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;

                    top: 0;
                    bottom: 0;
                    left: ${left}px;
                    width: ${width}px;

                    .times {
                        font-size: 8px;
                    }
                `}
                onClick={() => {
                    item!.play(from, to);
                }}>
                    {label}

                    <div className="times">{from} - {to}</div>
                </div>
            })
        }
    </div>;
}