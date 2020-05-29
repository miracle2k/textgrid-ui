/** @jsx jsx */
import React, { useEffect, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import {useDropzone} from 'react-dropzone'
import {TextGrid} from './TextGrid';
import {Item} from './Item';
import { css, jsx } from '@emotion/core'
import produce from "immer"



// function getSaple() {
//   const SampleItem: ItemDef = {
//     audio: import('./0a00cefec98b4b48b38efca150a3c49e.mp3');
//     grids: [
//       import('./0a00cefec98b4b48b38efca150a3c49e.TextGrid')
//     ]
//   }
// }


export type ItemDef = {
    name: string,
    audio?: File,
    grids: File[]
};


function removeExtension(name: string) {
  if (!name.indexOf('.')) {
    return name;
  }

  return name.replace(/\.(.*?)$/, "");
}


function insertNewFiles(items: ItemDef[], files: File[]) {
  console.log('foo', files)
  files.forEach((file: File) => {
    const name = removeExtension(file.name);

    if (file.type.startsWith("audio/")) {
      const matching = items.filter(item => {
        if (item.audio) {
          return false;
        }
        if (item.name !== name) {
          return false;
        }
        return true;
      });
      if (!matching.length) {
        items.push({name, audio: file, grids: []});
      }
      else {
        matching[0].audio = file;    
      }
    }

    // Assume a text grid file
    else {
      const matching = items.filter(item => {
        if (item.name !== name) {
          return false;
        }
        return true;
      });
      if (!matching.length) {
        items.push({name, grids: [file]});
      }
      else {
        matching[0].grids.push(file);
      } 
    }
  });
}



function App() {
  const [items, setItems] = useState<ItemDef[]>([]);
  const hasItems = !!items.length;

  const onDrop = React.useCallback(acceptedFiles => {
    const nextState = produce(items, draftItems => {
      insertNewFiles(draftItems as any, acceptedFiles);
    });
    setItems(nextState);
  }, [setItems, items])
  const {getRootProps, getInputProps, isDragActive} = useDropzone({onDrop, noClick: true})
  
  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      <div css={css`
        height: 100vh;
      `}>
        {(!hasItems || isDragActive) ? <div css={css`
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          right: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        `}>{
            isDragActive ?
              <p>Drop the files here ...</p> :
              <p>Drag 'n' drop some files here, or click to select files</p>
          }
        </div> : null}

        {items.map((item, idx) => {
          return <Item item={item} key={idx} />
        })} 
      </div>
    </div>
  );
}

export default App;
