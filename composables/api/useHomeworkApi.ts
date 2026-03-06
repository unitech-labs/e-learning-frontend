import type { ListApiResponse } from '~/api/apiClient'
import { useApiClient } from '~/api/apiClient'

// Nested types from API docs
export interface HomeworkUser {
  id: number
  username: string
  full_name: string
  avatar?: string
  email?: string
}

export interface HomeworkCourse {
  id: string
  title: string
  thumbnail?: string
}

export interface HomeworkClassroom {
  id: string
  title: string
  course: HomeworkCourse
}

export interface HomeworkAttachment {
  id?: string
  file_url: string
  file_name: string
  file_size: number
  file_type: string
}

export interface AdminHomework {
  id: string
  classrooms: HomeworkClassroom[]
  created_by: HomeworkUser
  title: string
  description: string
  attachments?: HomeworkAttachment[]
  due_date: string
  strict_deadline: boolean
  submission_count: number
  graded_count: number
  created_at: string
  updated_at: string
}

export interface AdminHomeworkListParams {
  course_id?: string
  classroom_id?: string
  page?: number
  page_size?: number
}

export interface AdminHomeworkListResponse extends ListApiResponse<AdminHomework> {}

// Admin submission types (from homework_api.md)
export interface AdminSubmissionHomework {
  id: string
  title: string
  due_date: string
}

export interface AdminSubmissionClassroom {
  id: string
  title: string
  course: HomeworkCourse
}

export interface AdminHomeworkSubmission {
  id: string
  homework: AdminSubmissionHomework
  classroom: AdminSubmissionClassroom
  student: HomeworkUser
  content: string
  attachments: SubmissionAttachment[]
  status: 'pending' | 'graded'
  grade: number | null
  feedback: string
  graded_by: HomeworkUser | null
  graded_at: string | null
  submitted_at: string
  updated_at: string
}

export interface AdminSubmissionListParams {
  homework_id?: string
  course_id?: string
  classroom_id?: string
  student_name?: string
  status?: 'pending' | 'graded'
  page?: number
  page_size?: number
}

export interface AdminSubmissionListResponse extends ListApiResponse<AdminHomeworkSubmission> {}

export interface AdminSubmissionCountResponse {
  total: number
  pending: number
  graded: number
}

export interface GradeSubmissionPayload {
  grade: number
  feedback?: string
}

export interface CreateHomeworkPayload {
  classroom_ids: string[]
  title: string
  description: string
  due_date: string
  strict_deadline?: boolean
  attachments?: {
    file_url: string
    file_name: string
    file_size: number
    file_type: string
  }[]
}

// Student homework types (different from Admin - single classroom, my_submission)
export interface StudentHomeworkClassroom {
  id: string
  title: string
  course: HomeworkCourse
}

export interface SubmissionAttachment {
  id: string
  file_url: string
  file_name: string
  file_size: number
  file_type: string
}

export interface StudentHomeworkMySubmission {
  id: string
  status: 'pending' | 'graded'
  grade: number | null
  submitted_at: string
}

export interface StudentHomeworkMySubmissionDetail {
  id: string
  content: string
  attachments: SubmissionAttachment[]
  status: 'pending' | 'graded'
  grade: number | null
  feedback: string
  submitted_at: string
}

export interface StudentHomework {
  id: string
  classroom: StudentHomeworkClassroom
  title: string
  description: string
  due_date: string
  strict_deadline: boolean
  is_overdue: boolean
  my_submission: StudentHomeworkMySubmission | null
  created_at: string
}

export interface StudentHomeworkDetail {
  id: string
  classroom: StudentHomeworkClassroom
  title: string
  description: string
  attachments?: HomeworkAttachment[]
  due_date: string
  strict_deadline: boolean
  is_overdue: boolean
  my_submission: StudentHomeworkMySubmissionDetail | null
  created_at: string
}

export interface SubmitHomeworkPayload {
  content: string
  attachments: {
    file_url: string
    file_name: string
    file_size: number
    file_type: string
  }[]
}

export interface UploadRequestPayload {
  file_name: string
  content_type: string
}

export interface UploadRequestResponse {
  upload_url: string
  file_url: string
  file_key: string
  expires_in: number
}

export interface StudentHomeworkListParams {
  course_id?: string
  classroom_id?: string
  page?: number
  page_size?: number
}

export interface StudentHomeworkListResponse extends ListApiResponse<StudentHomework> {}

export interface StudentHomeworkCountResponse {
  total: number
  pending: number
  submitted: number
  graded: number
  overdue: number
}

export function useHomeworkApi() {
  const apiClient = useApiClient()

  return {
    // Admin: List homeworks
    getAdminHomeworks: (params?: AdminHomeworkListParams) =>
      apiClient.get<AdminHomeworkListResponse>('/admin/homeworks/', { params }),

    // Admin: Get homework detail
    getAdminHomeworkDetail: (id: string) =>
      apiClient.get<AdminHomework>(`/admin/homeworks/${id}/`),

    // Admin: Create homework
    createHomework: (payload: CreateHomeworkPayload) =>
      apiClient.post<AdminHomework>('/admin/homeworks/', payload),

    // Admin: Update homework
    updateHomework: (id: string, payload: Partial<CreateHomeworkPayload>) =>
      apiClient.patch<AdminHomework>(`/admin/homeworks/${id}/`, payload),

    // Admin: Delete homework (soft delete)
    deleteHomework: (id: string) =>
      apiClient.delete(`/admin/homeworks/${id}/`),

    // Admin: List homework submissions
    getAdminHomeworkSubmissions: (params?: AdminSubmissionListParams) =>
      apiClient.get<AdminSubmissionListResponse>('/admin/homeworks/submissions/', { params }),

    // Admin: Get submission detail
    getAdminHomeworkSubmissionDetail: (id: string) =>
      apiClient.get<AdminHomeworkSubmission>(`/admin/homeworks/submissions/${id}/`),

    // Admin: Grade submission
    gradeAdminHomeworkSubmission: (id: string, payload: GradeSubmissionPayload) =>
      apiClient.post<AdminHomeworkSubmission>(`/admin/homeworks/submissions/${id}/grade/`, payload),

    // Admin: Get submission count (pending for badge)
    getAdminHomeworkSubmissionCount: (params?: { course_id?: string, classroom_id?: string, homework_id?: string }) =>
      apiClient.get<AdminSubmissionCountResponse>('/admin/homeworks/submissions/count/', { params }),

    // Student: List homeworks (enrolled classrooms only)
    getStudentHomeworks: (params?: StudentHomeworkListParams) =>
      apiClient.get<StudentHomeworkListResponse>('/homeworks/', { params }),

    // Student: Get homework detail
    getStudentHomeworkDetail: (id: string) =>
      apiClient.get<StudentHomeworkDetail>(`/homeworks/${id}/`),

    // Student: Submit homework
    submitHomework: (id: string, payload: SubmitHomeworkPayload) =>
      apiClient.post(`/homeworks/${id}/submit/`, payload),

    // Student: Get presigned upload URL
    getUploadUrl: (payload: UploadRequestPayload) =>
      apiClient.post<UploadRequestResponse>('/homeworks/upload-request/', payload),

    // Student: Get homework count stats
    getStudentHomeworkCount: (params?: { course_id?: string, classroom_id?: string }) =>
      apiClient.get<StudentHomeworkCountResponse>('/homeworks/count/', { params }),
  }
}
