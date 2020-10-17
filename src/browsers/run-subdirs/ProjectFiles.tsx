import React, {useEffect, useState} from "react";
import {Project, Run} from "./ProjectIndex";
import {useUpdateOnEvent} from "../../utils/useEventedMemo";
import {OpenTextGridItem} from "./Main";

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

  return <div style={{padding: 20}}>
    <h5>Runs</h5>

    {props.project.getRuns().map(run => {
      return <li>
        Run: {run.directory.name}
        <a href="" onClick={(e) => handleBrowse(e, run)}>Browse</a>
      </li>
    })}

    {currentRun ? <>
      <h5>Browse Run</h5>
      <RunComponent run={currentRun} openTextgridItem={props.openTextgridItem} />
    </> : null}
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
  return <ul>
    {Object.values(props.run.grids).map(fileGroup => {
      return Object.values(fileGroup).map(file => {
        return <li>
          <a href={""} onClick={e => {
            e.preventDefault();
            props.openTextgridItem(file);
          }}>{file.name}</a>
        </li>
      })
    })}
  </ul>
}