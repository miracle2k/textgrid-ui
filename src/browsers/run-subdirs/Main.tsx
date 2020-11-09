import React, {useMemo, useState, useEffect} from "react";
import {Tabs, TabList, TabPanels, Tab, TabPanel, Button} from "@chakra-ui/core";
import {css} from "emotion";
import {ProjectIndex, Project, Run} from "./ProjectIndex";
import {useUpdateOnEvent} from "../../utils/useEventedMemo";
import { FileBrowser } from "./FileBrowser";
import {ItemSet, Item} from "../../components/Item";
import Split from "react-split";
import {Marks} from "../../components/TierMarkers";


export function MainRunSubdirs() {
  const projectIndex = useMemo(() => {
    return new ProjectIndex();
  }, []);
  useEffect(() => { projectIndex.load(); }, [projectIndex]);

  const [selectedProject, setSelectedProject] = useState<Project|null>(null);
  const [items, setItems] = useState<ItemSet[]>([]);

  // Also remember, for each item, which runs they came from.
  const [runsForItem, setRunsForItem] = useState<Run[][]>([]);

  const openTextGridItem = (itemSet: ItemSet, runs: Run[]) => {
    setItems(items => ([...items, itemSet]));
    setRunsForItem(runsForItem => ([...runsForItem, runs]));
  }

  // TODO: Maybe debounce this
  const handleMarksChanged = (item: ItemSet, fileIdx: number, marks: Marks) => {
    const itemSetIndex = items.indexOf(item);
    const runs = runsForItem[itemSetIndex];
    selectedProject!.writeMarksFile(
        runs[fileIdx].id, (item?.metadata as any)?.groupId!, (item?.metadata as any).fileId!, marks);
  }

  return <div style={{display: 'flex', flexDirection: 'column'}}>
    <div className={css`
      height: 100vh;
      width: 100%;
      display: flex;
      flex-direction: column;
    `}>
      <Tabs style={{display: 'flex', flexDirection: 'column', flex: 1}}>
        <TabList>
          <Tab>Browse Project</Tab>
          <Tab>Projects</Tab>
        </TabList>

        <TabPanels style={{display: 'flex', flexDirection: 'column', flex: 1}}>
          <TabPanel className={css`
            :not([hidden]) {
              display: flex;
              flex-direction: column;
              flex: 1;
            }
          `}>
            <div className={css`
              display: flex;
              flex-direction: row;
              flex: 1;
          `}>
              <Split
                  sizes={[80, 20]}
                  minSize={100}
                  expandToMin={false}
                  gutterSize={10}
                  gutterAlign="center"
                  snapOffset={30}
                  dragInterval={1}
                  direction="horizontal"
                  cursor="col-resize"
                  style={{flex: 1, display: 'flex', flexDirection: 'row'}}
                  elementStyle={(dimension: any, size: any, gutterSize: any) => {
                    return {
                      'width': 'calc(' + size + '% - ' + gutterSize + 'px)',
                    }
                  }}
                  gutterStyle={() => {
                    return { 'width': '1px', borderLeft: '3px dotted #dadaff'}
                  }}
              >
                <div style={{position: 'relative'}}>
                  <div className={css`
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    overflow: auto;
                    padding: 20px;
                  `}>
                    {items.map((item, idx) => {
                      return <Item item={item} key={idx} onMarksChanged={handleMarksChanged}/>
                    })}
                  </div>
                </div>
                <div style={{display: 'flex', flexDirection: 'row', overflow: 'hidden'}}>
                  {selectedProject ?
                      <FileBrowser project={selectedProject} openTextgridItem={openTextGridItem} /> : null}
                </div>
              </Split>
            </div>
          </TabPanel>
          <TabPanel>
            <Dashboard index={projectIndex} onProjectSelect={project => {
              setSelectedProject(project)
            }}/>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  </div>
}

export function Dashboard(props: {
  index: ProjectIndex,
  onProjectSelect: (project: Project) => void
}) {
  useUpdateOnEvent(props.index, 'update');

  const handleAdd = () => {
    props.index.addProject();
  }

  return <div style={{padding: '20px'}}>
    <h3>
      Projects <Button onClick={handleAdd} size={"sm"}>Add</Button>
    </h3>

    {Array.from(props.index.projects.values()).map((project, idx) => {
      return <ProjectRow key={idx} index={props.index} project={project} onSelect={() => { props.onProjectSelect(project) }} />
    })}
  </div>
}

function ProjectRow(props: {
  project: Project,
  index: ProjectIndex,
  onSelect: () => void
}) {
  const {project, index} = props;
  useUpdateOnEvent(project, 'update');

  return  <div style={{border: '1px solid gray', padding: '19px'}}>
    <h4>
      {project.record.id} {" "}
      <Button size="xs" variantColor={"red"} onClick={() => props.index.deleteProject(project.record.id)}>Delete</Button>
      <Button size="sm" onClick={props.onSelect}>Pick</Button>

      <div>
        Audio: {project.record.audioFolder?.name ?? "(none)"} {" "}
        <Button size="xs" onClick={async () => {
          const handle = await window.showDirectoryPicker();
          project.setAudioFolder(handle);
        }}>Change</Button>
      </div>
      <div>
        Grids: {project.record.gridsFolder?.name ?? "(none)"} {" "}
        <Button size="xs" onClick={async () => {
          const handle = await window.showDirectoryPicker();
          project.setGridsFolder(handle);
        }}>Change</Button>
      </div>
    </h4>
  </div>
}
