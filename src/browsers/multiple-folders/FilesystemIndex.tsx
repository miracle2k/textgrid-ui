import { openDB } from 'idb';
import { ItemMap, ItemDef } from "./Items";
import {EventEmitter} from 'events';
import { FolderRecord } from './Items';


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
            try {
                await this.indexHandle(dirRecord.handle, dirRecord.id);
            } catch (e) {
                console.log(dirRecord, e);
            }
        }   
        this.emit('update')
    }   

    get count() {
        return Object.keys(this.map).length;
    }

    getIndex(idx: number): ItemDef {
        return Object.values(this.map)[idx];
    }

    async addHandle(handle: FileSystemDirectoryHandle) {
        let transaction = this.db.transaction("dirs", "readwrite");
        let dirs = transaction.objectStore("dirs");
        const result = await dirs.add({
            handle: handle
        });

        await this.indexHandle(handle, result);
        this.emit('update')
    }

    private async indexHandle(handle: FileSystemDirectoryHandle, folderId: number) {
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

    async getFolders(): Promise<FolderRecord[]> {
        let dirs: FolderRecord[] = await this.db?.getAll("dirs");
        if (!dirs) { return []; }
        return Array.from(dirs);
    }

    async getFolder(folderId: number): Promise<FolderRecord> {
        return await this.db.get('dirs', folderId);
    }

    async updateFolder(folderId: number, props: Partial<FolderRecord>) {
        const d = await this.db.get('dirs', folderId);
        await this.db.put('dirs', {...d, ...props});
        this.emit('update');
    }
}

async function* iterateDirectory(dirHandle: any): AsyncIterable<FileSystemFileHandle> {
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