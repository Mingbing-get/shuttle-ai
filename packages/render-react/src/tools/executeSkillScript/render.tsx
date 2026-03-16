import { Flex } from 'antd'
import { useTool } from '../../context'
import { ToolConfirmRender, CatchResultError } from '../../agentWork'

export default function ExecuteSkillScriptRender() {
  const { effectArgs, confirmResult, result, agent, toolId } = useTool<
    { skillName: string; path: string; args: Record<string, any> },
    string
  >()

  return (
    <Flex vertical gap={8}>
      <Flex vertical gap={4}>
        <b>技能名称：</b>
        <span>{effectArgs?.skillName || ''}</span>
        <b>脚本路径：</b>
        <span>{effectArgs?.path || ''}</span>
        <b>脚本参数：</b>
        <span>
          <pre>{JSON.stringify(effectArgs?.args || {}, null, 2)}</pre>
        </span>
      </Flex>
      <CatchResultError
        result={result}
        title="执行结果"
        successRender={(info) => (
          <p style={{ wordBreak: 'break-word', whiteSpace: 'wrap' }}>{info}</p>
        )}
      />
      <ToolConfirmRender agent={agent} toolId={toolId} result={confirmResult} />
    </Flex>
  )
}
