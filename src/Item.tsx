/** @jsx jsx */
import useSound from 'use-sound';
import React, { useEffect, useState } from 'react';
import { ItemDef } from './App';
import { TextGrid } from './TextGrid';
import { css, jsx } from '@emotion/core'
import 'howler';

export type ItemContextType = {
    play: (from: number, to: number) => void
};
const ItemContext = React.createContext<ItemContextType|null>(null);

export function useItem() {
    return React.useContext(ItemContext);
}


function readFile(file: File) {
    return new Promise<string|ArrayBuffer>((resolve, reject) => {
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
            resolve(binaryStr);
        }
        return reader.readAsArrayBuffer(file)
    })
}

export function Item(props: {
    item: ItemDef
}) {
    const [buffers, setBuffers] = useState<any>();
    useEffect(() => {
        (async () => {
            if (!props.item.grids.length) { return; }
            //const response = await fetch(props.item.audio);
            //const data = await response.text();

            const promises = props.item.grids.map(file => readFile(file))
            const data = await Promise.all(promises);
            setBuffers(data);
        })();
    }, [props.item.grids]);

    const [audioUrl, setAudioUrl] = useState<string>("");
    React.useEffect(() => {
        if (!props.item.audio) {
            setAudioUrl("");
            return;
        }        
        const objectURL = URL.createObjectURL(props.item.audio);
        // https://github.com/joshwcomeau/use-sound/issues/23
        window.setTimeout(() => {
            setAudioUrl(objectURL);
        }, 100)        
        return () => {
            URL.revokeObjectURL(objectURL);
        }
    }, [props.item.audio])

    const [playInternal, {sound}] = useSound(audioUrl, {
        // @ts-ignore
        format: ['mp3'],
    });
    
    const play = (from: number, to: number) => {
        // https://github.com/goldfire/howler.js/issues/535
        sound._sprite.clickedSprite = [from * 1000, (to-from) * 1000];
        //playInternal();
        sound.play("clickedSprite");
    }

    return <div css={css`
        margin: 40px 10px;
        overflow: scroll;
        strong {
            color: silver;
            font-weight: normal;
            display: block;
        }
    `}>
        <strong>{props.item.name}</strong>
        <ItemContext.Provider value={{play}}>
            {buffers ? buffers.map((buffer: any) => {
                return <TextGrid buffer={buffer} />
            }) : null}
        </ItemContext.Provider>
    </div>
}