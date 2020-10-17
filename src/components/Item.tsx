/** @jsx jsx */
import useSound from 'use-sound';
import React, { useEffect, useState } from 'react';
import { ItemDef, FolderRecord } from '../browsers/multiple-folders/Items';
import { TextGrid } from './TextGrid';
import { css, jsx } from '@emotion/core'
import 'howler';
import { verifyPermission, DirIndex } from '../browsers/multiple-folders/FilesystemIndex';


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


// For files from the NativeFileSystem API
async function resolveFileHandle(file: FileHandle|File): Promise<File> {
    if (file && 'getFile' in file) {
        await verifyPermission(file);
        file = await file.getFile();        
    }
    return file;
}

async function readFileHighLevel(file: FileHandle|File) {    
    return await readFile(await resolveFileHandle(file));
}


function useResolveAudio(audio: File|FileHandle|undefined) {
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