import React from 'react';
import {ItemDef} from '../Items';
import {DirIndex} from "../FilesystemIndex";


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
    return null;
}