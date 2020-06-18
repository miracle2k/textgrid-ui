import { ItemMap, ItemDef } from "./Items";
import {EventEmitter} from 'events';


async function verifyPermission(fileHandle: any, withWrite: boolean) {
    const opts: any = {};
    if (withWrite) {
      opts.writable = true;
    }
    // Check if we already have permission, if so, return true.
    if (await fileHandle.queryPermission(opts) === 'granted') {
      return true;
    }
    // Request permission, if the user grants permission, return true.
    if (await fileHandle.requestPermission(opts) === 'granted') {
      return true;
    }
    // The user didn't grant permission, return false.
    return false;
}


export class DirIndex extends EventEmitter {
    private handles: any[];
    private map: ItemMap;

    constructor() {
        super();
        this.handles = [];
        this.map = {};
    }

    get count() {
        return Object.keys(this.map).length;
    }

    getIndex(idx: number): ItemDef {
        return Object.values(this.map)[idx];
    }

    async addHandle(handle: any) {
        this.handles.push(handle);
        const fileMap = this.map;
        for await (const file of iterateDirectory(handle)) {
            const baseName = removeExtension(file.name);
            if (!fileMap[baseName]) {
                fileMap[baseName] = new ItemDef(baseName);
            }
            if (file.name.endsWith('.mp3') || file.name.endsWith('.wav')) {
                fileMap[baseName].audio = file;
            }
            else {
                fileMap[baseName].grids.push(file);
            }
        }

        this.emit('update')
    }

    getItems(): ItemDef[] {
        return Object.values(this.map);
    }
}

async function* iterateDirectory(dirHandle: any): any {
    const entries = await dirHandle.getEntries();
    for await (const entry of entries) {
        if (entry.isFile) {
            if (entry.name.endsWith('.mp3') || entry.name.endsWith('.wav') || entry.name.endsWith('.TextGrid')) {
                yield entry;
            }            
        }
        else {
            const dir = await dirHandle.getDirectory(entry.name);
            // @ts-ignore
            for await (const file of iterateDirectory(dir)) {
                yield file;
            }
        }
    }
}

function removeExtension(name: string) {
    if (!name.indexOf('.')) {
      return name;
    }
  
    return name.replace(/\.(.*?)$/, "");
  }