import { Flex } from 'antd'
import { useTool } from '../../context'
import { ToolConfirmRender, CatchResultError } from '../../agentWork'
import MarkdownRender from '../../markdownRender'

export default function SearchMemoryGloballyRender() {
  const { effectArgs, confirmResult, result, agent, toolId } = useTool<
    { query: string },
    {
      path: string
      content: string
    }[]
  >()

  return (
    <Flex vertical gap={8}>
      <Flex vertical gap={4}>
        <b>查询内容：</b>
        <span>{effectArgs?.query || ''}</span>
      </Flex>
      <CatchResultError
        result={result}
        title="全局搜索结果"
        successRender={(info) => {
          if (!info) return null

          return (
            <Flex vertical gap={8}>
              {info.map((item) => (
                <Flex vertical gap={4} key={item.path}>
                  <b>文件路径：</b>
                  <span>{item.path}</span>
                  <b>内容：</b>
                  <MarkdownRender>{item.content || ''}</MarkdownRender>
                </Flex>
              ))}
            </Flex>
          )
        }}
      />
      <ToolConfirmRender agent={agent} toolId={toolId} result={confirmResult} />
    </Flex>
  )
}
