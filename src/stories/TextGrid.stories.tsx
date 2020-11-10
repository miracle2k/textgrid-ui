import React from 'react';
import {TextGrid} from "../components/TextGrid";
import {Meta, Story} from "@storybook/react";
import {Item, ItemSet} from '../components/Item';
import {LayoutManager, VirtualView} from '../components/VirtualView';
import {parseTextgrid} from "praatio";
import {Buffer} from "buffer";


export default {
  title: 'TextGrid',
  component: TextGrid,
} as Meta;

const Template: Story<any> = (args) => {
  return <div style={{backgroundColor: '#FAFAFA', overflow: 'auto'}}>
    <TextGrid
      grid={parseTextgrid(Buffer.from(buffer))}
      pixelsPerSecond={500}
      itemIndex={0}
      leftPixel={0}
      rightPixel={1000}
    />
  </div>
};

export const TextGridOnly = Template.bind({});


export const PlayableItem: Story<any> = (args) => {
  const item = new ItemSet("foo.mp3");
  item.grids = [buffer, buffer];
  item.audio = 'https://file-examples-com.github.io/uploads/2017/11/file_example_MP3_700KB.mp3';
  item.colors = ['blue', 'yellow']
  return <div style={{backgroundColor: '#FAFAFA'}}>
    <Item item={item} />
  </div>
};

export const View: Story<any> = (args) => {
  const manager: LayoutManager = {
    cellRenderers(opts: { isScrolling: boolean; width: number; x: number }): any {
      return <TextGrid
          grid={parseTextgrid(Buffer.from(buffer))}
          pixelsPerSecond={1500}
          itemIndex={0}
          leftPixel={opts.x}
          rightPixel={opts.x + opts.width}

      />
    },
    getScrollPositionForCell: () => {},
  }
  return <div>
    <VirtualView height={400} layoutManager={manager} width={500} virtualWidth={7900} />
  </div>
}



const buffer = `
File type = "ooTextFile"
Object class = "TextGrid"

xmin = 0.0
xmax = 5.12
tiers? <exists>
size = 2
item []:
\titem [1]:
\t\tclass = "IntervalTier"
\t\tname = "words"
\t\txmin = 0.0
\t\txmax = 5.12
\t\tintervals: size = 36
\t\t\tintervals [1]:
\t\t\t\txmin = 0.000
\t\t\t\txmax = 0.120
\t\t\t\ttext = "sil"
\t\t\tintervals [2]:
\t\t\t\txmin = 0.120
\t\t\t\txmax = 0.280
\t\t\t\ttext = "y"
\t\t\tintervals [3]:
\t\t\t\txmin = 0.280
\t\t\t\txmax = 0.320
\t\t\t\ttext = "e"
\t\t\tintervals [4]:
\t\t\t\txmin = 0.320
\t\t\t\txmax = 0.440
\t\t\t\ttext = "k"
\t\t\tintervals [5]:
\t\t\t\txmin = 0.440
\t\t\t\txmax = 0.490
\t\t\t\ttext = "d"
\t\t\tintervals [6]:
\t\t\t\txmin = 0.490
\t\t\t\txmax = 0.600
\t\t\t\ttext = "ā"
\t\t\tintervals [7]:
\t\t\t\txmin = 0.600
\t\t\t\txmax = 0.680
\t\t\t\ttext = "n"
\t\t\tintervals [8]:
\t\t\t\txmin = 0.680
\t\t\t\txmax = 0.760
\t\t\t\ttext = "e"
\t\t\tintervals [9]:
\t\t\t\txmin = 0.760
\t\t\t\txmax = 0.830
\t\t\t\ttext = "e"
\t\t\tintervals [10]:
\t\t\t\txmin = 0.830
\t\t\t\txmax = 0.950
\t\t\t\ttext = "k"
\t\t\tintervals [11]:
\t\t\t\txmin = 0.950
\t\t\t\txmax = 1.010
\t\t\t\ttext = "u"
\t\t\tintervals [12]:
\t\t\t\txmin = 1.010
\t\t\t\txmax = 1.150
\t\t\t\ttext = "č"
\t\t\tintervals [13]:
\t\t\t\txmin = 1.150
\t\t\t\txmax = 1.280
\t\t\t\ttext = "a"
\t\t\tintervals [14]:
\t\t\t\txmin = 1.280
\t\t\t\txmax = 1.530
\t\t\t\ttext = "k"
\t\t\tintervals [15]:
\t\t\t\txmin = 1.530
\t\t\t\txmax = 2.160
\t\t\t\ttext = "sil"
\t\t\tintervals [16]:
\t\t\t\txmin = 2.160
\t\t\t\txmax = 2.230
\t\t\t\ttext = "d"
\t\t\tintervals [17]:
\t\t\t\txmin = 2.230
\t\t\t\txmax = 2.340
\t\t\t\ttext = "ā"
\t\t\tintervals [18]:
\t\t\t\txmin = 2.340
\t\t\t\txmax = 2.480
\t\t\t\ttext = "s"
\t\t\tintervals [19]:
\t\t\t\txmin = 2.480
\t\t\t\txmax = 2.550
\t\t\t\ttext = "t"
\t\t\tintervals [20]:
\t\t\t\txmin = 2.550
\t\t\t\txmax = 2.650
\t\t\t\ttext = "ā"
\t\t\tintervals [21]:
\t\t\t\txmin = 2.650
\t\t\t\txmax = 2.730
\t\t\t\ttext = "n"
\t\t\tintervals [22]:
\t\t\t\txmin = 2.730
\t\t\t\txmax = 2.820
\t\t\t\ttext = "e"
\t\t\tintervals [23]:
\t\t\t\txmin = 2.820
\t\t\t\txmax = 2.920
\t\t\t\ttext = "w"
\t\t\tintervals [24]:
\t\t\t\txmin = 2.920
\t\t\t\txmax = 3.010
\t\t\t\ttext = "ā"
\t\t\tintervals [25]:
\t\t\t\txmin = 3.010
\t\t\t\txmax = 3.090
\t\t\t\ttext = "n"
\t\t\tintervals [26]:
\t\t\t\txmin = 3.090
\t\t\t\txmax = 3.150
\t\t\t\ttext = "g"
\t\t\tintervals [27]:
\t\t\t\txmin = 3.150
\t\t\t\txmax = 3.210
\t\t\t\ttext = "ā"
\t\t\tintervals [28]:
\t\t\t\txmin = 3.210
\t\t\t\txmax = 3.280
\t\t\t\ttext = "r"
\t\t\tintervals [29]:
\t\t\t\txmin = 3.280
\t\t\t\txmax = 3.370
\t\t\t\ttext = "i"
\t\t\tintervals [30]:
\t\t\t\txmin = 3.370
\t\t\t\txmax = 3.460
\t\t\t\ttext = "m"
\t\t\tintervals [31]:
\t\t\t\txmin = 3.460
\t\t\t\txmax = 3.510
\t\t\t\ttext = "ā"
\t\t\tintervals [32]:
\t\t\t\txmin = 3.510
\t\t\t\txmax = 3.670
\t\t\t\ttext = "t"
\t\t\tintervals [33]:
\t\t\t\txmin = 3.670
\t\t\t\txmax = 3.850
\t\t\t\ttext = "ā"
\t\t\tintervals [34]:
\t\t\t\txmin = 3.850
\t\t\t\txmax = 4.010
\t\t\t\ttext = "i"
\t\t\tintervals [35]:
\t\t\t\txmin = 4.010
\t\t\t\txmax = 5.100
\t\t\t\ttext = "sil"
\t\t\tintervals [36]:
\t\t\t\txmin = 5.100
\t\t\t\txmax = 5.12
\t\t\t\ttext = ""
\titem [2]:
\t\tclass = "IntervalTier"
\t\tname = "phones"
\t\txmin = 0.0
\t\txmax = 5.12
\t\tintervals: size = 10
\t\t\tintervals [1]:
\t\t\t\txmin = 0.0
\t\t\t\txmax = 0.120
\t\t\t\ttext = ""
\t\t\tintervals [2]:
\t\t\t\txmin = 0.120
\t\t\t\txmax = 0.440
\t\t\t\ttext = "yek"
\t\t\tintervals [3]:
\t\t\t\txmin = 0.440
\t\t\t\txmax = 0.760
\t\t\t\ttext = "dāne"
\t\t\tintervals [4]:
\t\t\t\txmin = 0.760
\t\t\t\txmax = 0.830
\t\t\t\ttext = "e"
\t\t\tintervals [5]:
\t\t\t\txmin = 0.830
\t\t\t\txmax = 1.530
\t\t\t\ttext = "kučak"
\t\t\tintervals [6]:
\t\t\t\txmin = 1.530
\t\t\t\txmax = 2.160
\t\t\t\ttext = ""
\t\t\tintervals [7]:
\t\t\t\txmin = 2.160
\t\t\t\txmax = 2.820
\t\t\t\ttext = "dāstāne"
\t\t\tintervals [8]:
\t\t\t\txmin = 2.820
\t\t\t\txmax = 3.370
\t\t\t\ttext = "wāngāri"
\t\t\tintervals [9]:
\t\t\t\txmin = 3.370
\t\t\t\txmax = 4.010
\t\t\t\ttext = "mātāi"
\t\t\tintervals [10]:
\t\t\t\txmin = 4.010
\t\t\t\txmax = 5.12
\t\t\t\ttext = ""
  
  `;