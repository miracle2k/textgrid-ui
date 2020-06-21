import {AutoSizer, List} from "react-virtualized";
import React, { useEffect, useState } from "react";
import {DirIndex} from "../FilesystemIndex";
import { Directory } from "../Items";
import { CirclePicker } from 'react-color';
import { Popover, PopoverTrigger, Input, PopoverContent, PopoverArrow, PopoverCloseButton, PopoverBody, IconButton, Button } from "@chakra-ui/core";


export function DirectoryList(props: {
    dirIndex: DirIndex|null
}) {
    const [dirs, setDirs] = useState<Directory[]>([]);
    useEffect(() => {
        const handle = async () => {            
            const dirs = await props.dirIndex?.getFolders();
            setDirs(dirs ?? []);
        };
        handle();
        props.dirIndex?.on('update', handle);
        return () => {
            props.dirIndex?.off('update', handle);
        }
    }, [props.dirIndex, setDirs]);
    
    return <AutoSizer>
        {({ height, width }: any) => (
        <List
            height={height}
            rowHeight={30}
            rowRenderer={({ index, key, style }: any) => {
                return <DirListItem dir={dirs[index]} dirIndex={props.dirIndex!} />
            }}
            width={width}
            rowCount={dirs.length}
        />
        )}
    </AutoSizer>
}


function DirListItem(props: {
    dir: Directory,
    dirIndex: DirIndex
}) {
    let label = props.dir.name ?? "";
    let extra;
    if (!label) { 
        label = `folder: ${props.dir.handle?.name ?? '(unknown)'}`
        extra = "";
    } else {
        extra = ` (folder: ${props.dir.handle?.name ?? '(unknown)'})`
    }   

    return <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center'}}>
        <Popover usePortal={true}>
            <PopoverTrigger>
                <div style={{
                    display: 'inline-block',
                    width: 25,
                    height: 25,
                    backgroundColor: props.dir.color,
                    border: '1px solid silver',
                    borderRadius: 10,
                }}>
                </div>
            </PopoverTrigger>
            <PopoverContent zIndex={4}>
                <PopoverArrow />
                <PopoverBody>
                    <CirclePicker 
                        color={props.dir.color}
                        onChange={color => {
                            props.dirIndex.updateFolder(props.dir.id, {
                                color: color.hex
                            })
                        }}
                    />
                </PopoverBody>
            </PopoverContent>
        </Popover>
        <span style={{marginLeft: '10px', flex: 1}}>
            {label}{extra}
        </span>
        <span>
            <Popover usePortal={true}>
                <PopoverTrigger>
                    <IconButton aria-label="Edit" variant={"outline"} icon="info" size="xs" />
                </PopoverTrigger>
                <PopoverContent zIndex={4}>
                    <PopoverArrow />
                    <DirectoryProperties dir={props.dir} dirIndex={props.dirIndex} />
                </PopoverContent>
            </Popover>
        </span>
    </div>
}


export function DirectoryProperties(props: {
    dir: Directory,
    dirIndex: DirIndex
}) {
    const {dir} = props;
    const [text, setText] = useState(props.dir.name ?? "");
    return <PopoverBody style={{display: 'flex', flexDirection: 'column', alignItems: 'stretch'}}>                        
        <Input 
            placeholder="Custom Folder Name" 
            value={text}
            onChange={(e: any) => { 
                setText(e.currentTarget.value)
            }}
        />

        <div style={{
            display: 'flex',
            justifyContent: 'space-between'
        }}>
            <Button onClick={() => { 
                props.dirIndex.updateFolder(props.dir.id, {
                    name: text
                })
            }}>Save</Button>
            <Button variantColor="red" onClick={() => {
                props.dirIndex.removeFolder(props.dir.id);
            }}>Delete</Button>
        </div>
    </PopoverBody>;
}