interface FileHandle {
    name: string;
    getFile(): File;
}

interface DirectoryHandle {
    name: string;
}