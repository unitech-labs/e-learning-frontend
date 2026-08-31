<script setup lang="ts">
import type {
  AIProviderConfig,
  FlashcardAccessRequest,
  FlashcardAdminDetail,
  FlashcardFeedbackItem,
  FlashcardListItem,
} from '~/types/flashcard.type'
import { message, Modal } from 'ant-design-vue'
import { useFlashcardAdminApi } from '~/composables/api/useFlashcardAdminApi'
import { isValidItalianWord } from '~/composables/api/useFlashcardApi'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

useHead({ title: 'Quản lý Flashcard AI' })

const api = useFlashcardAdminApi()

// Cho phép deep-link vào tab cụ thể (?tab=access / feedback / config),
// bấm vào notification flashcard sẽ nhảy thẳng đúng tab.
const route = useRoute()
const VALID_TABS = ['cards', 'access', 'feedback', 'ai']
const initialTab = String(route.query.tab ?? '')
const activeTab = ref(VALID_TABS.includes(initialTab) ? initialTab : 'cards')

// ═══ TAB 1: DANH SÁCH THẺ ════════════════════════════════════════
// Bước kiểm duyệt đã bỏ (2026-08-29): AI sinh xong là thẻ chính thức ngay.
// Admin hậu kiểm ở đây: xem / sửa / xoá (xoá xong lần tra sau AI sinh lại).
const cards = ref<FlashcardListItem[]>([])
const cardsTotal = ref(0)
const cardsLoading = ref(false)
const cardsPage = ref(1)
const cardsPageSize = 10
const cardSearch = ref('')

const cardColumns = [
  { title: 'Từ', dataIndex: 'word', key: 'word' },
  { title: 'Nghĩa', dataIndex: 'meaning', key: 'meaning' },
  { title: 'Ngày tạo', dataIndex: 'created_at', key: 'created_at', width: 130 },
  { title: 'Thao tác', key: 'actions', width: 220 },
]

async function loadCards() {
  cardsLoading.value = true
  try {
    const res = await api.listCards({
      search: cardSearch.value || undefined,
      limit: cardsPageSize,
      offset: (cardsPage.value - 1) * cardsPageSize,
    })
    cards.value = res.results
    cardsTotal.value = res.count
  }
  catch {
    message.error('Không tải được danh sách thẻ')
  }
  finally {
    cardsLoading.value = false
  }
}

// ─── Sinh thẻ bằng AI ngay từ ô search ───────────────────────────
// Search một từ tiếng Ý hợp lệ mà hệ thống CHƯA có thẻ -> mở modal sinh
// (trải nghiệm streaming y hệt học sinh). Từ đã có thì bảng lọc ra là đủ.
const genOpen = ref(false)
const genWord = ref('')

async function handleCardSearch() {
  cardsPage.value = 1
  await loadCards()
  const term = cardSearch.value.trim().toLowerCase()
  if (term && !term.includes(' ') && isValidItalianWord(term)
    && !cards.value.some(card => card.word === term)) {
    genWord.value = term
    genOpen.value = true
  }
}

// Xem trước thẻ: tái dùng FlashcardDetail (lật được như học sinh thấy)
const previewCard = ref<FlashcardAdminDetail | null>(null)
const previewOpen = ref(false)

async function openPreview(item: FlashcardListItem) {
  try {
    previewCard.value = await api.getCard(item.id)
    previewOpen.value = true
  }
  catch {
    message.error('Không tải được nội dung thẻ')
  }
}

const rejectTarget = ref<FlashcardListItem | FlashcardAdminDetail | null>(null)
const rejectReason = ref('')
const rejectSending = ref(false)

async function submitReject() {
  if (!rejectTarget.value)
    return
  rejectSending.value = true
  try {
    const res = await api.rejectCard(rejectTarget.value.id, rejectReason.value)
    message.success(`Đã xoá thẻ "${res.word}" — lần tra sau AI sẽ sinh lại bản mới`)
    rejectTarget.value = null
    rejectReason.value = ''
    previewOpen.value = false
    await loadCards()
  }
  catch {
    message.error('Xoá thất bại')
  }
  finally {
    rejectSending.value = false
  }
}

// ─── Sửa nội dung thẻ (AI có thể sinh sai) ───────────────────────
const editOpen = ref(false)
const editSaving = ref(false)
const editId = ref('')
const editWord = ref('')
const editForm = reactive({
  pronunciation: '',
  it_word: '',
  vi_word: '',
  it_part_of_speech: '',
  vi_part_of_speech: '',
  it_gender: '',
  vi_gender: '',
  it_number: '',
  vi_number: '',
  article: '',
  plural_article: '',
  plural_form: '',
  it_definition: '',
  vi_definition: '',
  it_synonyms: '',
  vi_synonyms: '',
  topics: '',
  mnemonic: '',
  // Sửa theo CẶP để hai mặt không bao giờ lệch số câu (backend cũng chặn lệch).
  examples: [] as { it: string, vi: string }[],
})

async function openEdit(item: { id: string }) {
  try {
    // Detail trả dạng nested front/back/grammar; PATCH nhận field phẳng -> map tay.
    const card = await api.getCard(item.id)
    editId.value = card.id
    editWord.value = card.word
    editForm.pronunciation = card.front.pronunciation
    editForm.it_word = card.front.word
    editForm.vi_word = card.back.word
    editForm.it_part_of_speech = card.grammar.part_of_speech.it
    editForm.vi_part_of_speech = card.grammar.part_of_speech.vi
    editForm.it_gender = card.grammar.gender.it
    editForm.vi_gender = card.grammar.gender.vi
    editForm.it_number = card.grammar.number.it
    editForm.vi_number = card.grammar.number.vi
    editForm.article = card.grammar.article.article
    editForm.plural_article = card.grammar.plural.article
    editForm.plural_form = card.grammar.plural.form
    editForm.it_definition = card.front.definition
    editForm.vi_definition = card.back.definition
    editForm.it_synonyms = (card.front.synonyms || []).join(', ')
    editForm.vi_synonyms = (card.back.synonyms || []).join(', ')
    editForm.topics = (card.topics || []).join(', ')
    editForm.mnemonic = card.mnemonic
    editForm.examples = (card.front.examples || []).map((it, i) => ({
      it,
      vi: card.back.examples?.[i] ?? '',
    }))
    editOpen.value = true
  }
  catch {
    message.error('Không tải được nội dung thẻ')
  }
}

function splitList(value: string): string[] {
  return value.split(',').map(s => s.trim()).filter(Boolean)
}

async function saveEdit() {
  const pairs = editForm.examples.filter(p => p.it.trim() && p.vi.trim())
  if (pairs.length !== editForm.examples.length) {
    message.error('Mỗi câu ví dụ phải có đủ cả tiếng Ý lẫn tiếng Việt (hoặc xoá cặp đó).')
    return
  }
  editSaving.value = true
  try {
    await api.updateCard(editId.value, {
      pronunciation: editForm.pronunciation,
      it_word: editForm.it_word,
      vi_word: editForm.vi_word,
      it_part_of_speech: editForm.it_part_of_speech,
      vi_part_of_speech: editForm.vi_part_of_speech,
      it_gender: editForm.it_gender,
      vi_gender: editForm.vi_gender,
      it_number: editForm.it_number,
      vi_number: editForm.vi_number,
      article: editForm.article,
      plural_article: editForm.plural_article,
      plural_form: editForm.plural_form,
      it_definition: editForm.it_definition,
      vi_definition: editForm.vi_definition,
      it_examples: pairs.map(p => p.it.trim()),
      vi_examples: pairs.map(p => p.vi.trim()),
      it_synonyms: splitList(editForm.it_synonyms),
      vi_synonyms: splitList(editForm.vi_synonyms),
      topics: splitList(editForm.topics),
      mnemonic: editForm.mnemonic,
    })
    message.success(`Đã lưu nội dung "${editWord.value}"`)
    editOpen.value = false
    // Đang mở preview của chính thẻ này thì nạp lại cho khớp.
    if (previewCard.value?.id === editId.value)
      previewCard.value = await api.getCard(editId.value)
    await loadCards()
  }
  catch {
    message.error('Lưu thất bại — kiểm tra số câu ví dụ hai mặt có bằng nhau không.')
  }
  finally {
    editSaving.value = false
  }
}

function removeExamplePair(index: number) {
  editForm.examples.splice(index, 1)
}

function addExamplePair() {
  editForm.examples.push({ it: '', vi: '' })
}

// ═══ TAB 2: YÊU CẦU CẤP QUYỀN ════════════════════════════════════
const accessRows = ref<FlashcardAccessRequest[]>([])
const accessTotal = ref(0)
const accessLoading = ref(false)
const accessPage = ref(1)
const accessStatus = ref('pending')
const accessPendingCount = ref(0)

const accessColumns = [
  { title: 'Học viên', key: 'user', dataIndex: 'user_email' },
  { title: 'Lý do', dataIndex: 'reason', key: 'reason' },
  { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 120 },
  { title: 'Ngày gửi', dataIndex: 'created_at', key: 'created_at', width: 120 },
  { title: 'Thao tác', key: 'actions', width: 210 },
]

async function loadAccess() {
  accessLoading.value = true
  try {
    const res = await api.listAccessRequests({
      status: accessStatus.value || undefined,
      limit: cardsPageSize,
      offset: (accessPage.value - 1) * cardsPageSize,
    })
    accessRows.value = res.results
    accessTotal.value = res.count
    if (accessStatus.value === 'pending')
      accessPendingCount.value = res.count
  }
  catch {
    message.error('Không tải được yêu cầu cấp quyền')
  }
  finally {
    accessLoading.value = false
  }
}

async function refreshAccessPendingCount() {
  try {
    accessPendingCount.value = (await api.listAccessRequests({ status: 'pending', limit: 1 })).count
  }
  catch { /* badge phụ */ }
}

function reviewAccess(row: FlashcardAccessRequest, action: 'approve' | 'reject' | 'revoke') {
  let note = ''
  const titles = {
    approve: `Cấp quyền cho ${row.user_email}?`,
    reject: `Từ chối yêu cầu của ${row.user_email}?`,
    revoke: `Thu hồi quyền của ${row.user_email}?`,
  }
  Modal.confirm({
    title: titles[action],
    content: h('div', [
      action === 'revoke'
        ? h('p', { class: 'text-sm text-gray-600' }, 'Học viên sẽ mất quyền dùng Flashcard AI ngay (trừ khi đang có khoá học còn hiệu lực) và có thể gửi yêu cầu xin lại.')
        : null,
      h('textarea', {
        class: 'w-full mt-2 rounded border border-gray-300 p-2 text-sm',
        rows: 2,
        placeholder: 'Ghi chú gửi học viên (không bắt buộc)',
        onInput: (e: Event) => { note = (e.target as HTMLTextAreaElement).value },
      }),
    ]),
    okText: { approve: 'Cấp quyền', reject: 'Từ chối', revoke: 'Thu hồi quyền' }[action],
    okType: action === 'approve' ? 'primary' : 'danger',
    cancelText: 'Huỷ',
    async onOk() {
      try {
        if (action === 'approve')
          await api.approveAccessRequest(row.id, note)
        else if (action === 'revoke')
          await api.revokeAccessRequest(row.id, note)
        else
          await api.rejectAccessRequest(row.id, note)
        message.success({ approve: 'Đã cấp quyền', reject: 'Đã từ chối', revoke: 'Đã thu hồi quyền' }[action])
        await Promise.all([loadAccess(), refreshAccessPendingCount()])
      }
      catch {
        message.error('Thao tác thất bại')
      }
    },
  })
}

// ═══ TAB 3: FEEDBACK NỘI DUNG SAI ════════════════════════════════
const feedbackRows = ref<FlashcardFeedbackItem[]>([])
const feedbackTotal = ref(0)
const feedbackLoading = ref(false)
const feedbackPage = ref(1)
const feedbackStatus = ref('open')
const feedbackOpenCount = ref(0)

const feedbackColumns = [
  { title: 'Từ', dataIndex: 'flashcard_word', key: 'word', width: 120 },
  { title: 'Người báo', dataIndex: 'user_email', key: 'user', width: 200 },
  { title: 'Nội dung', dataIndex: 'content', key: 'content' },
  { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 110 },
  { title: 'Thao tác', key: 'actions', width: 290 },
]

async function loadFeedback() {
  feedbackLoading.value = true
  try {
    const res = await api.listFeedback({
      status: feedbackStatus.value || undefined,
      limit: cardsPageSize,
      offset: (feedbackPage.value - 1) * cardsPageSize,
    })
    feedbackRows.value = res.results
    feedbackTotal.value = res.count
    if (feedbackStatus.value === 'open')
      feedbackOpenCount.value = res.count
  }
  catch {
    message.error('Không tải được feedback')
  }
  finally {
    feedbackLoading.value = false
  }
}

function resolveFeedback(row: FlashcardFeedbackItem, status: 'resolved' | 'dismissed') {
  let note = ''
  Modal.confirm({
    title: status === 'resolved' ? 'Đánh dấu đã xử lý?' : 'Bỏ qua feedback này?',
    content: h('textarea', {
      class: 'w-full mt-2 rounded border border-gray-300 p-2 text-sm',
      rows: 2,
      placeholder: 'Ghi chú (không bắt buộc)',
      onInput: (e: Event) => { note = (e.target as HTMLTextAreaElement).value },
    }),
    okText: 'Xác nhận',
    cancelText: 'Huỷ',
    async onOk() {
      try {
        await api.resolveFeedback(row.id, status, note)
        message.success('Đã cập nhật feedback')
        await loadFeedback()
      }
      catch {
        message.error('Thao tác thất bại')
      }
    },
  })
}

// ═══ TAB 4: CẤU HÌNH AI ══════════════════════════════════════════
const aiConfig = ref<AIProviderConfig | null>(null)
const aiLoading = ref(false)
const aiSaving = ref(false)
const aiTesting = ref(false)
const aiForm = reactive({
  model: '',
  base_url: '',
  timeout: 60,
  is_enabled: true,
  api_key: '', // rỗng = giữ key cũ
})

async function loadAIConfig() {
  aiLoading.value = true
  try {
    aiConfig.value = await api.getAIConfig()
    aiForm.model = aiConfig.value.model
    aiForm.base_url = aiConfig.value.base_url
    aiForm.timeout = aiConfig.value.timeout
    aiForm.is_enabled = aiConfig.value.is_enabled
    aiForm.api_key = ''
  }
  catch {
    message.error('Không tải được cấu hình AI')
  }
  finally {
    aiLoading.value = false
  }
}

async function saveAIConfig() {
  aiSaving.value = true
  try {
    const payload: Record<string, unknown> = {
      model: aiForm.model,
      base_url: aiForm.base_url,
      timeout: aiForm.timeout,
      is_enabled: aiForm.is_enabled,
    }
    // Chỉ gửi api_key khi admin thật sự nhập key mới.
    if (aiForm.api_key.trim())
      payload.api_key = aiForm.api_key.trim()
    aiConfig.value = await api.updateAIConfig(payload)
    aiForm.api_key = ''
    message.success('Đã lưu cấu hình AI')
  }
  catch {
    message.error('Lưu cấu hình thất bại')
  }
  finally {
    aiSaving.value = false
  }
}

async function testAIConfig() {
  aiTesting.value = true
  try {
    const res = await api.testAIConfig()
    if (res.ok)
      message.success(res.message)
    else
      message.error(res.message)
  }
  catch {
    message.error('Không gọi được endpoint kiểm tra')
  }
  finally {
    aiTesting.value = false
  }
}

// ═══ Khởi tạo ════════════════════════════════════════════════════
function formatDate(iso: string) {
  return iso ? new Date(iso).toLocaleDateString('vi-VN') : ''
}

const statusTag: Record<string, { color: string, label: string }> = {
  pending: { color: 'gold', label: 'Chờ duyệt' },
  approved: { color: 'green', label: 'Đã duyệt' },
  rejected: { color: 'red', label: 'Từ chối' },
  open: { color: 'gold', label: 'Chưa xử lý' },
  resolved: { color: 'green', label: 'Đã xử lý' },
  dismissed: { color: 'default', label: 'Bỏ qua' },
}

watch(activeTab, (tab) => {
  if (tab === 'access' && !accessRows.value.length)
    loadAccess()
  else if (tab === 'feedback' && !feedbackRows.value.length)
    loadFeedback()
  else if (tab === 'ai' && !aiConfig.value)
    loadAIConfig()
})

onMounted(() => {
  loadCards()
  refreshAccessPendingCount()
  // Vào bằng deep-link ?tab= thì watch(activeTab) không chạy -> tự load tab đó.
  if (activeTab.value === 'access')
    loadAccess()
  else if (activeTab.value === 'feedback')
    loadFeedback()
  else if (activeTab.value === 'ai')
    loadAIConfig()
})
</script>

<template>
  <div class="p-4 sm:p-6">
    <div class="mb-4 flex items-center gap-2">
      <Icon name="tabler:cards" class="text-2xl text-[#1B8A3C]" />
      <h1 class="text-xl font-bold text-gray-900">
        Quản lý Flashcard AI
      </h1>
    </div>

    <a-tabs v-model:active-key="activeTab">
      <!-- ═══ TAB DANH SÁCH THẺ ═══ -->
      <a-tab-pane key="cards" tab="Danh sách thẻ">
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <a-input-search
            v-model:value="cardSearch"
            placeholder="Tìm theo từ hoặc nghĩa…"
            style="width: 240px"
            @search="handleCardSearch"
          />
          <span class="text-xs text-gray-400">Search từ tiếng Ý chưa có thẻ sẽ mở màn sinh bằng AI</span>
        </div>

        <a-table
          :columns="cardColumns"
          :data-source="cards"
          :loading="cardsLoading"
          row-key="id"
          :pagination="{
            current: cardsPage,
            pageSize: cardsPageSize,
            total: cardsTotal,
            onChange: (p: number) => { cardsPage = p; loadCards() },
          }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'word'">
              <span class="font-serif font-bold text-[#CE2B37]">{{ record.word }}</span>
            </template>
            <template v-else-if="column.key === 'created_at'">
              {{ formatDate(record.created_at) }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <div class="flex gap-2">
                <a-button size="small" @click="openPreview(record)">
                  Xem
                </a-button>
                <a-button size="small" @click="openEdit(record)">
                  Sửa
                </a-button>
                <a-button
                  size="small" danger
                  @click="rejectTarget = record"
                >
                  Xoá
                </a-button>
              </div>
            </template>
          </template>
        </a-table>
      </a-tab-pane>

      <!-- ═══ TAB CẤP QUYỀN ═══ -->
      <a-tab-pane key="access">
        <template #tab>
          <span>
            Cấp quyền
            <a-badge v-if="accessPendingCount" :count="accessPendingCount" class="ml-1" />
          </span>
        </template>

        <div class="mb-3">
          <a-select v-model:value="accessStatus" style="width: 150px" @change="() => { accessPage = 1; loadAccess() }">
            <a-select-option value="">
              Tất cả
            </a-select-option>
            <a-select-option value="pending">
              Chờ duyệt
            </a-select-option>
            <a-select-option value="approved">
              Đã duyệt
            </a-select-option>
            <a-select-option value="rejected">
              Từ chối
            </a-select-option>
          </a-select>
        </div>

        <a-table
          :columns="accessColumns"
          :data-source="accessRows"
          :loading="accessLoading"
          row-key="id"
          :pagination="{
            current: accessPage,
            pageSize: cardsPageSize,
            total: accessTotal,
            onChange: (p: number) => { accessPage = p; loadAccess() },
          }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'user'">
              <div>
                <p class="font-medium">
                  {{ record.user_name || '—' }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ record.user_email }}
                </p>
              </div>
            </template>
            <template v-else-if="column.key === 'reason'">
              <span class="text-sm">{{ record.reason || '—' }}</span>
            </template>
            <template v-else-if="column.key === 'status'">
              <a-tag :color="statusTag[record.status]?.color">
                {{ statusTag[record.status]?.label }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'created_at'">
              {{ formatDate(record.created_at) }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <div v-if="record.status === 'pending'" class="flex gap-2">
                <a-button size="small" type="primary" @click="reviewAccess(record, 'approve')">
                  Cấp quyền
                </a-button>
                <a-button size="small" danger @click="reviewAccess(record, 'reject')">
                  Từ chối
                </a-button>
              </div>
              <div v-else-if="record.status === 'approved'" class="flex items-center gap-2">
                <a-button size="small" danger @click="reviewAccess(record, 'revoke')">
                  Thu hồi quyền
                </a-button>
                <span class="text-xs text-gray-400">
                  {{ record.reviewed_by_email }} · {{ formatDate(record.reviewed_at || '') }}
                </span>
              </div>
              <span v-else class="text-xs text-gray-400">
                {{ record.reviewed_by_email }} · {{ formatDate(record.reviewed_at || '') }}
              </span>
            </template>
          </template>
        </a-table>
      </a-tab-pane>

      <!-- ═══ TAB FEEDBACK ═══ -->
      <a-tab-pane key="feedback">
        <template #tab>
          <span>
            Feedback
            <a-badge v-if="feedbackOpenCount" :count="feedbackOpenCount" class="ml-1" />
          </span>
        </template>

        <div class="mb-3">
          <a-select v-model:value="feedbackStatus" style="width: 150px" @change="() => { feedbackPage = 1; loadFeedback() }">
            <a-select-option value="">
              Tất cả
            </a-select-option>
            <a-select-option value="open">
              Chưa xử lý
            </a-select-option>
            <a-select-option value="resolved">
              Đã xử lý
            </a-select-option>
            <a-select-option value="dismissed">
              Bỏ qua
            </a-select-option>
          </a-select>
        </div>

        <a-table
          :columns="feedbackColumns"
          :data-source="feedbackRows"
          :loading="feedbackLoading"
          row-key="id"
          :pagination="{
            current: feedbackPage,
            pageSize: cardsPageSize,
            total: feedbackTotal,
            onChange: (p: number) => { feedbackPage = p; loadFeedback() },
          }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'word'">
              <span class="font-serif font-bold text-[#CE2B37]">{{ record.flashcard_word }}</span>
            </template>
            <template v-else-if="column.key === 'status'">
              <a-tag :color="statusTag[record.status]?.color">
                {{ statusTag[record.status]?.label }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <div v-if="record.status === 'open'" class="flex gap-2">
                <a-button size="small" @click="openEdit({ id: record.flashcard })">
                  Sửa
                </a-button>
                <a-button size="small" type="primary" @click="resolveFeedback(record, 'resolved')">
                  Đã xử lý
                </a-button>
                <a-button size="small" @click="resolveFeedback(record, 'dismissed')">
                  Bỏ qua
                </a-button>
              </div>
              <span v-else class="text-xs text-gray-400">{{ record.admin_note || '—' }}</span>
            </template>
          </template>
        </a-table>
      </a-tab-pane>

      <!-- ═══ TAB CẤU HÌNH AI ═══ -->
      <a-tab-pane key="ai" tab="Cấu hình AI">
        <a-skeleton v-if="aiLoading" active :paragraph="{ rows: 6 }" />
        <div v-else-if="aiConfig" class="max-w-xl space-y-4">
          <div class="rounded-xl border border-gray-200 bg-white p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-semibold text-gray-900">
                  Bật tính năng AI
                </p>
                <p class="text-xs text-gray-500">
                  Tắt để tạm ngừng sinh thẻ mà không xoá API key.
                </p>
              </div>
              <a-switch v-model:checked="aiForm.is_enabled" />
            </div>
          </div>

          <div class="rounded-xl border border-gray-200 bg-white p-4">
            <label class="text-xs font-semibold tracking-wide text-gray-500">API KEY</label>
            <p class="mt-1 text-sm">
              Hiện tại:
              <code v-if="aiConfig.has_api_key" class="rounded bg-gray-100 px-2 py-0.5">{{ aiConfig.api_key_masked }}</code>
              <a-tag v-else color="red">
                Chưa có key
              </a-tag>
            </p>
            <a-input-password
              v-model:value="aiForm.api_key"
              class="mt-2"
              placeholder="Nhập key mới để thay (bỏ trống = giữ key hiện tại)"
              autocomplete="new-password"
            />
            <p class="mt-1 text-xs text-gray-400">
              Key được mã hoá trước khi lưu và không bao giờ hiển thị lại nguyên văn.
            </p>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="rounded-xl border border-gray-200 bg-white p-4">
              <label class="text-xs font-semibold tracking-wide text-gray-500">MODEL</label>
              <a-input v-model:value="aiForm.model" class="mt-2" placeholder="gpt-5.5" />
            </div>
            <div class="rounded-xl border border-gray-200 bg-white p-4">
              <label class="text-xs font-semibold tracking-wide text-gray-500">TIMEOUT (GIÂY)</label>
              <a-input-number v-model:value="aiForm.timeout" class="mt-2 w-full" :min="5" :max="600" />
            </div>
          </div>

          <div class="rounded-xl border border-gray-200 bg-white p-4">
            <label class="text-xs font-semibold tracking-wide text-gray-500">BASE URL</label>
            <a-input v-model:value="aiForm.base_url" class="mt-2" placeholder="Bỏ trống = api.openai.com" />
            <p class="mt-1 text-xs text-gray-400">
              Trỏ sang gateway tương thích OpenAI (CLIProxy, LiteLLM…).
              Backend chạy trong Docker nên "localhost" phải viết là host.docker.internal.
            </p>
          </div>

          <div class="flex items-center gap-3">
            <a-button type="primary" :loading="aiSaving" @click="saveAIConfig">
              Lưu cấu hình
            </a-button>
            <a-button :loading="aiTesting" @click="testAIConfig">
              Gửi request thử
            </a-button>
            <span v-if="aiConfig.updated_by_email" class="text-xs text-gray-400">
              Sửa lần cuối: {{ aiConfig.updated_by_email }} · {{ formatDate(aiConfig.updated_at) }}
            </span>
          </div>
        </div>
      </a-tab-pane>
    </a-tabs>

    <!-- Modal xem trước thẻ: đúng giao diện học sinh thấy, lật được -->
    <a-modal v-model:open="previewOpen" :footer="null" :width="900" destroy-on-close>
      <template #title>
        <span>Xem trước thẻ</span>
      </template>
      <div v-if="previewCard" class="space-y-4">
        <FlashcardDetail
          :flashcard="previewCard"
          :speech-supported="false"
        />
        <p v-if="previewCard.open_feedback_count" class="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
          ⚠ Thẻ này đang có {{ previewCard.open_feedback_count }} feedback chưa xử lý.
        </p>
        <div class="flex justify-end gap-2 border-t border-gray-100 pt-3">
          <a-button @click="openEdit(previewCard)">
            Sửa nội dung
          </a-button>
          <a-button
            danger
            @click="rejectTarget = previewCard"
          >
            Xoá thẻ
          </a-button>
        </div>
      </div>
    </a-modal>

    <!-- Modal sửa nội dung thẻ -->
    <a-modal
      v-model:open="editOpen"
      :width="1000"
      :confirm-loading="editSaving"
      ok-text="Lưu nội dung"
      cancel-text="Huỷ"
      @ok="saveEdit"
    >
      <template #title>
        Sửa thẻ <b class="font-serif text-[#CE2B37]">{{ editWord }}</b>
        <span class="ml-2 text-xs font-normal text-gray-400">AI sinh sai chỗ nào thì sửa thẳng ở đây</span>
      </template>

      <div class="max-h-[65vh] space-y-4 overflow-y-auto pr-2">
        <!-- Từ + phiên âm -->
        <div class="grid gap-3 sm:grid-cols-3">
          <div>
            <label class="text-xs font-semibold text-gray-500">TỪ TIẾNG Ý</label>
            <a-input v-model:value="editForm.it_word" class="mt-1" />
          </div>
          <div>
            <label class="text-xs font-semibold text-gray-500">NGHĨA TIẾNG VIỆT</label>
            <a-input v-model:value="editForm.vi_word" class="mt-1" />
          </div>
          <div>
            <label class="text-xs font-semibold text-gray-500">PHIÊN ÂM IPA</label>
            <a-input v-model:value="editForm.pronunciation" class="mt-1" placeholder="/ˈka.za/" />
          </div>
        </div>

        <!-- Ngữ pháp -->
        <fieldset class="rounded-xl border border-[#CFE7D4] p-3">
          <legend class="px-1 text-xs font-bold text-[#1B8A3C]">
            NGỮ PHÁP
          </legend>
          <div class="grid gap-3 sm:grid-cols-4">
            <div>
              <label class="text-xs text-gray-500">Loại từ (Ý)</label>
              <a-input v-model:value="editForm.it_part_of_speech" class="mt-1" placeholder="sostantivo" />
            </div>
            <div>
              <label class="text-xs text-gray-500">Loại từ (Việt)</label>
              <a-input v-model:value="editForm.vi_part_of_speech" class="mt-1" placeholder="danh từ" />
            </div>
            <div>
              <label class="text-xs text-gray-500">Giống (Ý)</label>
              <a-input v-model:value="editForm.it_gender" class="mt-1" placeholder="femminile / rỗng" />
            </div>
            <div>
              <label class="text-xs text-gray-500">Giống (Việt)</label>
              <a-input v-model:value="editForm.vi_gender" class="mt-1" placeholder="giống cái / rỗng" />
            </div>
            <div>
              <label class="text-xs text-gray-500">Số (Ý)</label>
              <a-input v-model:value="editForm.it_number" class="mt-1" placeholder="singolare" />
            </div>
            <div>
              <label class="text-xs text-gray-500">Số (Việt)</label>
              <a-input v-model:value="editForm.vi_number" class="mt-1" placeholder="số ít" />
            </div>
            <div>
              <label class="text-xs text-gray-500">Mạo từ</label>
              <a-input v-model:value="editForm.article" class="mt-1" placeholder="la / il / rỗng" />
            </div>
            <div>
              <label class="text-xs text-gray-500">Mạo từ + dạng số nhiều</label>
              <div class="mt-1 flex gap-1">
                <a-input v-model:value="editForm.plural_article" style="width: 45%" placeholder="le" />
                <a-input v-model:value="editForm.plural_form" placeholder="case" />
              </div>
            </div>
          </div>
          <p class="mt-2 text-xs text-gray-400">
            Trường không áp dụng (động từ…) để rỗng — FE sẽ ẩn dòng đó.
          </p>
        </fieldset>

        <!-- Định nghĩa -->
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="text-xs font-semibold text-gray-500">ĐỊNH NGHĨA (Ý)</label>
            <a-textarea v-model:value="editForm.it_definition" :rows="2" class="mt-1" />
          </div>
          <div>
            <label class="text-xs font-semibold text-gray-500">ĐỊNH NGHĨA (Việt)</label>
            <a-textarea v-model:value="editForm.vi_definition" :rows="2" class="mt-1" />
          </div>
        </div>

        <!-- Ví dụ theo cặp -->
        <fieldset class="rounded-xl border border-[#CFE7D4] p-3">
          <legend class="px-1 text-xs font-bold text-[#1B8A3C]">
            VÍ DỤ (theo cặp Ý – Việt)
          </legend>
          <div v-for="(pair, i) in editForm.examples" :key="i" class="mb-2 flex items-start gap-2">
            <span class="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1B8A3C] text-xs font-bold text-white">
              {{ i + 1 }}
            </span>
            <div class="grid flex-1 gap-2 sm:grid-cols-2">
              <a-textarea v-model:value="pair.it" :rows="2" placeholder="Câu tiếng Ý" />
              <a-textarea v-model:value="pair.vi" :rows="2" placeholder="Bản dịch tiếng Việt" />
            </div>
            <a-button size="small" danger class="mt-1" @click="removeExamplePair(i)">
              Xoá
            </a-button>
          </div>
          <a-button size="small" @click="addExamplePair">
            + Thêm cặp ví dụ
          </a-button>
        </fieldset>

        <!-- Đồng nghĩa / chủ đề / ghi nhớ -->
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="text-xs font-semibold text-gray-500">ĐỒNG NGHĨA (Ý) — phẩy ngăn cách</label>
            <a-input v-model:value="editForm.it_synonyms" class="mt-1" placeholder="abitazione, dimora" />
          </div>
          <div>
            <label class="text-xs font-semibold text-gray-500">ĐỒNG NGHĨA (Việt)</label>
            <a-input v-model:value="editForm.vi_synonyms" class="mt-1" placeholder="nhà ở, chỗ ở" />
          </div>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="text-xs font-semibold text-gray-500">CHỦ ĐỀ — phẩy ngăn cách</label>
            <a-input v-model:value="editForm.topics" class="mt-1" placeholder="nhà cửa, gia đình" />
          </div>
          <div>
            <label class="text-xs font-semibold text-gray-500">GHI NHỚ</label>
            <a-textarea v-model:value="editForm.mnemonic" :rows="2" class="mt-1" />
          </div>
        </div>
      </div>
    </a-modal>

    <!-- Modal sinh thẻ bằng AI từ ô search -->
    <FlashcardGeneratorModal
      v-model:open="genOpen"
      :word="genWord"
      @done="loadCards"
    />

    <!-- Modal xoá thẻ -->
    <a-modal
      :open="rejectTarget !== null"
      title="Xoá thẻ"
      ok-text="Xoá"
      ok-type="danger"
      cancel-text="Huỷ"
      :confirm-loading="rejectSending"
      @ok="submitReject"
      @cancel="rejectTarget = null"
    >
      <p class="mb-2 text-sm">
        Thẻ <b class="text-[#CE2B37]">{{ rejectTarget?.word }}</b> sẽ bị <b>xoá hẳn</b>
        (kèm feedback, lưu từ, lịch sử liên quan). Lần tra sau AI sẽ sinh lại bản hoàn toàn mới.
      </p>
      <a-textarea v-model:value="rejectReason" :rows="3" placeholder="Lý do (không bắt buộc)" />
    </a-modal>
  </div>
</template>
