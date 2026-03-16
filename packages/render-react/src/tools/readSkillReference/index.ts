import { ShuttleAi } from '@shuttle-ai/type'

import Render from './render'

const readSkillReferenceTool: ShuttleAi.Client.Agent.WithRunTool = {
  name: 'read_skill_reference',
  description: '读取指定技能的引用内容',
  label: '读取技能引用',
  run: {
    type: 'render',
    Render: Render,
  },
  extras: {
    disableExport: true,
  },
}

export default readSkillReferenceTool
