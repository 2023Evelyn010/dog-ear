import { useState } from 'react'
import { compressImage, IMAGE_READ_ERROR_MESSAGE } from '../../lib/image'
import type { Draft } from './draft'

/** 錄入與編輯共用的表單狀態：草稿＋照片壓縮中的數量與錯誤 */
export function useQuestionForm(initial: () => Draft) {
  const [draft, setDraft] = useState<Draft>(initial)
  const [processing, setProcessing] = useState(0)
  const [photoError, setPhotoError] = useState<string | null>(null)

  async function addFiles(files: File[]) {
    setPhotoError(null)
    setProcessing((p) => p + files.length)
    for (const file of files) {
      try {
        const blob = await compressImage(file)
        setDraft((d) => ({ ...d, images: [...d.images, blob] }))
      } catch (err) {
        console.error(err)
        setPhotoError(IMAGE_READ_ERROR_MESSAGE)
      } finally {
        setProcessing((p) => p - 1)
      }
    }
  }

  return {
    draft,
    processing,
    photoError,
    update: (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch })),
    addFiles,
    /** 換成另一份草稿（存檔後下一題） */
    reset: (next: Draft) => {
      setDraft(next)
      setPhotoError(null)
    },
  }
}

export type QuestionFormState = ReturnType<typeof useQuestionForm>
