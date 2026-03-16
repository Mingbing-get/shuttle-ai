import { Flex } from 'antd'
import { useTool } from '../../context'
import { ToolConfirmRender, CatchResultError } from '../../agentWork'
import MarkdownRender from '../../markdownRender'

export default function ReadSkillReferenceRender() {
  const { effectArgs, confirmResult, result, agent, toolId } = useTool<
    { skillName: string; path: string },
    { skillName: string; refContent: string }
  >()

  return (
    <Flex vertical gap={8}>
      <Flex vertical gap={4}>
        <b>技能名称：</b>
        <span>{effectArgs?.skillName || ''}</span>
        <b>引用路径：</b>
        <span>{effectArgs?.path || ''}</span>
      </Flex>
      <CatchResultError
        result={result}
        title="引用详情"
        successRender={(info) => (
          <MarkdownRender>{info?.refContent || ''}</MarkdownRender>
        )}
      />
      <ToolConfirmRender agent={agent} toolId={toolId} result={confirmResult} />
    </Flex>
  )
}
