import { useCallback, useEffect, useRef } from 'react'

export default function useRefCallback<T extends (...args: any[]) => any>(
  callback?: T,
) {
  const ref = useRef(callback)

  useEffect(() => {
    ref.current = callback
  }, [callback])

  const trigger = useCallback(
    (...args: Parameters<T>): ReturnType<T> | undefined => {
      return ref.current?.(...args)
    },
    [],
  )

  return trigger
}
