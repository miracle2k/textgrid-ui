import React, { useState } from "react";
import { DirectoryList } from "./DirectoryList";
import { FileList } from "./FileList";
import { ItemDef } from "../Items";
import { DirIndex } from "../FilesystemIndex";
import { Button, Input } from "@chakra-ui/core";


export function Sidebar(props: {
    onSelect: (item: ItemDef) => void,
    dirIndex: DirIndex
}) {
    const {dirIndex} = props;
    const [filter, setFilter] = useState<string>("");

    async function handleOpen() {
        const opts = {type: 'open-directory'};
        const handle = await (window as any).chooseFileSystemEntries(opts);
        dirIndex.addHandle(handle);
      }

    return <div style={{width: '400px', borderLeft: '1px solid black', padding: 10, display: 'flex', flexDirection: 'column'}}>
        <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center'}}>
            <Button onClick={handleOpen}>open</Button>
            <Input placeholder="Filter" value={filter ?? ""} onChange={(e: any) => {
                setFilter(e.currentTarget.value);
            }} />
        </div>
        <div style={{height: 400}}>
            <DirectoryList 
                dirIndex={dirIndex} 
            />
        </div>
        <div style={{flex: 1}}>
            <FileList 
                dirIndex={dirIndex} 
                onSelect={props.onSelect}
                filter={filter}
            />
        </div>
    </div>;
}