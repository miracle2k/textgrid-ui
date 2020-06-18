import { AutoSizer, List } from "react-virtualized";
import React, { useEffect, useState, useReducer } from "react";
import { DirIndex } from "./FilesystemIndex";
import { ItemDef } from "./Items";


export function FileList(props: {
    dirIndex: DirIndex|null,
    onSelect: any,
    filter?: string
}) {
    const [unfilteredItems, setUnfilteredItems] = useState<ItemDef[]>([]);
    useEffect(() => {
        const handle = () => {
            setUnfilteredItems(props.dirIndex?.getItems() ?? []);
        };
        props.dirIndex?.on('update', handle);
        return () => {
            props.dirIndex?.off('update', handle);
        }
    }, [props.dirIndex, setUnfilteredItems]);
    

    const [filteredView, setFilteredView] = useState<ItemDef[]>([]);
    useEffect(() => {
        let items = unfilteredItems;
        if (props.filter) {
            items = items.filter(item => item.name.indexOf(props.filter!) > -1)
        }
        setFilteredView(items);
    }, [unfilteredItems, props.filter]);


    console.log('count is', props.dirIndex?.count ?? 0, filteredView.length)

    return <AutoSizer>
        {({ height, width }: any) => (
        <List
            height={height}
            rowHeight={30}
            rowRenderer={({ index, key, style }: any) => {
                const item = filteredView[index];
                return <div key={key} style={style}>
                    <span onClick={() => props.onSelect(item)}>{item?.name}</span>
                    {item?.hasAudio ? <Mark color="red"> A </Mark> : null}
                    {item?.hasGrid ? <Mark color="green"> G </Mark> : null}
                </div>
            }}
            width={width}
            rowCount={filteredView.length}
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