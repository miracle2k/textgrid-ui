import React, {useEffect, useState} from "react";
import {Project, Run} from "./ProjectIndex";
import {useUpdateOnEvent} from "../../utils/useEventedMemo";
import {OpenTextGridItem} from "./Main";
import {AutoSizer, List} from "react-virtualized";
import { Checkbox, Heading } from "@chakra-ui/core";
import {ItemSet} from "../../components/Item";
import GeoPattern from "geopattern";

export function ProjectFiles(props: {
  project: Project,
  openTextgridItem: (item: ItemSet) => void;
}) {
  useUpdateOnEvent(props.project, 'update');

  useEffect(() => {
    props.project.load();
  }, [props.project])

  const [currentRun, setCurrentRun] = useState<Run|null>(null);
  const [selectedRuns, setSelectedRuns] = useState<Run[]>([]);

  useEffect(() => {
    if (!currentRun) { return; }
    currentRun.loadGrids();
  }, [currentRun])

  const handleBrowse = (e: any, run: Run) => {
    e.preventDefault();
    setCurrentRun(run)
  }

  const toggleChecked = (run: Run, checked: boolean) => {
    setSelectedRuns(runs => {
      let newRuns = [...runs];
      if (checked) {
        if (newRuns.indexOf(run) === -1) {
          newRuns.push(run);
        }
      } else {
        if (newRuns.indexOf(run) > -1) {
          newRuns.splice(newRuns.indexOf(run), 1)
        }
      }
      return newRuns;
    })
  }

  const handleOpenTextGridItem: OpenTextGridItem = async (groupId, fileId, textgrid) => {
    const runsToOpen = Array.from(new Set([...selectedRuns, currentRun!]));

    const selectedGridFiles = (await Promise.all(runsToOpen.map(async run => {
      await run.loadGrids();
      return {run, file: run.grids?.[groupId][fileId]!};
    }))).filter(x => !!x.file);

    const item: ItemSet = new ItemSet(fileId);
    const audioFile = props.project.audioFiles[groupId][fileId];
    item.grids = selectedGridFiles.map(x => x.file);
    item.patternSeeds = selectedGridFiles.map(x => x.run.id)
    item.audio = audioFile;

    props.openTextgridItem(item);
  }

  return <div style={{padding: 20, flex: 1, display: 'flex', flexDirection: 'column'}}>
    <div>
      <Heading size="md">Runs</Heading>

      <table>
        <thead>
          <tr>
            <th></th>
            <th>ID</th>
            <th>Description</th>
            <th>15ms</th>
            <th>50ms</th>
            <th>100ms</th>
            <th>500ms</th>
          </tr>
        </thead>
        <tbody>
          {props.project.getRuns().map(run => {
            return <tr>
              <td style={{verticalAlign: 'middle'}}>
                <Checkbox
                  display={"block"}
                  isChecked={selectedRuns.indexOf(run) > -1}
                  onChange={e => toggleChecked(run, e.target.checked)}
                />
              </td>
              <td>
                <a href="" onClick={(e) => handleBrowse(e, run)}>
                  {run.directory.name}
                </a>
              </td>
              <td>
                <div style={{display: 'inline-block', marginRight: '5px', width: '30px', height: '30px', backgroundSize: '120%', backgroundImage: GeoPattern.generate(run.id).toDataUrl()}} />
                {run.info}
              </td>

              {run.diff ? <>
                {run.diff.stats.average.map((value: any) => {
                  return <td>{value}%</td>
                })}
              </> : null}
            </tr>
          })}
        </tbody>
      </table>
    </div>

    {currentRun ? <div style={{flex: 1}}>
      <h5>Browse Run</h5>
      <RunComponent run={currentRun} openTextgridItem={handleOpenTextGridItem} />
    </div> : null}
  </div>
}


export function RunComponent(props: {
  run: Run,
  openTextgridItem: OpenTextGridItem
}) {
  useUpdateOnEvent(props.run, 'update');

  if (!props.run.grids) {
    return <>Loading...</>
  }

  let items: {groupId: string, fileId: string, file: FileSystemFileHandle}[] = [];
  Object.entries(props.run.grids).forEach(([groupId, fileGroup]) => {
    return Object.entries(fileGroup).forEach(([fileId, file]) => {
      items.push({fileId, file, groupId})
    });
  });

  return <AutoSizer>
    {({ height, width }: any) => (
        <List
            height={height}
            rowHeight={20}
            rowRenderer={({ index, key, style }: any) => {
              const {fileId, file, groupId} = items[index];

              return <div key={key} style={{...style, display: 'flex', flexDirection: 'row'}} >
                <div style={{flex: 1}}>
                  <a href={""} onClick={e => {
                    e.preventDefault();
                    props.openTextgridItem(groupId, fileId, file);
                  }}>{file.name}</a>
                </div>


                {(props.run.diff?.files[`${groupId}/${fileId}.TextGrid`] ?? ['-', '-', '-', '-']).map((value: any) => {
                  let content;
                  if (value === '-') {
                    content = "?";
                  }
                  else if (parseInt(value) === 0) {
                    content = '-';
                  }
                  else {
                    content = `${value}%`;
                  }
                  return <div style={{width: '100px'}}>{content}</div>
                })}
              </div>
            }}
            width={width}
            rowCount={items.length}
        />
    )}
  </AutoSizer>
}