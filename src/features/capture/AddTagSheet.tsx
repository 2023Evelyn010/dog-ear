import { useState } from 'react'
import { Button } from '../../components/Button'
import { Sheet } from '../../components/Sheet'
import { STORAGE_ERROR_MESSAGE } from '../../db/errors'
import type { ErrorTag } from '../../db/schema'
import { addErrorTag, DuplicateTagError, normalizeTagName } from '../../db/tags'

/** 「＋ 新增錯因」：輸入名稱，不可與現有錯因（含封存）重複 */
export function AddTagSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (tag: ErrorTag) => void
}) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const close = () => {
    setName('')
    setError(null)
    onClose()
  }

  async function submit() {
    if (!normalizeTagName(name) || busy) return
    setBusy(true)
    try {
      const tag = await addErrorTag(name)
      setName('')
      setError(null)
      onCreated(tag)
    } catch (err) {
      setError(err instanceof DuplicateTagError ? '已經有這個錯因了' : STORAGE_ERROR_MESSAGE)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={close} title="新增錯因">
      <form
        className="mt-4 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <input
          autoFocus
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError(null)
          }}
          maxLength={20}
          aria-label="錯因名稱"
          aria-invalid={!!error}
          className="w-full rounded-option border border-line bg-card px-3.5 py-3 text-button outline-primary"
        />
        {error && (
          <p role="alert" className="text-small text-ink">
            {error}
          </p>
        )}
        <Button type="submit" disabled={!normalizeTagName(name) || busy} className="mt-2">
          新增
        </Button>
        <Button variant="text" onClick={close}>
          取消
        </Button>
      </form>
    </Sheet>
  )
}
