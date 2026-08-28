/**
 * Backend không sinh ảnh minh hoạ và sẽ không có `image_url`, xem docs FLASHCARD_API.md mục 9.
 * FE map icon tĩnh theo `topics[]`, không khớp thì dùng icon mặc định.
 */
const TOPIC_ICONS: Array<{ keywords: string[], icon: string }> = [
  { keywords: ['nhà', 'gia cư', 'nội thất'], icon: 'tabler:home' },
  { keywords: ['gia đình', 'người thân'], icon: 'tabler:users' },
  { keywords: ['ăn', 'thức ăn', 'món', 'ẩm thực', 'nấu'], icon: 'tabler:tools-kitchen-2' },
  { keywords: ['uống', 'đồ uống', 'nước'], icon: 'tabler:glass-full' },
  { keywords: ['động vật', 'thú', 'vật nuôi'], icon: 'tabler:paw' },
  { keywords: ['sách', 'đọc', 'học', 'giáo dục', 'trường'], icon: 'tabler:book' },
  { keywords: ['đi lại', 'giao thông', 'xe', 'du lịch'], icon: 'tabler:car' },
  { keywords: ['quần áo', 'trang phục', 'thời trang'], icon: 'tabler:shirt' },
  { keywords: ['cơ thể', 'sức khoẻ', 'sức khỏe', 'y tế', 'bệnh'], icon: 'tabler:heartbeat' },
  { keywords: ['thời gian', 'ngày', 'tháng', 'mùa'], icon: 'tabler:clock' },
  { keywords: ['thời tiết', 'khí hậu'], icon: 'tabler:cloud' },
  { keywords: ['công việc', 'nghề', 'văn phòng'], icon: 'tabler:briefcase' },
  { keywords: ['tiền', 'mua sắm', 'chợ', 'kinh tế'], icon: 'tabler:shopping-cart' },
  { keywords: ['thiên nhiên', 'cây', 'hoa', 'vườn'], icon: 'tabler:plant-2' },
  { keywords: ['cảm xúc', 'tình cảm', 'tính cách'], icon: 'tabler:mood-smile' },
  { keywords: ['thể thao', 'vận động'], icon: 'tabler:ball-football' },
  { keywords: ['số', 'đếm', 'toán'], icon: 'tabler:numbers' },
  { keywords: ['màu'], icon: 'tabler:palette' },
  { keywords: ['đời sống', 'hằng ngày', 'hàng ngày', 'sinh hoạt'], icon: 'tabler:sun' },
]

export const DEFAULT_TOPIC_ICON = 'tabler:language'

export function getTopicIcon(topics: string[] | undefined): string {
  if (!topics?.length)
    return DEFAULT_TOPIC_ICON

  const normalized = topics.map(topic => topic.toLowerCase())
  const matched = TOPIC_ICONS.find(entry =>
    entry.keywords.some(keyword => normalized.some(topic => topic.includes(keyword))),
  )

  return matched?.icon ?? DEFAULT_TOPIC_ICON
}
