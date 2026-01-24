# Bulk Generate Sessions API Documentation

## Tổng quan

API này cho phép tạo hàng loạt (bulk generate) một số lượng buổi học cụ thể cho một lớp học (Classroom) đã tồn tại. Hệ thống sẽ tự động tính toán các buổi học tiếp theo dựa trên lịch học (Schedules) đã được định nghĩa của lớp học đó.

---

## Endpoint

### Bulk Generate Sessions

**Endpoint**: `POST /api/v1/sessions/bulk-generate/`

**Description**: Tạo thêm `number_of_sessions` buổi học cho một classroom, bắt đầu từ sau buổi học cuối cùng hiện có của lớp đó (hoặc kể từ `start_date` của lớp nếu chưa có buổi học nào).

**Permission**: Admin hoặc Teacher

### Request Body Structure

```json
{
  "course_id": "UUID_CUA_COURSE",
  "classroom_id": "UUID_CUA_CLASSROOM",
  "number_of_sessions": 10
}
```

---

## Logic xử lý phía Backend

1. **Xác định Classroom**: Lấy thông tin lớp học và danh sách `schedules_data` (thứ tự các ngày trong tuần, giờ bắt đầu/kết thúc).
2. **Xác định điểm bắt đầu**:
   - Tìm session có `start_time` muộn nhất của lớp học này.
   - Nếu đã có sessions: Buổi học đầu tiên của đợt generate này sẽ là slot trống tiếp theo ngay sau buổi muộn nhất đó.
   - Nếu chưa có sessions: Bắt đầu tìm slot từ `start_date` của Classroom.
3. **Vòng lặp Generate**:
   - Chạy vòng lặp để tạo đúng `number_of_sessions` bản ghi mới.
   - Mỗi bản ghi phải tuân thủ đúng `day_of_week`, `start_time`, `end_time` trong cấu hình lịch của lớp.
4. **UTC**: Đảm bảo tất cả các phép tính toán ngày giờ và dữ liệu lưu xuống DB là chuẩn UTC.

---

## Ví dụ Flow

**Cấu hình lớp:** Thứ 4 & Thứ 6 (20:00 UTC).
**Hiện tại:** Đã có 2 sessions vào Thứ 4 (11-04) và Thứ 6 (11-06).
**Request**: `number_of_sessions: 2`
**Kết quả**: Hệ thống tự động tạo thêm:
- Session 3: Thứ 4 tuần sau (11-11) lúc 20:00 UTC.
- Session 4: Thứ 6 tuần sau (11-13) lúc 20:00 UTC.

---

## Error Handling

- **400 Bad Request**: 
  - `number_of_sessions` <= 0.
  - Classroom chưa được cấu hình `schedules_data` (không có lịch để generate).
- **404 Not Found**: `classroom_id` hoặc `course_id` không tồn tại.

---

## Testing

1. **Tạo lớp mới và bulk generate**: Kiểm tra xem số lượng session có khớp chính xác với `number_of_sessions`.
2. **Generate thêm cho lớp đã có session**: Kiểm tra xem buổi học mới có bắt đầu đúng từ slot tiếp theo mà không bị trùng lặp hay bỏ sót tuần hay không.
3. **Verify UTC**: Kiểm tra response trả về đúng format `YYYY-MM-DDTHH:mm:00.000Z`.
