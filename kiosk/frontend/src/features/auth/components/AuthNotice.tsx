import type { ReactNode } from 'react'
import { ApiError } from '../../../shared/api'
import { Alert } from '../../../shared/ui'
import { useAuthErrorText } from './useAuthErrorText'

interface AuthNoticeProps {
  error: ApiError | null
  /** FR-72: an error state must always offer at least one way forward. */
  action?: ReactNode
}

export function AuthNotice({ error, action }: AuthNoticeProps) {
  const describe = useAuthErrorText()
  const text = describe(error)
  if (!text) {
    return null
  }
  return (
    <Alert tone={error?.isOffline ? 'warning' : 'error'} action={action}>
      {text}
    </Alert>
  )
}
