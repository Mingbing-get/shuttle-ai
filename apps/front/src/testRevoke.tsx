import { Button, Input, Flex } from 'antd'
import { useWork } from '@shuttle-ai/render-react'

interface Props {
  workId: string
}

export default function TestRevoke({ workId }: Props) {
  const work = useWork()

  const handleClick = async () => {
    await work.revoke(workId)
  }

  return (
    <Flex align="center">
      <Input placeholder="输入work ID" defaultValue={workId} />
      <Button type="primary" onClick={handleClick}>
        恢复
      </Button>
    </Flex>
  )
}
