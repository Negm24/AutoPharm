import { useTranslation } from 'react-i18next'
import type { ApiError } from '../../../shared/api'

/**
 * Prefers the message the backend wrote. `security/errors.py` calls its details
 * "safe-to-display", and they are more specific than anything the client could guess
 * ("Use exactly four digits for your PIN."). The translated `errors.<code>` strings are
 * the fallback for an empty detail, an unknown code, or a failure with no response.
 */
export function useAuthErrorText(): (error: ApiError | null) => string | null {
  const { t } = useTranslation()

  return (error) => {
    if (!error) {
      return null
    }
    if (error.detail && error.detail !== 'Authentication failed.') {
      return error.detail
    }
    return t(`kiosk.auth.errors.${error.code}`, {
      defaultValue: t('kiosk.auth.errors.unknown'),
    })
  }
}
