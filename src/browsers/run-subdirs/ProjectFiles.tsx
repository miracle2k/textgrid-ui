import React, {useEffect, useState} from "react";
import {Project, Run} from "./ProjectIndex";
import {useUpdateOnEvent} from "../../utils/useEventedMemo";
import {OpenTextGridItem} from "./Main";
import {AutoSizer, List} from "react-virtualized";

export function ProjectFiles(props: {
  project: Project,
  openTextgridItem: OpenTextGridItem
}) {
  useUpdateOnEvent(props.project, 'update');

  useEffect(() => {
    props.project.load();
  }, [props.project])

  const [currentRun, setCurrentRun] = useState<Run|null>(null);

  useEffect(() => {
    if (!currentRun) { return; }
    currentRun.loadGrids();
  }, [currentRun])

  const handleBrowse = (e: any, run: Run) => {
    e.preventDefault();
    setCurrentRun(run)
  }

  return <div style={{padding: 20, flex: 1, display: 'flex', flexDirection: 'column'}}>
    <div>
      <h5>Runs</h5>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {props.project.getRuns().map(run => {
            return <tr>
              <td>
                <a href="" onClick={(e) => handleBrowse(e, run)}>
                  {run.directory.name}
                </a>
              </td>
              <td>
                {run.info}
              </td>
            </tr>
          })}
        </tbody>
      </table>
    </div>

    {currentRun ? <div style={{flex: 1}}>
      <h5>Browse Run</h5>
      <RunComponent run={currentRun} openTextgridItem={props.openTextgridItem} />
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
            rowHeight={30}
            rowRenderer={({ index, key, style }: any) => {
              const {fileId, file, groupId} = items[index];
              return <div key={key} style={style}>
                <a href={""} onClick={e => {
                  e.preventDefault();
                  props.openTextgridItem(groupId, fileId, file);
                }}>{file.name}</a>
              </div>
            }}
            width={width}
            rowCount={items.length}
        />
    )}
  </AutoSizer>
}