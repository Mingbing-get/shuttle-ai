import { Flex } from 'antd'
import { useTool } from '../../context'
import { ToolConfirmRender, CatchResultError } from '../../agentWork'
import MarkdownRender from '../../markdownRender'

export default function MemoryDirectoryIndexRender() {
  const { effectArgs, confirmResult, result, agent, toolId } = useTool<
    { path: string },
    string
  >()

  return (
    <Flex vertical gap={8}>
      <Flex vertical gap={4}>
        <b>目录路径：</b>
        <span>{effectArgs?.path || ''}</span>
      </Flex>
      <CatchResultError
        result={result}
        title="目录索引"
        successRender={(info) => <MarkdownRender>{info || ''}</MarkdownRender>}
      />
      <ToolConfirmRender agent={agent} toolId={toolId} result={confirmResult} />
    </Flex>
  )
}
