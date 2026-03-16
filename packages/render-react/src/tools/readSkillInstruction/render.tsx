import { Flex } from 'antd'
import { useTool } from '../../context'
import { ToolConfirmRender, CatchResultError } from '../../agentWork'
import MarkdownRender from '../../markdownRender'

export default function ReadSkillInstructionRender() {
  const { effectArgs, confirmResult, result, agent, toolId } = useTool<
    { skillName: string },
    string
  >()

  return (
    <Flex vertical gap={8}>
      <Flex vertical gap={4}>
        <b>技能名称：</b>
        <span>{effectArgs?.skillName || ''}</span>
      </Flex>
      <CatchResultError
        result={result}
        title="技能详情"
        successRender={(info) => <MarkdownRender>{info || ''}</MarkdownRender>}
      />
      <ToolConfirmRender agent={agent} toolId={toolId} result={confirmResult} />
    </Flex>
  )
}
