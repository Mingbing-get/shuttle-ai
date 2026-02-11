import { useTool } from '@shuttle-ai/render-react'
import { Input, Button } from 'antd'
import { useState } from 'react'

interface Props {}

export default function CreateModel(props: Props) {
  const { args, confirmResult, confirm } = useTool()
  const [name, setName] = useState<string>(args.name || '')

  return (
    <div>
      <Input
        disabled={!!confirmResult}
        placeholder="请输入商品名称"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <Button
        disabled={!!confirmResult}
        style={{ marginTop: 10 }}
        type="primary"
        onClick={() => confirm?.({ type: 'confirm', newArgs: { name } })}
      >
        提交
      </Button>
    </div>
  )
}
