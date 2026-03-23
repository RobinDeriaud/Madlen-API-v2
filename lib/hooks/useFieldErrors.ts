"use client"

import { useState, useCallback } from "react"

type FieldRule = { field: string; value: string; label: string }

export function useFieldErrors() {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [shaking, setShaking] = useState(false)

  const clearError = useCallback((field: string) => {
    setErrors((prev) => {
      if (!(field in prev)) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  const clearAll = useCallback(() => setErrors({}), [])

  /** Validate required fields. Returns true if all valid. */
  const validate = useCallback((rules: FieldRule[]) => {
    const newErrors: Record<string, string> = {}
    for (const { field, value, label } of rules) {
      if (!value.trim()) {
        newErrors[field] = `${label} est requis`
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setShaking(true)
      setTimeout(() => setShaking(false), 500)
      return false
    }
    setErrors({})
    return true
  }, [])

  /** Set errors from an API response that includes a `fields` object. */
  const setFromApi = useCallback((data: { error?: string; fields?: Record<string, string> }) => {
    if (data.fields && Object.keys(data.fields).length > 0) {
      setErrors(data.fields)
      setShaking(true)
      setTimeout(() => setShaking(false), 500)
      return true // field errors were set
    }
    return false // no field-level errors, use generic error
  }, [])

  /** Returns extra CSS classes for an input field. */
  const fieldCls = useCallback(
    (field: string) => {
      if (!errors[field]) return ""
      return shaking ? "!border-red-400 animate-shake" : "!border-red-400"
    },
    [errors, shaking],
  )

  /** Whether a field has an error. */
  const hasError = useCallback((field: string) => field in errors, [errors])

  return { errors, clearError, clearAll, validate, setFromApi, fieldCls, hasError }
}
