# Student General Sessions (Calendar) API Documentation

## Tổng quan

API để học sinh (Student) lấy danh sách tất cả sessions của tất cả các lớp học mà họ có quyền xem trong hệ thống. API này chỉ cho phép xem (Read-only), không hỗ trợ chỉnh sửa.

---

## Endpoint

### Get All Sessions for Student

**Endpoint**: `GET /api/v1/students/sessions/`

**Description**: Lấy danh sách tất cả sessions của tất cả classrooms dành cho Student. Hỗ trợ filter theo date range để tối ưu hiệu năng hiển thị calendar.

**Permission**: Authenticated (Student)

**Query Parameters:**
- `start_date`: String (optional, format: `YYYY-MM-DD`) - Ngày bắt đầu để filter sessions.
- `end_date`: String (optional, format: `YYYY-MM-DD`) - Ngày kết thúc để filter sessions.
- `page`: Integer (optional, default: 1) - Số trang.
- `page_size`: Integer (optional, default: 100) - Số items mỗi trang.

**Note**:
- Student chỉ có quyền xem thông tin, không thể thay đổi dữ liệu.
- Trả về sessions của các classrooms mà student đã đăng ký hoặc các lớp học công khai có thể xem.

**⚠️ Quy tắc xử lý thời gian (UTC):**
Hệ thống lưu trữ và trả về thời gian y hệt như lúc input.
- Ví dụ: `start_date` = `2026-11-01`, `start_time` = `20:21` -> Response `2026-11-01T20:21:00.000Z`.

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
      "topic": "Lớp 1 thành viên - Buổi 1",
      "description": "Buổi học 1 của Lớp 1 thành viên",
      "start_time": "2026-11-01T20:21:00.000Z",
      "end_time": "2026-11-01T22:21:00.000Z",
      "location": "",
      "limit": 10,
      "status": "scheduled",
      "classroom_title": "Lớp 1 thành viên",
      "course_title": "Khóa học tiếng Ý cơ bản",
      "background_color": "#268100",
      "is_enrolled": true,
      "attendance_count": 0,
      "present_count": 0,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## Session Model

### StudentClassroomSession (List Response)

**Fields trong list response (`GET /api/v1/students/sessions/`):**
- `id`: UUID (required) - ID duy nhất của session
- `topic`: String (required) - Chủ đề/buổi học
- `description`: String (optional) - Mô tả chi tiết
- `start_time`: DateTime (required, UTC)
- `end_time`: DateTime (required, UTC)
- `location`: String (optional)
- `limit`: Integer (required)
- `status`: String (required)
- `classroom_title`: String (required)
- `course_title`: String (required)
- `background_color`: String (optional)
- `is_enrolled`: Boolean (required) - `true` nếu student đã đăng ký vào classroom của session này, ngược lại là `false`.
- `attendance_count`: Integer
- `present_count`: Integer
- `created_at`: DateTime
- `updated_at`: DateTime

---

## Ví dụ Request

### Ví dụ 1: Student lấy lịch học

```http
GET /api/v1/students/sessions/
Authorization: Bearer {token}
```
