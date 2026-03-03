import { ShuttleAi } from '@shuttle-ai/type'

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
  if (!result) return null

  return (
    <div className="shuttle-ai-tool-result">
      <p className="shuttle-ai-tool-result-title">{title}:</p>
      <div className="shuttle-ai-tool-result-content">
        {result.type === 'fail' ? (
          <span>{result.reason}</span>
        ) : (
          successRender(result.content)
        )}
      </div>
    </div>
  )
}
