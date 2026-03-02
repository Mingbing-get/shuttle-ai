import { useTool } from '@shuttle-ai/render-react'
import { Input, Button } from 'antd'

interface Props {}

export default function CreateModel(props: Props) {
  const { effectArgs, confirmResult, confirm, updateArg } = useTool<{
    name: string
  }>()

  return (
    <div>
      <Input
        disabled={!!confirmResult}
        placeholder="请输入商品名称"
        value={effectArgs.name}
        onChange={(e) => updateArg(['name'], e.target.value)}
      />

      <Button
        disabled={!!confirmResult}
        style={{ marginTop: 10 }}
        type="primary"
        onClick={() => confirm?.({ type: 'confirm', newArgs: effectArgs })}
      >
        提交
      </Button>
    </div>
  )
}
