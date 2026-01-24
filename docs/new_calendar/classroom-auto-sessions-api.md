# Classroom Auto-Sessions API Documentation

## Tổng quan

API này hỗ trợ tạo lớp học (Classroom) và tự động tạo ra một số lượng buổi học (Sessions) cụ thể dựa trên lịch trình (Schedule) và ngày bắt đầu. Hệ thống sẽ đảm bảo luôn duy trì đủ số lượng buổi học đã đăng ký ngay cả khi có buổi học bị xóa.

---

## Endpoint

### Create Classroom with Auto-Sessions

**Endpoint**: `POST /api/v1/classrooms/`

**Description**: Tạo lớp học mới và tự động tạo `number_of_sessions` buổi học kể từ `start_date`.

**Permission**: Admin hoặc Teacher

### Request Body Structure

```typescript
{
  course_id: string // UUID của khóa học
  title: string // Tên lớp học
  student_count: number // Số lượng học viên
  number_of_sessions: number // TỔNG số buổi học cần tạo
  start_date: string // Ngày bắt đầu (Format: "YYYY-MM-DD", UTC)
  schedules_data: Array<{ // Lịch học hàng tuần
    day_of_week: string // "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"
    start_time: string // Format: "HH:mm" (giờ UTC, ví dụ: "13:00")
    end_time: string // Format: "HH:mm" (giờ UTC, ví dụ: "15:00")
  }>
  price: string // Giá gốc
  discount_price: string | null // Giá khuyến mãi
  background_color?: string // Màu nền cho calendar event
}
```

> [!IMPORTANT]
> Tất cả các trường thời gian (`start_date`, `start_time`, `end_time`) phải được gửi theo chuẩn **UTC**.
> Hệ thống sẽ lưu trữ và trả về y hệt giá trị được gửi lên.
> Ví dụ: `start_date` là `2026-11-01` và `start_time` là `20:21`, response sẽ là `2026-11-01T20:21:00.000Z`.

---

## Logic xử lý phía Backend

### 1. Tạo Session ban đầu

Khi nhận được request, hệ thống sẽ thực hiện các bước sau:
1. Xác định danh sách các "khe thời gian" (slots) dựa trên `schedules_data`.
2. Bắt đầu từ `start_date`, tìm các ngày khớp với `day_of_week` trong schedule.
3. Tạo đúng `number_of_sessions` buổi học.
4. Nếu có nhiều slot trong một tuần, hệ thống sẽ chọn các slot sớm nhất kế tiếp nhau từ `start_date`.

**Ví dụ:**
- `number_of_sessions`: 2
- `schedules_data`: Thứ 4 & Thứ 6 (20h-21h UTC)
- `start_date`: 2026-01-22 (Thứ 5)
- **Hệ thống tạo:**
    - Session 1: Thứ 6 (2026-01-23)
    - Session 2: Thứ 4 tuần sau (2026-01-28)

**Ví dụ 2:**
- `number_of_sessions`: 2
- `schedules_data`: Thứ 4 & Thứ 6 (20h-21h UTC)
- `start_date`: 2026-01-19 (Thứ 2)
- **Hệ thống tạo:**
    - Session 1: Thứ 4 (2026-01-21)
    - Session 2: Thứ 6 (2026-01-23)

### 2. Duy trì số lượng buổi học (Auto-refill)

Đây là cơ chế quan trọng:
- Khi một session của lớp học này bị xóa qua API `DELETE /api/v1/sessions/{id}/`.
- Hệ thống sẽ tự động tìm "khe thời gian" trống tiếp theo (ngay sau buổi học cuối cùng hiện tại của lớp) để tạo 1 session mới.
- Mục tiêu là luôn đảm bảo Classroom đó có đủ số lượng Sessions bằng với `number_of_sessions`

---

## Error Handling

- **400 Bad Request**:
    - `number_of_sessions` <= 0.
    - `start_date` Từ ngày hiện tại trở đi.
    - `start_time` >= `end_time`.
- **404 Not Found**: `course_id` không tồn tại.

---

## Testing

1. **Verify Session Count**: Tạo lớp với `number_of_sessions: 10`, đếm đúng 10 sessions trong DB.
2. **Verify Start Date Logic**: Đảm bảo không có session nào được tạo trước `start_date`.
3. **Verify UTC**: Input giờ UTC, verify trong DB và response calendar đúng giờ đó.
4. **Verify Deletion Logic**: Xóa 1 buổi, kiểm tra buổi mới được tự động sinh ra ở slot tiếp theo của lịch trình.
