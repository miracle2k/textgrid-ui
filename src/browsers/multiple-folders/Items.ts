/**
 * This wrap a piece of data + knows which folder it came from.
 */
export interface FolderReference<T> {
    data: T,
    folderId: number
}


/**
 * Iten which can be added a textgrid file.
 */
export class ItemDef {
    name: string = "";
    audio?: FolderReference<File|FileSystemFileHandle>|null = null;
    grids: (FolderReference<File|FileSystemFileHandle>)[] = [];

    constructor(name: string) {
        this.name = name;
    }

    get hasAudio() {
        return !!this.audio;
    }

    get hasGrid() {
        return !!this.grids.length;
    }

    public removeAllReferencingFolder(folderId: number) {
        if (this.audio?.folderId == folderId) {
            this.audio = null;
        }

        this.grids = this.grids.filter(g => g.folderId != folderId);
    }
}


export type ItemMap = {[key: string]: ItemDef};


export type FolderRecord = {
    id: number;
    name?: string;
    handle: FileSystemDirectoryHandle;
    color?: string;
};
