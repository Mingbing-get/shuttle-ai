import { Flex } from 'antd'
import { useTool } from '../../context'
import { ToolConfirmRender, CatchResultError } from '../../agentWork'
import MarkdownRender from '../../markdownRender'

export default function ReadMemoryFileRender() {
  const { effectArgs, confirmResult, result, agent, toolId } = useTool<
    { filePath: string },
    string
  >()

  return (
    <Flex vertical gap={8}>
      <Flex vertical gap={4}>
        <b>文件路径：</b>
        <span>{effectArgs?.filePath || ''}</span>
      </Flex>
      <CatchResultError
        result={result}
        title="文件内容"
        successRender={(info) => <MarkdownRender>{info || ''}</MarkdownRender>}
      />
      <ToolConfirmRender agent={agent} toolId={toolId} result={confirmResult} />
    </Flex>
  )
}
