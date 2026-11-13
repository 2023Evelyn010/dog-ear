import imageCompression from 'browser-image-compression'

/** 照片壓縮設定：長邊 1600px、JPEG 品質約 0.8（docs/PRD.md 3.2） */
export const IMAGE_MAX_EDGE = 1600
export const IMAGE_QUALITY = 0.8

export const IMAGE_READ_ERROR_MESSAGE = '這張照片無法讀取，請重新拍攝或選擇'

export class ImageReadError extends Error {
  constructor(cause?: unknown) {
    super(IMAGE_READ_ERROR_MESSAGE, { cause })
    this.name = 'ImageReadError'
  }
}

/** 壓縮一張照片並回傳 JPEG Blob。無法讀取或壓縮失敗時丟出 ImageReadError。 */
export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new ImageReadError()
  try {
    const out = await imageCompression(file, {
      maxWidthOrHeight: IMAGE_MAX_EDGE,
      initialQuality: IMAGE_QUALITY,
      fileType: 'image/jpeg',
      useWebWorker: true,
    })
    if (!out.size) throw new Error('empty output')
    // 只保留 Blob（不帶檔名），存進 IndexedDB 的就是純影像資料
    return new Blob([out], { type: 'image/jpeg' })
  } catch (err) {
    throw new ImageReadError(err)
  }
}
