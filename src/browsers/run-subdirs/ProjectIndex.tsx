import {EventEmitter} from "events";
import {openDB} from "idb";
import {IDBPDatabase} from "idb/build/esm/entry";
import {verifyPermission} from "../../utils/verifyPermission";
import {readFile} from "../../components/Item";
import YAML from 'yaml'
import {Mark, Marks} from "../../components/TierMarkers";


type ProjectRecord = {
  id: number,
  audioFolder: FileSystemDirectoryHandle,
  gridsFolder: FileSystemDirectoryHandle
}

/**
 * A project is two directories:
 *
 * - An audio folder, containing subfolders, each representing on corpus, each containing the audio files for that corpus.
 *
 *   `/audio/corpus1/foo.wav`
 *
 * - A grid folder, containing subfolders, each representing an alignment (or training run), each containing subfolders,
 *   each of which represents a corpus and the textgrid files for this corpus and run:
 *
 *   `/grids/run01/corpus1/foo.TextGrid`
 *
 *   The grids directory also has: /grids/INFO, /grids/diff.json, and we can write /grids/marks.json
 */
export class Project extends EventEmitter {
  private db: IDBPDatabase<any>;
  public record: ProjectRecord;
  private runs: {[key: string]: Run};
  public audioFiles: {[group: string]: { [name: string]: FileSystemFileHandle }};

  constructor(db: IDBPDatabase, record: ProjectRecord) {
    super();
    this.runs = {};
    this.audioFiles = {};
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

    if (this.record.audioFolder) {
      this.audioFiles = await Project.indexGroupOfFiles(this.record.audioFolder, ['wav', 'mp3'])
    }

    this.emit("update");
  }

  private static async indexRuns(handle: FileSystemDirectoryHandle) {
    const runs: {[key: string]: Run} = {};
    await verifyPermission(handle);

    for await (const entry of handle.values()) {
      if (entry.kind !== "directory") {
        continue;
      }

      // Load the info file
      let info: any;
      try {
        const infoFile = await entry.getFileHandle("INFO");
        const contents = await readFile(await infoFile.getFile(), 'string')
        info = YAML.parse(contents)

        if (info.corpora) {
          info.corpora = info.corpora.map((item: any) => {
            if (typeof item == 'string') {
              return {name: item}
            }
            return item;
          })
        }
      } catch (e) {
        info = {};
      }

      // Load the diff file
      let diff: any;
      try {
        const diffFile = await entry.getFileHandle("diff.json");
        diff = JSON.parse(await readFile(await diffFile.getFile(), 'string'))
      } catch (e) {
      }

      const baseName = removeExtension(entry.name);
      if (!runs[baseName]) {
        runs[baseName] = new Run(baseName, entry, {info, diff});
      }
    }

    return runs;
  }

  /*
   * One-level deep:
   *   /storybooks/file.wav
   */
  public static async indexGroupOfFiles(handle: FileSystemDirectoryHandle, ext?: string[]) {
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
        if (ext && ext?.indexOf(getExtension(file.name)) === -1) {
          continue;
        }
        const baseName = removeExtension(file.name);
        fileGroup[baseName] = file;
      }
    }

    return files;
  }

  getRuns(): Run[] {
    return Object.values(this.runs);
  }

  getRun(id: string): Run {
    return this.runs[id];
  }

  /**
   * The marks are notes that we make on the text grid entries, such as marking entries as having errors.
   *
   * Written to:
   *
   *  /grids/marks/corpus/file.json
   */
  async writeMarksFile(runId: string, groupId: string, fileId: string, marks: Marks) {
    const marksDir = await this.runs[runId].directory.getDirectoryHandle('marks', {create: true});
    const corpusDir = await marksDir.getDirectoryHandle(groupId, {create: true});
    const marksFile = await corpusDir.getFileHandle(fileId + '.json', {create: true});

    const writable = await marksFile.createWritable();
    await writable.write(JSON.stringify(marks));
    await writable.close();
  }
}


function getExtension(filename: string) {
  return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
}

export type Diff = {
  stats: any,
  files: any,
  groups?: {
    [key: string]: {
      stats: any,
      files: any,
    }
  }
  thresholds: number[]
}

export type RunInfo = {
  type: 'train'|'align',
  model?: string,
  corpora: { name: string, subset?: string, speaker?: boolean }[] ,
  description: string
}

/**
 * A single alignment (or training) run, which produced a set of TextGrid files.
 */
export class Run extends EventEmitter {
  // The root directory of this run
  directory: FileSystemDirectoryHandle

  public id: string;
  public grids?: {[group: string]: { [name: string]: FileSystemFileHandle }}
  public readonly info: RunInfo;
  public readonly diff: Diff|undefined;

  constructor(id: string, file: FileSystemDirectoryHandle, opts: {
    info: RunInfo,
    diff?: Diff
  }) {
    super();
    this.id = id;
    this.directory = file;
    this.info = opts?.info;
    this.diff = opts?.diff;
  }

  // Load all grid files in this directory
  async ensureGridsLoaded() {
    if (this.grids) { return; } // already loaded
    await verifyPermission(this.directory);
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

  // Load a mark json file from this run directory.
  async loadMarks(groupId: string, fileId: string): Promise<Mark[]|null> {
    await verifyPermission(this.directory);
    try {
      const marksDir = await this.directory.getDirectoryHandle("marks");
      const corpusDir = await marksDir.getDirectoryHandle(groupId);
      const markFile = await corpusDir.getFileHandle(fileId + '.json')
      const fileObj = await markFile.getFile();
      return JSON.parse(await fileObj.text());
    } catch (e) {
      return null;
    }
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