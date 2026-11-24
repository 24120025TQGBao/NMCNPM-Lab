import { useEffect, useMemo, useState } from 'react'

// Each request owns its result; late responses cannot replace a newer route/filter.
export function useCatalogResource(load) {
  const [attempt, setAttempt] = useState(0)
  const request = useMemo(() => ({ load, attempt }), [load, attempt])
  const [result, setResult] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    Promise.resolve().then(() => request.load(controller.signal))
      .then((data) => {
        if (!controller.signal.aborted) setResult({ request, data, error: null })
      })
      .catch((error) => {
        if (!controller.signal.aborted) setResult({ request, data: null, error })
      })
    return () => controller.abort()
  }, [request])

  const current = result?.request === request ? result : null
  return {
    data: current?.data, error: current?.error, loading: !current,
    retry: () => setAttempt((value) => value + 1),
  }
}
