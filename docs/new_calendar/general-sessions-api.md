# General Sessions (Calendar) API Documentation

## Tổng quan

API để lấy danh sách tất cả sessions của tất cả các lớp học (classrooms) trong hệ thống. API này được sử dụng để hiển thị lịch học tổng quát (General Calendar).

---

## Endpoint

### Get All Sessions

**Endpoint**: `GET /api/v1/sessions/`

**Description**: Lấy danh sách tất cả sessions của tất cả classrooms trên toàn hệ thống. Hỗ trợ filter theo date range để tối ưu hiệu năng hiển thị calendar.

**Permission**: Authenticated (Admin hoặc Teacher)

**Query Parameters:**
- `start_date`: String (optional, format: `YYYY-MM-DD`) - Ngày bắt đầu để filter sessions. Nếu không có, lấy tất cả sessions từ quá khứ đến tương lai.
- `end_date`: String (optional, format: `YYYY-MM-DD`) - Ngày kết thúc để filter sessions. Nếu không có, lấy tất cả sessions từ `start_date` đến tương lai.
- `page`: Integer (optional, default: 1) - Số trang (nếu có pagination)
- `page_size`: Integer (optional, default: 100) - Số items mỗi trang

**Note**:
- Trả về sessions của tất cả classrooms mà user có quyền xem.
- Nếu chỉ có `start_date` mà không có `end_date`, lấy tất cả sessions từ `start_date` đến tương lai.
- Nếu chỉ có `end_date` mà không có `start_date`, lấy tất cả sessions từ quá khứ đến `end_date`.
- Nếu có cả `start_date` và `end_date`, lấy sessions trong khoảng thời gian này (bao gồm cả `start_date` và `end_date`).
- Filter dựa trên `start_time` của session (UTC).

**⚠️ Quy tắc xử lý thời gian (UTC):**
Hệ thống sẽ lưu trữ và trả về thông tin ngày giờ **y hệt** như những gì được gửi lên.
- Ví dụ: Client gửi `start_date` là `2026-11-01` và `start_time` là `20:21`.
- API Response sẽ trả về: `"start_time": "2026-11-01T20:21:00.000Z"`.

---

## Response Structure

### Response 200 OK

```json
{
  "count": 10,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "session-uuid-1",
      "classroom": "classroom-uuid-1",
      "topic": "Lớp 1 thành viên - Buổi 1",
      "description": "Buổi học 1 của Lớp 1 thành viên",
      "start_time": "2026-11-01T20:21:00.000Z",
      "end_time": "2026-11-01T22:21:00.000Z",
      "location": "",
      "limit": 10,
      "status": "scheduled",
      "classroom_title": "Lớp 1 thành viên",
      "course_title": "Khóa học tiếng Ý cơ bản",
      "attendance_count": 0,
      "present_count": 0,
      "background_color": "#268100",
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

### Response 400 Bad Request

```json
{
  "detail": "Invalid date format. Expected YYYY-MM-DD"
}
```

---

## Get Session Detail

**Endpoint**: `GET /api/v1/sessions/{session_id}/`

**Description**: Lấy thông tin chi tiết của một session. Trả về đầy đủ thông tin bao gồm `meeting_link`, `meeting_id`, `meeting_pass` nếu user có quyền truy cập.

**Permission**: Authenticated (Admin hoặc Teacher)

**Path Parameters:**
- `session_id`: UUID (required) - ID của session

**Response 200 OK:**

```json
{
  "id": "session-uuid-1",
  "classroom": {
    "id": "classroom-uuid-1",
    "title": "Lớp 1 thành viên",
    "student_count": 1,
    "price": "100.00",
    "discount_price": null
  },
  "course": {
    "id": "course-uuid-1",
    "title": "Khóa học tiếng Ý cơ bản",
    "slug": "khoa-hoc-tieng-y-co-ban"
  },
  "topic": "Lớp 1 thành viên - Buổi 1",
  "description": "Buổi học 1 của Lớp 1 thành viên",
  "start_time": "2026-11-01T20:21:00.000Z",
  "end_time": "2026-11-01T22:21:00.000Z",
  "location": "",
  "meeting_link": "https://zoom.us/j/123456789",
  "meeting_id": "123456789",
  "meeting_pass": "password123",
  "limit": 10,
  "status": "scheduled",
  "attendance_count": 0,
  "present_count": 0,
  "background_color": "#268100",
  "created_at": "2026-01-01T00:00:00.000Z",
  "updated_at": "2026-01-01T00:00:00.000Z"
}
```

**Response 404 Not Found:**

```json
{
  "detail": "Session not found"
}
```
---

## Update Session

**Endpoint**: `PATCH /api/v1/sessions/{session_id}/`

**Description**: Cập nhật thông tin của một buổi học.

**Permission**: Authenticated (Admin hoặc Teacher)

**Request Body (Partial):**
- `topic`: String
- `description`: String
- `start_time`: DateTime (UTC ISO 8601)
- `end_time`: DateTime (UTC ISO 8601)
- `location`: String
- `status`: String (`scheduled`, `ongoing`, `completed`, `cancelled`)

**Response 200 OK:** (Trả về object session đã cập nhật)

---

## Delete Session

**Endpoint**: `DELETE /api/v1/sessions/{session_id}/`

**Description**: Xóa một buổi học.

**Permission**: Authenticated (Admin hoặc Teacher)

**Lưu ý quan trọng**:
- Khi một session bị xóa, hệ thống sẽ kích hoạt logic tự động tạo một session mới ở "khe thời gian" trống tiếp theo của lớp học đó để đảm bảo duy trì đủ số lượng `number_of_sessions` đã đăng ký của Classroom.
- Xem chi tiết tại: [classroom-auto-sessions-api.md](./classroom-auto-sessions-api.md#2-duy-tri-so-luong-buoi-hoc-auto-refill)

**Response 204 No Content**

---

## Reschedule Session

**Endpoint**: `POST /api/v1/sessions/{session_id}/reschedule/`

**Description**: API chuyên biệt để thay đổi thời gian của một buổi học.

**Permission**: Authenticated (Admin hoặc Teacher)

**Request Body:**
```json
{
  "start_date": "2026-11-01",
  "start_time": "20:21",
  "end_date": "2026-11-01",
  "end_time": "21:21"
}
```

**Lưu ý**:
- Hệ thống sẽ kết hợp `start_date` + `start_time` và `end_date` + `end_time` để lưu trữ.
- Tuân thủ quy tắc UTC: Trả về y hệt những gì đã gửi (ví dụ: `2026-11-01T20:21:00.000Z`).

**Response 200 OK**: (Trả về object session đã cập nhật)

---

## Session Model

### ClassroomSession (List Response)

**Fields trong list response (`GET /api/v1/sessions/`):**
- `id`: UUID (required) - ID duy nhất của session
- `classroom`: UUID (required) - ID của classroom chứa session này
- `topic`: String (required) - Chủ đề/buổi học
- `description`: String (optional) - Mô tả chi tiết
- `start_time`: DateTime (required, UTC) - Thời gian bắt đầu session (format: ISO 8601)
- `end_time`: DateTime (required, UTC) - Thời gian kết thúc session (format: ISO 8601)
- `location`: String (optional) - Địa điểm học (nếu học offline)
- `limit`: Integer (required) - Số lượng học viên tối đa
- `status`: String (required) - Trạng thái session: `scheduled`, `ongoing`, `completed`, `cancelled`
- `classroom_title`: String (required) - Tên của classroom (để hiển thị trong calendar)
- `course_title`: String (required) - Tên của course (để hiển thị trong calendar)
- `attendance_count`: Integer (default: 0) - Tổng số học viên đã đăng ký
- `present_count`: Integer (default: 0) - Số học viên có mặt
- `background_color`: String (optional) - Màu nền cho event trong calendar (format: hex color, ví dụ: `#268100`). Nếu không có, frontend sẽ random từ danh sách màu có sẵn.
- `created_at`: DateTime (auto-generated) - Thời gian tạo
- `updated_at`: DateTime (auto-updated) - Thời gian cập nhật cuối

---

## Ví dụ Request

### Ví dụ 1: Lấy tất cả sessions (không filter)

```http
GET /api/v1/sessions/
Authorization: Bearer {token}
```

### Ví dụ 2: Lấy sessions trong một tuần cụ thể

```http
GET /api/v1/sessions/?start_date=2026-01-26&end_date=2026-02-01
Authorization: Bearer {token}
```

---

## Error Handling

- Validate `start_date` và `end_date` format (YYYY-MM-DD)
- Return 400 nếu date format không hợp lệ
- Đảm bảo serializer trả về đầy đủ các fields: `classroom_title`, `course_title`, và tất cả các fields khác của session model

---

## Testing

### Test Cases

1. **Get all sessions without filter**
   - Request: `GET /api/v1/sessions/`
   - Expected: Trả về tất cả sessions của tất cả các lớp

2. **Get sessions with date range**
   - Request: `GET /api/v1/sessions/?start_date=2026-01-26&end_date=2026-02-01`
   - Expected: Chỉ trả về sessions có `start_time` trong khoảng 26/1 - 1/2/2026

3. **Invalid date format**
   - Request: `GET /api/v1/sessions/?start_date=2026/01/26`
   - Expected: 400 Bad Request với message "Invalid date format"

4. **Empty result**
   - Request: `GET /api/v1/sessions/?start_date=2099-01-01&end_date=2099-01-07`
   - Expected: 200 OK với `results: []`
