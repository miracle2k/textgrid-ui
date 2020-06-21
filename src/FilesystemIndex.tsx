import { openDB, deleteDB, wrap, unwrap } from 'idb';
import { ItemMap, ItemDef } from "./Items";
import {EventEmitter} from 'events';
import { Directory } from './Items';


export async function verifyPermission(fileHandle: any, withWrite: boolean = false) {
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
    private db: any;

    // 
    private map: ItemMap;

    constructor() {
        super();        
        this.map = {};
    }

    async load() {
        this.db = await openDB('textgrid', 1, {
            upgrade(db, oldVersion, newVersion, transaction) {
                if (!db.objectStoreNames.contains('dirs')) {
                    db.createObjectStore('dirs', {keyPath: 'id', autoIncrement: true});
                }
            },
            blocked() {
            },
            blocking() {
            },
            terminated() {
            },
          });

        let transaction = this.db.transaction("dirs", "readonly");
        let dirs = await this.db.getAll("dirs");
        for (const dirRecord of dirs) {   
            if (!dirRecord.handle) { continue; }         
            await this.indexHandle(dirRecord.handle, dirRecord.id);
        }   
        this.emit('update')
    }   

    get count() {
        return Object.keys(this.map).length;
    }

    getIndex(idx: number): ItemDef {
        return Object.values(this.map)[idx];
    }

    async addHandle(handle: DirectoryHandle) {
        let transaction = this.db.transaction("dirs", "readwrite");
        let dirs = transaction.objectStore("dirs");
        const {result} = await dirs.add({
            handle: handle
        });

        await this.indexHandle(handle, result);
        this.emit('update')
    }

    private async indexHandle(handle: DirectoryHandle, folderId: number) {
        const fileMap = this.map;
        for await (const file of iterateDirectory(handle)) {
            const baseName = removeExtension(file.name);
            if (!fileMap[baseName]) {
                fileMap[baseName] = new ItemDef(baseName);
            }
            if (file.name.endsWith('.mp3') || file.name.endsWith('.wav')) {
                fileMap[baseName].audio = {data: file, folderId};
            }
            else {
                fileMap[baseName].grids.push({data: file, folderId});
            }
        }
    }

    getItems(): ItemDef[] {
        return Object.values(this.map);
    }

    async removeFolder(folderId: number) {
        await this.db?.delete("dirs", folderId);
        for (const item of Object.values(this.map)) {
            item.removeAllReferencingFolder(folderId);
        }
        this.emit('update');
    }

    async getFolders(): Promise<Directory[]> {
        let dirs: Directory[] = await this.db?.getAll("dirs");
        if (!dirs) { return []; }
        return Array.from(dirs);
    }

    async updateFolder(dirId: number, props: Partial<Directory>) {
        const d = await this.db.get('dirs', dirId);
        await this.db.put('dirs', {...d, ...props});
        this.emit('update');
    }
}

async function* iterateDirectory(dirHandle: any): AsyncIterable<FileHandle> {
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
  
    return name.replace(/\.([^.]*?)$/, "");
  }