import {EventEmitter} from "events";
import {openDB} from "idb";
import {IDBPDatabase} from "idb/build/esm/entry";


type ProjectRecord = {
  id: number,
  audioFolder: FileSystemDirectoryHandle,
  gridsFolder: FileSystemDirectoryHandle
}

export class Project extends EventEmitter {
  private db: IDBPDatabase<any>;
  public record: ProjectRecord;
  private runs: {[key: string]: Run};

  constructor(db: IDBPDatabase, record: ProjectRecord) {
    super();
    this.runs = {};
    this.db = db;
    this.record = record;
  }

  setAudioFolder(folder: FileSystemDirectoryHandle)  {
    let newRecord = {...this.record, audioFolder: folder};
    this.db.put('projects', newRecord);
    this.record = newRecord;
    this.emit("update")
  }

  setGridsFolder(folder: FileSystemDirectoryHandle)  {
    let newRecord = {...this.record, gridsFolder: folder};
    this.db.put('projects', newRecord);
    this.record = newRecord;
    this.emit("update")
  }

  /**
   * Load all the runs/grids from the filesystem and all audio files.
   */
  async load() {
    if (this.record.gridsFolder) {
      this.runs = await Project.indexRuns(this.record.gridsFolder);
    }

    this.emit("update");

    // this.audioFilesByGroup = {
    // }
  }

  private static async indexRuns(handle: FileSystemDirectoryHandle) {
    const runs: {[key: string]: Run} = {};

    for await (const entry of handle.values()) {
      console.log(entry, entry.isDirectory)
      if (entry.kind !== "directory") {
        continue;
      }
      const baseName = removeExtension(entry.name);
      if (!runs[baseName]) {
        runs[baseName] = new Run(entry);
      }
    }

    return runs;
  }

  /*
   * One-level deep:
   *   /storybooks/file.wav
   */
  public static async indexGroupOfFiles(handle: FileSystemDirectoryHandle) {
    const files: {[group: string]: { [name: string]: FileSystemFileHandle }} = {};

    for await (const groupFile of handle.values()) {
      if (groupFile.kind !== 'directory') {
        continue;
      }
      const baseName = removeExtension(groupFile.name);
      if (!files[baseName]) {
        files[baseName] = {};
      }
      const fileGroup = files[baseName];

      for await (const file of groupFile.values()) {
        if (file.kind !== 'file') { continue; }
        const baseName = removeExtension(groupFile.name);
        fileGroup[baseName] = file;
      }
    }

    return files;
  }

  getRuns(): Run[] {
    return Object.values(this.runs);
  }
}

export class Run extends EventEmitter {
  directory: FileSystemDirectoryHandle
  stats?: any
  public grids?: {[group: string]: { [name: string]: FileSystemFileHandle }}

  constructor(file: FileSystemDirectoryHandle) {
    super();
    this.directory = file;
  }

  // Load all grid files in this directory
  async loadGrids() {
    await this.directory.requestPermission();
    let gridsDir: any;
    try {
      gridsDir = await this.directory.getDirectoryHandle("grids");
    } catch(e) {
      console.log(e);
      return;
    }
    this.grids = await Project.indexGroupOfFiles(gridsDir);
    this.emit("update");
  }
}

export class ProjectIndex extends EventEmitter {
  private db: IDBPDatabase<any>|undefined;
  public projects: Map<number, Project> = new Map();

  async load() {
    this.db = await openDB('textgridui-runsubdirs', 4, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // Create tables
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', {keyPath: 'id', autoIncrement: true});
        }
      },
      blocked() {
      },
      blocking() {
      },
      terminated() {
      },
    });

    let projects = await this.db.getAll("projects");
    for (const projectRecord of projects) {
      this.projects.set(projectRecord.id, new Project(this.db, projectRecord));
    }
    this.emit('update')

  }

  /**
   * Add a new project record
   */
  async addProject() {
    let transaction = this.db!.transaction("projects", "readwrite");
    let projects = transaction.objectStore("projects");
    const projectId = await projects.add({});
    const projectRecord: ProjectRecord = await this.db!.get("projects", projectId);
    this.projects.set(projectRecord.id, new Project(this.db!, projectRecord))
    this.emit('update')
  }

  async deleteProject(projectId: number) {
    let transaction = this.db!.transaction("projects", "readwrite");
    let projects = transaction.objectStore("projects");
    projects.delete(projectId);
    this.projects.delete(projectId);
    this.emit('update')
  }

  // async removeFolder(folderId: number) {
  //   await this.db?.delete("dirs", folderId);
  //   for (const item of Object.values(this.map)) {
  //     item.removeAllReferencingFolder(folderId);
  //   }
  //   this.emit('update');
  // }
  //
  // async getFolders(): Promise<FolderRecord[]> {
  //   let dirs: FolderRecord[] = await this.db?.getAll("dirs");
  //   if (!dirs) { return []; }
  //   return Array.from(dirs);
  // }
  //
  // async getFolder(folderId: number): Promise<FolderRecord> {
  //   return await this.db.get('dirs', folderId);
  // }
  //
  // async updateFolder(folderId: number, props: Partial<FolderRecord>) {
  //   const d = await this.db.get('dirs', folderId);
  //   await this.db.put('dirs', {...d, ...props});
  //   this.emit('update');
  // }
}


async function* iterateDirectoryRecursively(dirHandle: FileSystemDirectoryHandle): AsyncIterable<FileSystemFileHandle> {
  const entries = await dirHandle.entries();
  for await (const entry of entries) {
    // if (entry.kind == 'file') {
    //   if (entry.name.endsWith('.mp3') || entry.name.endsWith('.wav') || entry.name.endsWith('.TextGrid')) {
    //     yield entry;
    //   }
    // }
    // else {
    //   const dir = await dirHandle.getDirectory(entry.name);
    //   // @ts-ignore
    //   for await (const file of iterateDirectoryRecursively(dir)) {
    //     yield file;
    //   }
    // }
  }
}

function removeExtension(name: string) {
  if (!name.indexOf('.')) {
    return name;
  }

  return name.replace(/\.([^.]*?)$/, "");
}