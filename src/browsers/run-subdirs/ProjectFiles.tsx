import React, {useEffect, useState} from "react";
import {Project, Run} from "./ProjectIndex";
import {useUpdateOnEvent} from "../../utils/useEventedMemo";
import {OpenTextGridItem} from "./Main";
import {AutoSizer, List} from "react-virtualized";
import { Checkbox, Heading, TabList, Tabs, Tab, TabPanels, TabPanel } from "@chakra-ui/core";
import {ItemSet} from "../../components/Item";
import GeoPattern from "geopattern";
import {css} from "emotion";
import Split from 'react-split'


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
      return {run, file: run.grids?.[groupId]?.[fileId]!};
    }))).filter(x => !!x.file);

    const item: ItemSet = new ItemSet(fileId);
    const audioFile = props.project.audioFiles[groupId][fileId];
    item.grids = selectedGridFiles.map(x => x.file);
    item.patternSeeds = selectedGridFiles.map(x => x.run.id)
    item.audio = audioFile;

    props.openTextgridItem(item);
  }

  const runs = props.project.getRuns();
  runs.sort((a, b) => a.id.localeCompare(b.id))

  return <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
    <Split
        sizes={[25, 75]}
        minSize={100}
        expandToMin={false}
        gutterSize={10}
        gutterAlign="center"
        snapOffset={30}
        dragInterval={1}
        direction="vertical"
        cursor="row-resize"
        style={{flex: 1}}
        elementStyle={(dimension: any, size: any, gutterSize: any) => {
          return {
            'height': 'calc(' + size + '% - ' + gutterSize + 'px)'
          }
        }}
        gutterStyle={() => {
          return { 'height': '1px', borderTop: '2px dotted #dadaff'}
        }}
    >
      <Tabs style={{display: 'flex', flexDirection: 'column', flex: 1}}>
        <TabList>
          <Tab>Runs</Tab>
          <Tab>Corpora</Tab>
        </TabList>
        <TabPanels style={{display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto'}}>
          <TabPanel  className={css`
            :not([hidden]) {
              display: flex;
              flex-direction: column;
              flex: 1;              
            }
          `}>
            <RunsList runs={runs} selectedRuns={selectedRuns} toggleChecked={toggleChecked} handleBrowse={handleBrowse} />
          </TabPanel>
          <TabPanel>
            <CorporaList runs={runs} selectedRuns={selectedRuns} toggleChecked={toggleChecked} handleBrowse={handleBrowse} />
          </TabPanel>
        </TabPanels>
      </Tabs>

      <div style={{flex: 1, padding : 10}}>
        {currentRun ? <>
            <strong>Browse Run</strong>
            <RunComponent run={currentRun} openTextgridItem={handleOpenTextGridItem} />
            </> : null}
      </div>
    </Split>
  </div>
}

export function CorporaList(props: {
  runs: Run[],
  handleBrowse: any,
  selectedRuns: Run[],
  toggleChecked: any,
}) {
  const {runs, selectedRuns, toggleChecked, handleBrowse} = props;

  // group by corpora
  const result: { [key: string]: Run[] } = {};
  for (const run of props.runs) {
    for (const corpid of run.info.corpora ?? []) {
      if (!result[corpid.name]) {
        result[corpid.name] = [];
      }
      result[corpid.name].push(run);
    }
  }

  return <div>
    {
      Object.entries(result).map(([corpid, runs]) => {
        return <div key={corpid}>
          <div style={{fontWeight: 'bold', fontSize: '18px'}}>{corpid}</div>
          {
            runs.map(run => {
              return <div key={run.id} style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center'
              }}>
                <div>
                  <Checkbox
                      display={"block"}
                      isChecked={selectedRuns.indexOf(run) > -1}
                      onChange={e => toggleChecked(run, e.target.checked)}
                  />
                </div>

                <div style={{width: '90px'}}>
                  <a href="" onClick={(e) => props.handleBrowse(e, run)}>
                    {run.id}
                  </a>
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  flex: 1
                }}>
                  <div style={{display: 'inline-block', marginRight: '5px', width: '30px', height: '30px', backgroundSize: '120%', backgroundImage: GeoPattern.generate(run.id).toDataUrl()}} />
                  <div style={{padding: '4px', margin: '4px', backgroundColor: run.info?.type === 'align' ? '#d1d9ff' : '#d9d9d9'}}>
                    {run.info?.type}
                  </div>
                  <div>
                    {getRunDesc(run)}
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center'
                }}>
                  {run.diff ? <>
                    {run.diff.groups?.[corpid]?.stats.average.map((value: any) => {
                      return <div style={{width: 60}}>{value}%</div>
                    })}
                  </> : null}
                </div>
              </div>
            })
          }
        </div>
      })
    }
  </div>
}


function getRunDesc(run: Run) {
  return (run.info?.corpora ?? []).map(x => {
    let parts = [];
    if (x.subset) {
      parts.push(x.subset);
    }
    if (x.speaker) {
      parts.push('speaker');
    }
    if (parts.length) {
      return `${x.name} [${parts}]`;
    }
    return x.name;
  }).join(", ");
}

export function RunsList(props: {
  runs: Run[],
  selectedRuns: Run[],
  toggleChecked: any,
  handleBrowse: any
}) {
  const {runs, selectedRuns, toggleChecked, handleBrowse} = props;

  return <table>
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
    {runs.map(run => {
      return <tr key={run.id}>
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
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center'
          }}>
            <div style={{display: 'inline-block', marginRight: '5px', width: '30px', height: '30px', backgroundSize: '120%', backgroundImage: GeoPattern.generate(run.id).toDataUrl()}} />
            <div style={{padding: '4px', margin: '4px', backgroundColor: run.info?.type === 'align' ? '#d1d9ff' : '#d9d9d9'}}>
              {run.info?.type}
            </div>
            <div>
              {getRunDesc(run)}
            </div>
          </div>
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
}


export function RunComponent(props: {
  run: Run,
  openTextgridItem: OpenTextGridItem
}) {
  useUpdateOnEvent(props.run, 'update');

  if (!props.run.grids) {
    return <>Loading...</>
  }

  // Parse each grid in the run
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
            rowHeight={24}
            rowRenderer={({ index, key, style }: any) => {
              const {fileId, file, groupId} = items[index];

              return <div key={key} style={{...style, display: 'flex', flexDirection: 'row'}} className={css`
                border-bottom: 1px solid #eeeeee;
                &:hover {
                  background-color: #EEEEEE;
                }
              `}>
                <div style={{flex: 1}} className={css`
                  text-overflow: ellipsis;
                  overflow: hidden;
                `}>
                  <a href={""} onClick={e => {
                    e.preventDefault();
                    props.openTextgridItem(groupId, fileId, file);
                  }}>{file.name}</a>
                </div>

                <DiffCells run={props.run} groupId={groupId} fileId={fileId} />

              </div>
            }}
            width={width}
            rowCount={items.length}
        />
    )}
  </AutoSizer>
}


function DiffCells(props: {
  run: Run,
  groupId: string,
  fileId: string
}) {
  const {groupId, fileId} = props;
  return (props.run.diff?.files[`${groupId}/${fileId}.TextGrid`] ?? ['-', '-', '-', '-']).map((value: any) => {
    let content;
    if (value === '-') {
      content = "?";
    }
    else if (parseFloat(value) === 0) {
      content = <span style={{color: 'gray'}}>✓</span>;
    }
    else {
      content = `${(value * 100).toFixed(1)}%`;
    }
    return <div style={{width: '70px'}}>{content}</div>
  })
}