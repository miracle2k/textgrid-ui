import React, {useMemo, useState, useEffect} from "react";
import {Tabs, TabList, TabPanels, Tab, TabPanel, Button} from "@chakra-ui/core";
import {css} from "@emotion/core";
import {ProjectIndex, Project} from "./ProjectIndex";
import {useUpdateOnEvent} from "../../utils/useEventedMemo";
import {AlignmentList} from "./AlignmentList";
import { ProjectFiles } from "./ProjectFiles";
import {ItemSet, Item} from "../../components/Item";


export type OpenTextGridItem = (groupId: string, fileId: string, item: FileSystemFileHandle) => void;

export function MainRunSubdirs() {
  const projectIndex = useMemo(() => {
    return new ProjectIndex();
  }, []);
  useEffect(() => { projectIndex.load(); }, [projectIndex]);

  const [selectedProject, setSelectedProject] = useState<Project|null>(null);
  const [items, setItems] = useState<ItemSet[]>([]);

  const openTextGridItem: OpenTextGridItem = (groupId, fileId, textgrid) => {
    const item: ItemSet = new ItemSet(fileId);
    const audioFile = selectedProject?.audioFiles[groupId][fileId];
    item.grids = [textgrid];
    item.audio = audioFile;
    setItems(items => ([...items, item]));
  }

  return <div style={{display: 'flex', flexDirection: 'row'}}>
    <div css={css`
      height: 100vh;
    `}>
      <Tabs>
        <TabList>
          <Tab>Dashboard</Tab>
          <Tab>Browse Project</Tab>
          <Tab>Loaded Grids</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <Dashboard index={projectIndex} onProjectSelect={project => {
              setSelectedProject(project)
            }}/>
          </TabPanel>
          <TabPanel>
            {selectedProject ? <ProjectFiles project={selectedProject} openTextgridItem={openTextGridItem} /> : null}
          </TabPanel>
          <TabPanel>
            {items.map((item, idx) => {
              return <Item item={item} key={idx} />
            })}
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
    <h3>Projects</h3>
    <Button onClick={handleAdd}>Add</Button>

    {Array.from(props.index.projects.values()).map(project => {
      return <ProjectRow index={props.index} project={project} onSelect={() => { props.onProjectSelect(project) }} />
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
      <Button onClick={() => props.index.deleteProject(project.record.id)}>Delete</Button>
      <Button onClick={props.onSelect}>Pick</Button>

      <div>
        Audio: {project.record.audioFolder?.name ?? "(none)"} {" "}
        <Button onClick={async () => {
          const handle = await window.showDirectoryPicker();
          project.setAudioFolder(handle);
        }}>Change</Button>
      </div>
      <div>
        Grids: {project.record.gridsFolder?.name ?? "(none)"} {" "}
        <Button onClick={async () => {
          const handle = await window.showDirectoryPicker();
          project.setGridsFolder(handle);
        }}>Change</Button>
      </div>
    </h4>

    <AlignmentList />
  </div>
}
