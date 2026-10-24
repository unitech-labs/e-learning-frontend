<script setup lang="ts">
import type { Rule } from 'ant-design-vue/es/form'
import type { NewQuizQuestion, NewQuizQuestionCreate } from '~/composables/api/useNewQuizApi'
import type { ExerciseTopic, ExerciseType } from '~/types/ai-exercise.type'
import { message, notification } from 'ant-design-vue'
import EssayQuestion from '~/components/admin/course/quiz/EssayQuestion.vue'
import MultipleChoiceQuestion from '~/components/admin/course/quiz/MultipleChoiceQuestion.vue'
import TextInputQuestion from '~/components/admin/course/quiz/TextInputQuestion.vue'
import { useAIExerciseApi } from '~/composables/api/useAIExerciseApi'
import { useNewQuizApi } from '~/composables/api/useNewQuizApi'
import { QUIZ_AUDIO_TYPES, QUIZ_IMAGE_TYPES, useQuizMediaUpload } from '~/composables/useQuizMediaUpload'
import { EXERCISE_TYPE_META } from '~/utils/exercise'
import LevelSelector from './LevelSelector.vue'

interface Props {
  mode?: 'create' | 'edit'
  quizId?: string
  isCreating?: boolean
  isUpdating?: boolean
  isLoading?: boolean
}

interface Emits {
  (e: 'back'): void
  (e: 'createQuiz', quizData: any): void
  (e: 'updateQuiz', quizData: any): void
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'create',
  quizId: undefined,
  isCreating: false,
  isUpdating: false,
  isLoading: false,
})

const emit = defineEmits<Emits>()

const { t } = useI18n()
const { getQuiz } = useNewQuizApi()

const formData = reactive({
  title: '',
  description: '',
  level_id: '',
  time_type: 'limit' as 'limit' | 'none',
  time_value: 30,
  time_unit: 'minute' as 'minute' | 'second',
  retake_limit: 1,
  // Dạng bài tập (đọc hiểu, nghe hiểu...) — rỗng = quiz thường
  exercise_type: '' as ExerciseType | '',
  topic: undefined as string | undefined,
  passage: '',
  audio_url: '',
  image_urls: [] as string[],
})

const loadingQuiz = ref(false)

const noTimeLimit = computed({
  get: () => formData.time_type === 'none',
  set: (value: boolean) => {
    formData.time_type = value ? 'none' : 'limit'
  },
})

// ─── Dạng bài tập ──────────────────────────────────────────────
const { getTopics } = useAIExerciseApi()
const topics = ref<ExerciseTopic[]>([])

const exerciseTypeOptions = [
  { label: 'Quiz thường (không theo dạng bài)', value: '' },
  ...Object.entries(EXERCISE_TYPE_META).map(([value, meta]) => ({ label: meta.label, value })),
]

async function loadTopics() {
  try {
    const res = await getTopics({ limit: 100 })
    topics.value = res.results
  }
  catch (err) {
    console.error('Error loading exercise topics:', err)
  }
}

const { uploadAudio, uploadImage, progress: uploadProgress } = useQuizMediaUpload()
const uploadingAudio = ref(false)
const uploadingImages = ref(0)

// a-upload: tự upload qua presigned URL, return false để chặn upload mặc định
function handleAudioSelect(file: File) {
  if (!QUIZ_AUDIO_TYPES.includes(file.type)) {
    message.error('Chỉ hỗ trợ file audio MP3 hoặc WAV')
    return false
  }
  uploadingAudio.value = true
  uploadAudio(file)
    .then((url) => {
      formData.audio_url = url
    })
    .catch(() => message.error('Tải audio lên thất bại'))
    .finally(() => {
      uploadingAudio.value = false
    })
  return false
}

function handleImageSelect(file: File) {
  if (!QUIZ_IMAGE_TYPES.includes(file.type)) {
    message.error('Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF')
    return false
  }
  uploadingImages.value++
  uploadImage(file)
    .then((url) => {
      formData.image_urls.push(url)
    })
    .catch(() => message.error(`Tải ảnh ${file.name} lên thất bại`))
    .finally(() => {
      uploadingImages.value--
    })
  return false
}

function removeImage(index: number) {
  formData.image_urls.splice(index, 1)
}

function moveImage(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= formData.image_urls.length)
    return
  const images = formData.image_urls
  ;[images[index], images[target]] = [images[target], images[index]]
}

const rules: Record<string, Rule[]> = {
  title: [
    { required: true, message: t('newQuiz.level.levelRequired'), trigger: 'blur' },
  ],
  level_id: [
    { required: true, message: t('newQuiz.level.levelRequired'), trigger: 'change' },
  ],
  time_value: [
    {
      required: true,
      message: 'Please input time value!',
      trigger: 'blur',
      type: 'number',
      min: 1,
    },
  ],
  time_unit: [
    { required: true, message: 'Please select time unit!', trigger: 'change' },
  ],
}

interface Question {
  id: string
  type: 'text-input' | 'multiple-choice' | 'essay'
  data: any
}

const questions = ref<Question[]>([])

const questionsValidation = computed(() => {
  const errors: string[] = []

  questions.value.forEach((question, index) => {
    const questionNumber = index + 1

    if (!question.data.question || question.data.question.trim() === '') {
      errors.push(`Question ${questionNumber}: Question text is required`)
    }

    if (!question.data.score || question.data.score <= 0) {
      errors.push(`Question ${questionNumber}: Score must be greater than 0`)
    }

    if (question.type === 'multiple-choice') {
      const hasEmptyOptions = question.data.options?.some((option: any) =>
        !option.text || option.text.trim() === '',
      )
      if (hasEmptyOptions) {
        errors.push(`Question ${questionNumber}: All answer options must be filled`)
      }

      if (!question.data.correctAnswer) {
        errors.push(`Question ${questionNumber}: Correct answer must be selected`)
      }
    }

    if (question.type === 'text-input') {
      if (!question.data.answer || question.data.answer.trim() === '') {
        errors.push(`Question ${questionNumber}: Sample answer is required`)
      }
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
  }
})

function addTextInputQuestion() {
  const newQuestion: Question = {
    id: `question-${Date.now()}-${Math.random()}`,
    type: 'text-input',
    data: {
      question: '',
      explanation: '',
      score: 1.0,
      files: [],
      answer: '',
    },
  }
  questions.value.push(newQuestion)
}

function addEssayQuestion() {
  const newQuestion: Question = {
    id: `question-${Date.now()}-${Math.random()}`,
    type: 'essay',
    data: {
      question: '',
      explanation: '',
      score: 1.0,
      files: [],
    },
  }
  questions.value.push(newQuestion)
}

function addMultipleChoiceQuestion() {
  const newQuestion: Question = {
    id: `question-${Date.now()}-${Math.random()}`,
    type: 'multiple-choice',
    data: {
      question: '',
      explanation: '',
      score: 1.0,
      files: [],
      options: [
        { text: '', label: 'A', id: 'option-a' },
        { text: '', label: 'B', id: 'option-b' },
        { text: '', label: 'C', id: 'option-c' },
        { text: '', label: 'D', id: 'option-d' },
      ],
      correctAnswer: '',
    },
  }
  questions.value.push(newQuestion)
}

function removeQuestion(index: number) {
  questions.value.splice(index, 1)
}

function updateQuestion(index: number, data: any) {
  if (questions.value[index]) {
    questions.value[index].data = { ...questions.value[index].data, ...data }
  }
}

// Check if ID is a UUID (real question ID) or temporary ID
function isRealQuestionId(id: string): boolean {
  // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

// Transform questions to API format
function transformQuestionsToApi(): Array<NewQuizQuestionCreate & { id?: string }> {
  return questions.value.map((question, index) => {
    const baseQuestion: NewQuizQuestionCreate & { id?: string } = {
      question_type: question.type === 'multiple-choice' ? 'multiple_choice' : question.type === 'text-input' ? 'text_input' : 'essay',
      prompt: question.data.question,
      explanation: question.data.explanation || '',
      order: index + 1,
      score: Number(question.data.score) || 1.0,
    }

    // Only include id if it's a real UUID (existing question), not a temporary ID
    if (isRealQuestionId(question.id)) {
      baseQuestion.id = question.id
    }

    if (question.type === 'multiple-choice') {
      baseQuestion.options = question.data.options.map((opt: any) => ({
        label: opt.label,
        text: opt.text,
        is_correct: opt.label === question.data.correctAnswer,
      }))
    }

    if (question.type === 'text-input') {
      baseQuestion.sample_answer = {
        text: question.data.answer,
      }
    }

    return baseQuestion
  })
}

// Load quiz data for edit mode
async function loadQuizData() {
  if (!props.quizId)
    return

  try {
    loadingQuiz.value = true
    const quiz = await getQuiz(props.quizId)

    formData.title = quiz.title
    formData.description = quiz.description || ''
    formData.level_id = quiz.level
    // Bài tập AI không giới hạn thời gian — giữ nguyên thay vì ép thành 30 phút khi sửa
    formData.time_type = quiz.time_type === 'none' ? 'none' : 'limit'
    formData.time_value = quiz.time_value || 30
    formData.time_unit = quiz.time_unit || 'minute'
    formData.retake_limit = quiz.retake_limit
    formData.exercise_type = quiz.exercise_type || ''
    formData.topic = quiz.topic || undefined
    formData.passage = quiz.passage || ''
    formData.audio_url = quiz.audio_url || ''
    formData.image_urls = [...(quiz.image_urls || [])]

    // Load questions
    if (quiz.questions && quiz.questions.length > 0) {
      questions.value = quiz.questions.map((q: NewQuizQuestion) => {
        const questionType = q.question_type === 'multiple_choice' ? 'multiple-choice' : q.question_type === 'text_input' ? 'text-input' : 'essay'

        const questionData: any = {
          question: q.prompt,
          explanation: q.explanation || '',
          score: q.score,
          files: [],
        }

        if (questionType === 'multiple-choice' && q.options) {
          questionData.options = q.options.map((opt, idx) => ({
            text: opt.text,
            label: opt.label || String.fromCharCode(65 + idx),
            id: `option-${opt.id || idx}`,
          }))
          const correctOption = q.options.find(opt => opt.is_correct)
          questionData.correctAnswer = correctOption?.label || ''
        }

        if (questionType === 'text-input' && q.sample_answer) {
          questionData.answer = q.sample_answer.text
        }

        return {
          id: q.id,
          type: questionType,
          data: questionData,
        }
      })
    }
  }
  catch (err: any) {
    notification.error({
      message: t('newQuiz.messages.loadQuizError'),
      description: err.message,
      duration: 4.5,
    })
    console.error('Error loading quiz:', err)
  }
  finally {
    loadingQuiz.value = false
  }
}

// Create API payload
function createApiPayload() {
  const payload: any = {
    title: formData.title,
    description: formData.description,
    level_id: formData.level_id,
    time_type: formData.time_type,
    time_value: formData.time_type === 'limit' ? formData.time_value : null,
    time_unit: formData.time_unit,
    retake_limit: formData.retake_limit,
    is_published: false,
    questions: transformQuestionsToApi(),
    exercise_type: formData.exercise_type,
    topic: formData.topic || null,
    passage: formData.passage,
    audio_url: formData.audio_url,
    image_urls: formData.image_urls,
  }

  return payload
}

async function onFinish() {
  if (formData.exercise_type === 'listening' && !formData.audio_url) {
    notification.warning({
      message: t('newQuiz.messages.validationError'),
      description: 'Bài nghe cần có file audio.',
      duration: 4,
    })
    return
  }
  if (uploadingAudio.value || uploadingImages.value > 0) {
    message.warning('Đang tải file lên, vui lòng đợi xong rồi lưu.')
    return
  }

  if (!questionsValidation.value.isValid) {
    notification.warning({
      message: t('newQuiz.messages.validationError'),
      description: questionsValidation.value.errors.join(', '),
      duration: 4,
    })
    return
  }

  try {
    const apiPayload = createApiPayload()

    if (props.mode === 'edit' && props.quizId) {
      emit('updateQuiz', { id: props.quizId, ...apiPayload })
    }
    else {
      emit('createQuiz', apiPayload)
    }
  }
  catch (error: any) {
    notification.error({
      message: t('newQuiz.messages.formValidationError'),
      description: error.message || t('newQuiz.messages.formValidationMessage'),
      duration: 4,
    })
    console.error('Error saving quiz:', error)
  }
}

function onFinishFailed(errorInfo: any) {
  notification.error({
    message: t('newQuiz.messages.formValidationError'),
    description: t('newQuiz.messages.formValidationMessage'),
    duration: 4,
  })
  console.error('Form validation failed:', errorInfo)
}

const unitOptions = [
  { label: t('quiz.minute'), value: 'minute' },
  { label: t('quiz.second'), value: 'second' },
]

onMounted(async () => {
  loadTopics()
  if (props.mode === 'edit' && props.quizId) {
    await loadQuizData()
  }
})

const totalScore = computed(() => {
  return questions.value.reduce((total, question) => {
    return total + (Number(question.data.score) || 0)
  }, 0)
})
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8 max-md:px-0 bg-gray-50 min-h-screen">
    <div class="w-full max-w-5xl mx-auto space-y-6">
      <!-- Header Section -->
      <div class="mb-6 sm:mb-8">
        <div class="flex items-center gap-4 mb-4">
          <div class="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
            <Icon
              name="solar:clipboard-list-bold-duotone"
              class="text-2xl text-white"
            />
          </div>
          <div class="flex-1">
            <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
              {{ props.mode === 'edit' ? $t('newQuiz.editor.editTitle') : $t('newQuiz.editor.createTitle') }}
            </h1>
            <p class="text-sm text-gray-600">
              {{ props.mode === 'edit' ? 'Chỉnh sửa thông tin và câu hỏi của quiz' : 'Tạo quiz độc lập mới với các câu hỏi tùy chỉnh' }}
            </p>
          </div>
          <a-button
            type="default"
            size="large"
            class="!flex !justify-center !items-center !gap-1"
            @click="emit('back')"
          >
            <Icon name="solar:arrow-left-bold" />
            <span class="hidden sm:inline">{{ $t('newQuiz.editor.backToList') }}</span>
          </a-button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading || loadingQuiz" class="flex items-center justify-center py-16">
        <div class="text-center">
          <a-spin size="large" />
          <p class="text-sm text-gray-500 mt-4">
            {{ $t('newQuiz.editor.loadingQuiz') }}
          </p>
        </div>
      </div>

      <!-- Form -->
      <a-form
        v-if="!isLoading && !loadingQuiz"
        :model="formData"
        :rules="rules"
        layout="vertical"
        class="space-y-6"
        @finish="onFinish"
        @finish-failed="onFinishFailed"
      >
        <!-- Basic Information Card -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex items-center gap-2 mb-6">
            <Icon name="solar:document-text-bold-duotone" class="text-xl text-green-600" />
            <h2 class="text-lg font-semibold text-gray-800">
              Thông tin cơ bản
            </h2>
          </div>

          <div class="space-y-4">
            <!-- Title -->
            <a-form-item :label="$t('newQuiz.editor.title')" name="title" class="mb-4">
              <a-input
                v-model:value="formData.title"
                :placeholder="$t('newQuiz.editor.titlePlaceholder')"
                size="large"
                class="rounded-lg"
              />
            </a-form-item>

            <!-- Description -->
            <a-form-item :label="$t('newQuiz.editor.description')" name="description" class="mb-4">
              <a-textarea
                v-model:value="formData.description"
                :placeholder="$t('newQuiz.editor.descriptionPlaceholder')"
                :rows="4"
                class="rounded-lg"
              />
            </a-form-item>

            <!-- Level -->
            <a-form-item :label="$t('newQuiz.editor.level')" name="level_id" class="mb-0">
              <LevelSelector v-model="formData.level_id" />
            </a-form-item>
          </div>
        </div>

        <!-- Exercise Card -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex items-center gap-2 mb-6">
            <Icon name="tabler:list-check" class="text-xl text-emerald-600" />
            <h2 class="text-lg font-semibold text-gray-800">
              Dạng bài tập
            </h2>
          </div>

          <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a-form-item label="Dạng bài" class="mb-0">
                <a-select
                  v-model:value="formData.exercise_type"
                  size="large"
                  :options="exerciseTypeOptions"
                />
              </a-form-item>
              <a-form-item label="Chủ đề" class="mb-0">
                <a-select
                  v-model:value="formData.topic"
                  size="large"
                  allow-clear
                  placeholder="Chọn chủ đề"
                  :options="topics.map(topic => ({ label: topic.name, value: topic.id }))"
                />
              </a-form-item>
            </div>
            <p v-if="formData.exercise_type" class="text-xs text-gray-500">
              Bài theo dạng bài tập: học viên được đổi đáp án và quay lại câu trước, chỉ xem đúng/sai sau khi nộp bài.
              <template v-if="formData.exercise_type === 'listening'">
                Học viên chọn "Nghe hiểu" sẽ nhận bài nghe đã xuất bản đúng trình độ + chủ đề này.
              </template>
            </p>

            <!-- Reading passage -->
            <a-form-item v-if="formData.exercise_type === 'reading'" label="Đoạn văn đọc hiểu" class="mb-0">
              <a-textarea
                v-model:value="formData.passage"
                :rows="8"
                placeholder="Đoạn văn tiếng Ý học viên đọc trước khi trả lời câu hỏi"
              />
            </a-form-item>

            <!-- Listening: audio + question-sheet images -->
            <template v-if="formData.exercise_type === 'listening'">
              <a-form-item label="Audio (MP3/WAV)" class="mb-0" required>
                <div class="space-y-2">
                  <audio v-if="formData.audio_url" :src="formData.audio_url" controls class="w-full" />
                  <div class="flex flex-wrap items-center gap-2">
                    <a-upload
                      accept=".mp3,.wav,audio/mpeg,audio/wav"
                      :show-upload-list="false"
                      :before-upload="handleAudioSelect"
                    >
                      <a-button :loading="uploadingAudio" class="!flex !items-center !gap-1">
                        <Icon name="tabler:headphones" />
                        {{ formData.audio_url ? 'Đổi file audio' : 'Tải audio lên' }}
                      </a-button>
                    </a-upload>
                    <span v-if="uploadingAudio" class="text-xs text-gray-500">{{ uploadProgress }}%</span>
                    <a-button v-if="formData.audio_url && !uploadingAudio" type="text" danger @click="formData.audio_url = ''">
                      Xoá audio
                    </a-button>
                  </div>
                </div>
              </a-form-item>

              <a-form-item label="Ảnh đề (theo thứ tự trang)" class="mb-0">
                <div class="space-y-3">
                  <div v-if="formData.image_urls.length" class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div
                      v-for="(url, index) in formData.image_urls"
                      :key="url"
                      class="relative rounded-lg border border-gray-200 overflow-hidden bg-gray-50"
                    >
                      <a-image :src="url" class="!h-32 w-full object-cover" />
                      <div class="flex items-center justify-between px-2 py-1 text-xs text-gray-600">
                        <span>Trang {{ index + 1 }}</span>
                        <div class="flex gap-1">
                          <button type="button" class="cursor-pointer px-1 hover:text-gray-900 disabled:opacity-30" :disabled="index === 0" @click="moveImage(index, -1)">
                            ←
                          </button>
                          <button type="button" class="cursor-pointer px-1 hover:text-gray-900 disabled:opacity-30" :disabled="index === formData.image_urls.length - 1" @click="moveImage(index, 1)">
                            →
                          </button>
                          <button type="button" class="cursor-pointer px-1 text-red-500 hover:text-red-700" @click="removeImage(index)">
                            <Icon name="tabler:trash" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <a-upload
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    :show-upload-list="false"
                    :before-upload="handleImageSelect"
                  >
                    <a-button :loading="uploadingImages > 0" class="!flex !items-center !gap-1">
                      <Icon name="tabler:photo" />
                      Thêm ảnh đề
                    </a-button>
                  </a-upload>
                  <p class="text-xs text-gray-500">
                    Tạo câu hỏi tương ứng với đề trên ảnh ở phần Câu hỏi bên dưới (ví dụ "Question 1" với các lựa chọn A, B, C...).
                  </p>
                </div>
              </a-form-item>
            </template>
          </div>
        </div>

        <!-- Settings Card -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex items-center gap-2 mb-6">
            <Icon name="solar:settings-bold-duotone" class="text-xl text-blue-600" />
            <h2 class="text-lg font-semibold text-gray-800">
              Cài đặt Quiz
            </h2>
          </div>

          <div class="space-y-4">
            <a-checkbox v-model:checked="noTimeLimit">
              Không giới hạn thời gian
            </a-checkbox>

            <!-- Time Settings -->
            <div v-if="!noTimeLimit" class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a-form-item :label="$t('newQuiz.editor.timeLimit')" name="time_value" class="mb-0">
                <a-input-number
                  v-model:value="formData.time_value"
                  :placeholder="$t('newQuiz.editor.timeLimitPlaceholder')"
                  :min="1"
                  size="large"
                  class="w-full rounded-lg"
                />
              </a-form-item>

              <a-form-item :label="$t('newQuiz.editor.unit')" name="time_unit" class="mb-0">
                <a-select
                  v-model:value="formData.time_unit"
                  size="large"
                  class="rounded-lg"
                  :options="unitOptions"
                />
              </a-form-item>
            </div>

            <!-- Retake Limit -->
            <a-form-item :label="$t('newQuiz.editor.retakeLimit')" name="retake_limit" class="mb-0">
              <a-input-number
                v-model:value="formData.retake_limit"
                :placeholder="$t('newQuiz.editor.retakeLimitPlaceholder')"
                :min="1"
                size="large"
                class="w-full md:w-64 rounded-lg"
              />
              <div class="text-xs text-gray-500 mt-1">
                Số lần học viên có thể làm lại quiz này
              </div>
            </a-form-item>
          </div>
        </div>

        <!-- Questions Section Card -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div class="flex items-center gap-2">
              <Icon name="solar:question-circle-bold-duotone" class="text-xl text-purple-600" />
              <div>
                <h2 class="text-lg font-semibold text-gray-800">
                  {{ $t('newQuiz.editor.questions') }}
                </h2>
                <p class="text-sm text-gray-500">
                  {{ questions.length }} {{ questions.length === 1 ? $t('newQuiz.editor.questionsCount') : $t('newQuiz.editor.questionsCountPlural') }}
                </p>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <a-button
                type="default"
                class="!flex !justify-center !items-center !gap-1"
                @click="addMultipleChoiceQuestion"
              >
                <Icon name="solar:list-check-bold" />
                {{ $t('newQuiz.editor.addMultipleChoice') }}
              </a-button>
              <a-button
                type="default"
                class="!flex !justify-center !items-center !gap-1"
                @click="addTextInputQuestion"
              >
                <Icon name="solar:text-field-bold" />
                {{ $t('newQuiz.editor.addTextInput') }}
              </a-button>
              <a-button
                type="default"
                class="!flex !justify-center !items-center !gap-1"
                @click="addEssayQuestion"
              >
                <Icon name="solar:document-text-bold" />
                {{ $t('newQuiz.editor.addEssay') }}
              </a-button>
            </div>
          </div>

          <!-- Questions List -->
          <div class="space-y-4">
            <template v-for="(question, index) in questions" :key="question.id">
              <TextInputQuestion
                v-if="question.type === 'text-input'"
                :initial-data="question.data"
                :question-number="index + 1"
                @delete="removeQuestion(index)"
                @update="updateQuestion(index, $event)"
              />
              <MultipleChoiceQuestion
                v-else-if="question.type === 'multiple-choice'"
                :initial-data="question.data"
                :question-number="index + 1"
                :min-options="2"
                :max-options="8"
                @delete="removeQuestion(index)"
                @update="updateQuestion(index, $event)"
              />
              <EssayQuestion
                v-else-if="question.type === 'essay'"
                :initial-data="question.data"
                :question-number="index + 1"
                @delete="removeQuestion(index)"
                @update="updateQuestion(index, $event)"
              />
            </template>

            <!-- Các nút thêm quiz -->
            <div v-if="questions.length > 0" class="flex flex-wrap gap-2">
              <a-button
                type="default"
                class="!flex !justify-center !items-center !gap-1"
                @click="addMultipleChoiceQuestion"
              >
                <Icon name="solar:list-check-bold" />
                {{ $t('newQuiz.editor.addMultipleChoice') }}
              </a-button>

              <a-button
                type="default"
                class="!flex !justify-center !items-center !gap-1"
                @click="addTextInputQuestion"
              >
                <Icon name="solar:text-field-bold" />
                {{ $t('newQuiz.editor.addTextInput') }}
              </a-button>
              <a-button
                type="default"
                class="!flex !justify-center !items-center !gap-1"
                @click="addEssayQuestion"
              >
                <Icon name="solar:document-text-bold" />
                {{ $t('newQuiz.editor.addEssay') }}
              </a-button>
            </div>

            <!-- Empty State -->
            <div
              v-if="questions.length === 0"
              class="border-2 border-dashed border-gray-300 rounded-xl p-8 sm:p-12 text-center bg-gray-50"
            >
              <Icon name="solar:question-circle-bold-duotone" class="text-6xl text-gray-300 mb-4 mx-auto" />
              <h3 class="text-lg font-semibold text-gray-700 mb-2">
                {{ $t('newQuiz.editor.noQuestions') }}
              </h3>
              <p class="text-sm text-gray-500 mb-6">
                Thêm câu hỏi để tạo quiz hoàn chỉnh
              </p>
            </div>
          </div>

          <!-- Total Score -->
          <div v-if="questions.length > 0" class="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Icon name="solar:star-bold-duotone" class="text-xl text-green-600" />
                <span class="text-sm font-semibold text-gray-700">{{ $t('newQuiz.editor.totalScore') }}</span>
              </div>
              <span class="text-2xl font-bold text-green-600">{{ totalScore }}</span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <a-button
              size="large"
              class="w-full sm:w-auto !flex !justify-center !items-center !gap-1"
              @click="emit('back')"
            >
              <Icon name="solar:close-circle-bold" />
              Hủy
            </a-button>
            <a-button
              type="primary"
              size="large"
              :loading="isCreating || isUpdating"
              html-type="submit"
              class="w-full sm:w-auto !flex !justify-center !items-center !gap-1"
            >
              <Icon name="solar:check-circle-bold" />
              {{ props.mode === 'edit' ? $t('newQuiz.editor.updateQuiz') : $t('newQuiz.editor.createQuiz') }}
            </a-button>
          </div>
        </div>
      </a-form>
    </div>
  </div>
</template>
