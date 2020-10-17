import useSound from 'use-sound';
import React, { useEffect, useState } from 'react';
import { ItemDef, FolderRecord } from '../Items';
import { TextGrid } from '../../../components/TextGrid';
import { css } from '@emotion/core'
import 'howler';
import {verifyPermission} from "../../../utils/verifyPermission";
import {DirIndex} from "../FilesystemIndex";
import {readFileHighLevel, useResolveAudio} from "../../../components/Item";


export type ItemContextType = {
    play: (from: number, to: number) => void
};
const ItemContext = React.createContext<ItemContextType|null>(null);

export function useItem() {
    return React.useContext(ItemContext);
}


export function Item(props: {
    item: ItemDef,
    dirIndex: DirIndex
}) {
    const [buffers, setBuffers] = useState<(ArrayBuffer|string)[]>();
    const [folders, setFolders] = useState<FolderRecord[]>();
    useEffect(() => {
        (async () => {
            if (!props.item.grids.length) { return; }
            //const response = await fetch(props.item.audio);
            //const data = await response.text();            
            const buffers = await Promise.all(
                props.item.grids.map(file => readFileHighLevel(file.data))
            );            
            
            const folders = await Promise.all(
                props.item.grids.map(item =>  props.dirIndex.getFolder(item.folderId))
            );
            setBuffers(buffers);
            setFolders(folders);
        })();
    }, [props.item.grids]);

    const [audioUrl, setAudioUrl] = useState<string>("");
    const audioFile = useResolveAudio(props.item.audio?.data);
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
    }, [audioFile])

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
            {buffers ? buffers.map((buffer: any, idx: number) => {
                return <TextGrid buffer={buffer} color={folders?.[idx].color} />
            }) : null}
        </ItemContext.Provider>
    </div>
}