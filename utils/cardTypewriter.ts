/**
 * Bộ gõ từng ký tự cho thẻ đang stream.
 *
 * Backend đẩy snapshot theo cụm (~8 nhịp/giây), mỗi cụm thêm nhiều ký tự nên
 * render thẳng sẽ thấy chữ "nhảy". Hai hàm này cho phép UI giữ một bản hiển thị
 * riêng và tiến về snapshot đích TỪNG KÝ TỰ MỘT, với ngân sách ký tự mỗi nhịp.
 *
 * Dựa trên tính chất prefix của JSON stream: chuỗi chỉ dài ra chứ không đổi,
 * mảng chỉ thêm phần tử — nên "tiến về đích" luôn là nối thêm ký tự.
 */

export type CardNode
  = | string
    | number
    | boolean
    | null
    | undefined
    | CardNode[]
    | { [key: string]: CardNode }

/** Tổng số ký tự bản hiển thị còn thiếu so với đích. */
export function cardBacklog(current: CardNode, target: CardNode): number {
  if (typeof target === 'string') {
    const cur = typeof current === 'string' ? current : ''
    return Math.max(0, target.length - cur.length)
  }
  if (Array.isArray(target)) {
    const cur = Array.isArray(current) ? current : []
    return target.reduce<number>((sum, item, i) => sum + cardBacklog(cur[i], item), 0)
  }
  if (target && typeof target === 'object') {
    const cur = current && typeof current === 'object' && !Array.isArray(current)
      ? current as { [key: string]: CardNode }
      : {}
    return Object.keys(target).reduce((sum, key) => sum + cardBacklog(cur[key], target[key]), 0)
  }
  return 0
}

/**
 * Trả về bản mới của `current` tiến về `target`, tiêu tối đa `budget.n` ký tự.
 * Duyệt theo thứ tự field của target — trùng thứ tự AI sinh, nên con chữ chạy
 * tuần tự qua từng ô như người điền thẻ thật.
 */
export function advanceCard(current: CardNode, target: CardNode, budget: { n: number }): CardNode {
  if (typeof target === 'string') {
    const cur = typeof current === 'string' ? current : ''
    if (cur.length >= target.length)
      return target // đích không bao giờ ngắn lại; == là đã bắt kịp
    if (budget.n <= 0)
      return cur
    const take = Math.min(budget.n, target.length - cur.length)
    budget.n -= take
    return target.slice(0, cur.length + take)
  }
  if (Array.isArray(target)) {
    const cur = Array.isArray(current) ? current : []
    return target.map((item, i) => advanceCard(cur[i], item, budget))
  }
  if (target && typeof target === 'object') {
    const cur = current && typeof current === 'object' && !Array.isArray(current)
      ? current as { [key: string]: CardNode }
      : {}
    const out: { [key: string]: CardNode } = {}
    for (const key of Object.keys(target))
      out[key] = advanceCard(cur[key], target[key], budget)
    return out
  }
  return target
}
