import { ShuttleAi } from '@shuttle-ai/type'
import classNames from 'classnames'
import { useState } from 'react'
import { CaretDownFilled } from '@ant-design/icons'

interface Props<T> {
  title?: string
  result?: ShuttleAi.Tool.Result<T>
  successRender: (content?: T) => React.ReactNode
}

export default function CatchResultError<T>({
  title = '执行结果',
  result,
  successRender,
}: Props<T>) {
  const [expand, setExpand] = useState(false)

  if (!result) return null

  return (
    <div className="shuttle-ai-tool-result">
      <p
        className="shuttle-ai-tool-result-title"
        onClick={() => setExpand(!expand)}
      >
        <CaretDownFilled
          style={{
            transform: expand ? 'rotate(0deg)' : 'rotate(-90deg)',
            marginRight: 8,
          }}
        />
        <span>{title}:</span>
      </p>
      <div
        className={classNames(
          'shuttle-ai-tool-result-content',
          expand && 'is-expand',
          `type-${result.type}`,
        )}
      >
        {result.type === 'fail' ? (
          <span>{result.reason}</span>
        ) : (
          successRender(result.content)
        )}
      </div>
    </div>
  )
}
