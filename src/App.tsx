import React, { useEffect, useState, useMemo } from 'react';
import './App.css';
import {useDropzone} from 'react-dropzone'
import {Item} from './browsers/multiple-folders/components/Item';
import { css, jsx } from '@emotion/core'
import { DirIndex } from './browsers/multiple-folders/FilesystemIndex';
import { ItemDef } from './browsers/multiple-folders/Items';
import { ThemeProvider, CSSReset } from "@chakra-ui/core";
import { Sidebar } from './browsers/multiple-folders/components/Sidebar';
import { MainRunSubdirs } from './browsers/run-subdirs/Main';


// function getSaple() {
//   const SampleItem: ItemDef = {
//     audio: import('./0a00cefec98b4b48b38efca150a3c49e.mp3');
//     grids: [
//       import('./0a00cefec98b4b48b38efca150a3c49e.TextGrid')
//     ]
//   }
// }



function MainMultipleFolders(props: {}) {
  const [items, setItems] = useState<ItemDef[]>([]);

  const dirIndex = useMemo(() => {
    return new DirIndex();
  }, []);

  useEffect(() => {
    dirIndex.load();
  }, [dirIndex])

  const hasItems = !!items.length;

  const handleSelect = (item: ItemDef) => {
    setItems(items => ([...items, item]));
  }

  const onDrop = React.useCallback(acceptedFiles => {
    // const nextState = produce(items, draftItems => {
    //   insertNewFiles(draftItems as any, acceptedFiles);
    // });
    // setItems(nextState);
  }, [setItems, items])

  const {getRootProps, getInputProps, isDragActive} = useDropzone({onDrop, noClick: true})

  return <div style={{display: 'flex', flexDirection: 'row'}}>
    <div {...getRootProps()} style={{position: 'relative', flex: 1}}>
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
          return <Item item={item} key={idx} dirIndex={dirIndex} />
        })}
      </div>
    </div>
    <Sidebar
        onSelect={handleSelect}
        dirIndex={dirIndex}
    />
  </div>
}

function App() {
  return (
    <ThemeProvider>
      <CSSReset />
      <MainRunSubdirs />
    </ThemeProvider>
  );
}

export default App;
