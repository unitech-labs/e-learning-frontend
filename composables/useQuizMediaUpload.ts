import { useApiClient } from '~/api/apiClient'
import { useFileUpload } from '~/composables/useFileUpload'

/**
 * Upload audio / ảnh đề cho bài nghe lên S3 qua presigned URL, trả public_url
 * để lưu vào quiz (audio_url, image_urls).
 *
 * Content-type phải khớp danh sách backend cho phép, vì S3 kiểm tra header
 * Content-Type của lệnh PUT với chữ ký presigned.
 */
export const QUIZ_AUDIO_TYPES = ['audio/mpeg', 'audio/wav']
export const QUIZ_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

interface PresignedResponse {
  upload_url: string
  public_url: string
}

export function useQuizMediaUpload() {
  const apiClient = useApiClient()
  const { uploadFileWithProgress } = useFileUpload()
  const progress = ref(0)

  async function upload(file: File, endpoint: string, folder: string): Promise<string> {
    progress.value = 0
    const presigned = await apiClient.post<PresignedResponse>(endpoint, {
      file_name: file.name.replace(/ /g, '_'),
      content_type: file.type,
      folder,
    })
    await uploadFileWithProgress(file, presigned.upload_url, (percent) => {
      progress.value = percent
    })
    return presigned.public_url
  }

  return {
    progress: readonly(progress),
    uploadAudio: (file: File) => upload(file, '/system/upload-attachment-url/', 'quiz-media'),
    uploadImage: (file: File) => upload(file, '/system/upload-image/', 'general'),
  }
}
