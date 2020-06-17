import { AutoSizer, List } from "react-virtualized";
import React, { useEffect, useState, useReducer } from "react";
import { DirIndex } from "./FilesystemIndex";


export function FileList(props: {
    dirIndex: DirIndex|null,
    onSelect: any
}) {
    const [ignored, forceUpdate] = useReducer(x => x + 1, 0);

    useEffect(() => {
        const handle = () => {
            console.log('udpate')
            forceUpdate();
        };
        props.dirIndex?.on('update', handle);
        return () => {
            props.dirIndex?.off('update', handle);
        }
    }, [props.dirIndex, forceUpdate]);

    console.log('count is', props.dirIndex?.count ?? 0)


    return <AutoSizer>
        {({ height, width }: any) => (
        <List
            height={height}
            rowHeight={30}
            rowRenderer={({ index, key, style }: any) => {
                const item = props.dirIndex?.getIndex(index);
                return <div key={key} style={style}>
                    <span onClick={() => props.onSelect(item)}>{item?.name}</span>
                    {item?.hasAudio ? <Mark color="red"> A </Mark> : null}
                    {item?.hasGrid ? <Mark color="green"> G </Mark> : null}
                </div>
            }}
            width={width}
            rowCount={props.dirIndex?.count ?? 0}
        />
        )}
    </AutoSizer>
}


function Mark(props: {
    children: any,
    color: string
}){
    return <span style={{
        color: 'white',
        padding: 3,
        backgroundColor: props.color
    }}>{props.children}</span>
}