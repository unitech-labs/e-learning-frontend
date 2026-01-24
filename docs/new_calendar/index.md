# New Calendar Implementation & Verification Guide

## Tổng quan

Tài liệu này hướng dẫn cách triển khai (Implementation) và xác thực (Verification) hệ thống Calendar mới. Trọng tâm là đảm bảo tính chính xác của dữ liệu thời gian (UTC) và cơ chế tự động quản lý số lượng buổi học.

---

## 1. Hướng dẫn triển khai cho AI

Cần thực hiện theo thứ tự các tài liệu sau:

### Bước 1: API Tạo lớp học tự động sinh Sessions
- **Doc**: [classroom-auto-sessions-api.md](./classroom-auto-sessions-api.md)
- **Lưu ý**: Tập trung vào logic vòng lặp để tìm slot tiếp theo kế từ `start_date` cho đến khi đủ `number_of_sessions`. Đảm bảo lưu đúng định dạng giờ UTC mà client gửi lên.

### Bước 2: API Lấy lịch tổng (Admin/Teacher)
- **Doc**: [general-sessions-api.md](./general-sessions-api.md)
- **Lưu ý**: Trả về dữ liệu dạng phẳng (flat), giá trị `start_time` và `end_time` phải khớp từng ký tự với dữ liệu đã lưu (UTC).

### Bước 3: API Lấy lịch cho học sinh
- **Doc**: [student-sessions-api.md](./student-sessions-api.md)
- **Lưu ý**: Logic tương tự API tổng nhưng có thêm field `is_enrolled` để check quyền lợi của student đối với lớp học đó.

### Bước 4: API Tạo session hàng loạt (Bulk Generate)
- **Doc**: [bulk-generate-sessions-api.md](./bulk-generate-sessions-api.md)
- **Lưu ý**: Lấy lịch học hiện tại của classroom để tính toán các buổi tiếp theo.

### Bước 5: Logic bù đắp Session khi xóa

---

## 2. Xác thực bằng cURL (Manual Verification)

Giả sử `BASE_URL=http://localhost:8000/api/v1` và `TOKEN` là access token của Admin.

### Bước A: Tạo lớp học 2 buổi (Thứ 4, Thứ 6 lúc 20:21 UTC)
```bash
curl -X POST $BASE_URL/classrooms/ \
-H "Authorization: Bearer $TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "course_id": "UUID_CUA_COURSE",
  "title": "Lớp Test UTC",
  "student_count": 10,
  "number_of_sessions": 2,
  "start_date": "2026-11-01",
  "schedules_data": [
    {"day_of_week": "wednesday", "start_time": "20:21", "end_time": "21:21"},
    {"day_of_week": "friday", "start_time": "20:21", "end_time": "21:21"}
  ],
  "price": "100.00"
}'
```
*Ghi chú: 2026-11-01 là Chủ Nhật. Buổi 1 sẽ là Thứ 4 (11-04), Buổi 2 là Thứ 6 (11-06).*

### Bước B: Kiểm tra danh sách Session (Verify Time UTC)
```bash
curl -X GET "$BASE_URL/sessions/?start_date=2026-11-01&end_date=2026-11-30" \
-H "Authorization: Bearer $TOKEN"
```
*Verify: Response phải chứa `2026-11-04T20:21:00.000Z` và `2026-11-06T20:21:00.000Z`.*

### Bước C: Xóa 1 buổi và kiểm tra tự động bù đắp
1. Lấy `id` của buổi Thứ 4 (11-04).
2. Xóa buổi đó:
```bash
curl -X DELETE $BASE_URL/sessions/UUID_BUOI_THU_4/ \
-H "Authorization: Bearer $TOKEN"
```
3. Kiểm tra lại danh sách session:
```bash
curl -X GET "$BASE_URL/sessions/?start_date=2026-11-01&end_date=2026-11-30" \
-H "Authorization: Bearer $TOKEN"
```
*Verify: Buổi ngày 11-04 biến mất, nhưng sẽ xuất hiện một buổi mới vào Thứ 4 tuần sau đó (`2026-11-11T20:21:00.000Z`) để đảm bảo vẫn đủ 2 buổi.*

### Bước D: Thay đổi thời gian của 1 buổi (Reschedule)
```bash
curl -X POST $BASE_URL/sessions/UUID_SESSION/reschedule/ \
-H "Authorization: Bearer $TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "start_date": "2026-11-20",
  "start_time": "09:00",
  "end_date": "2026-11-20",
  "end_time": "10:00"
}'
```
*Verify: `start_time` trong response phải là `2026-11-20T09:00:00.000Z`.*

### Bước E: Tạo hàng loạt session cho lớp hiện có (Bulk Generate)
```bash
curl -X POST $BASE_URL/sessions/bulk-generate/ \
-H "Authorization: Bearer $TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "course_id": "UUID_CUA_COURSE",
  "classroom_id": "UUID_CUA_CLASSROOM",
  "number_of_sessions": 5
}'
```
*Verify: Đếm tổng số session của lớp đó tăng thêm đúng 5 buổi, theo đúng lịch đã cấu hình.*

---

## 3. Flow xác thực toàn trình (Golden Flow)

1. **Admin login** lấy token.
2. **POST /classrooms/** tạo lớp với `number_of_sessions = N`.
3. **GET /sessions/** kiểm tra số lượng bản ghi trả về có đúng bằng `N` không.
4. **GET /students/sessions/** (dùng token student) kiểm tra field `is_enrolled` và format thời gian.
5. **DELETE /sessions/{id}** một buổi bất kỳ.
6. **GET /sessions/** kiểm tra tổng số buổi vẫn duy trì là `N` và buổi mới được sinh ra ở slot thời gian tiếp theo hợp lệ.
7. **So khớp chuỗi thời gian**: Đảm bảo `HH:mm` gửi lên khớp hoàn toàn với `HH:mm` trong chuỗi ISO trả về.
