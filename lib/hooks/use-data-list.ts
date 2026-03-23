"use client"

import { useCallback, useEffect, useState } from "react"

type UseDataListResult<T> = {
  data: T[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useDataList<T>(url: string): UseDataListResult<T> {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(() => {
    setLoading(true)
    setError(null)
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error("Erreur de chargement")
        return r.json()
      })
      .then((d) => setData(d))
      .catch(() => setError("Impossible de charger les données."))
      .finally(() => setLoading(false))
  }, [url])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
