import { ShuttleAi } from '@shuttle-ai/type'

import Render from './render'

const readSkillInstructionTool: ShuttleAi.Client.Agent.WithRunTool = {
  name: 'read_skill_instruction',
  description: '读取指定技能的指令',
  label: '读取技能详情',
  run: {
    type: 'render',
    Render: Render,
  },
  extras: {
    disableExport: true,
  },
}

export default readSkillInstructionTool
