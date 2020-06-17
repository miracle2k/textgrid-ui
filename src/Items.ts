export class ItemDef {
    name: string = "";
    audio?: File|null = null;
    grids: File[] = [];

    constructor(name: string) {
        this.name = name;
    }

    get hasAudio() {
        return !!this.audio;
    }

    get hasGrid() {
        return !!this.grids.length;
    }
};


export type ItemMap = {[key: string]: ItemDef};





// function insertNewFiles(items: ItemDef[], files: File[]) {
//   console.log('foo', files)
//   files.forEach((file: File) => {
//     const name = removeExtension(file.name);

//     if (file.type.startsWith("audio/")) {
//       const matching = items.filter(item => {
//         if (item.audio) {
//           return false;
//         }
//         if (item.name !== name) {
//           return false;
//         }
//         return true;
//       });
//       if (!matching.length) {
//         items.push({name, audio: file, grids: []});
//       }
//       else {
//         matching[0].audio = file;    
//       }
//     }

//     // Assume a text grid file
//     else {
//       const matching = items.filter(item => {
//         if (item.name !== name) {
//           return false;
//         }
//         return true;
//       });
//       if (!matching.length) {
//         items.push({name, grids: [file]});
//       }
//       else {
//         matching[0].grids.push(file);
//       } 
//     }
//   });
// }