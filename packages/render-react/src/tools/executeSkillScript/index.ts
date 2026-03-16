import { ShuttleAi } from '@shuttle-ai/type'

import Render from './render'

const executeSkillScriptTool: ShuttleAi.Client.Agent.WithRunTool = {
  name: 'execute_skill_script',
  description: '执行指定技能的脚本',
  label: '执行技能脚本',
  run: {
    type: 'render',
    Render: Render,
  },
  extras: {
    scope: 'write',
    disableExport: true,
  },
}

export default executeSkillScriptTool
