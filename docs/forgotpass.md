# Forgot Password với OTP API

## Tổng quan

API Forgot Password với OTP cho phép người dùng đặt lại mật khẩu bằng cách sử dụng mã OTP 6 số được gửi qua email. Đây là phương pháp an toàn và tiện lợi hơn so với việc sử dụng token dài.

### Tính năng chính

- ✅ **OTP 6 số** - Dễ nhập, dễ nhớ
- ✅ **Gửi email tự động** - OTP được gửi qua email ngay lập tức
- ✅ **Hết hạn sau 10 phút** - Bảo mật cao
- ✅ **Một lần sử dụng** - OTP chỉ có thể dùng một lần
- ✅ **Bất đồng bộ** - Gửi email qua Celery, không block request
- ✅ **Bảo mật** - Không tiết lộ email có tồn tại hay không

---

## API Endpoints

### 1. Request OTP (Quên mật khẩu)

Gửi yêu cầu OTP 6 số về email của người dùng.

**Endpoint:** `POST /api/v1/auth/password/forgot/`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response Success (200):**
```json
{
  "code": "ok",
  "message": "If an account with that email exists, an OTP code has been sent to your email address."
}
```

**Response Error - Validation (400):**
```json
{
  "code": "validation_error",
  "message": "Validation failed",
  "details": {
    "email": ["User with this email does not exist."]
  }
}
```

**Response Error - Invalid Email Format (400):**
```json
{
  "code": "validation_error",
  "message": "Validation failed",
  "details": {
    "email": ["Enter a valid email address."]
  }
}
```

---

### 2. Verify OTP và Reset Password

Xác thực OTP và đặt lại mật khẩu mới.

**Endpoint:** `POST /api/v1/auth/password/reset/otp/`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "new_password": "NewSecurePassword123",
  "new_password2": "NewSecurePassword123"
}
```

**Response Success (200):**
```json
{
  "code": "ok",
  "message": "Your password has been reset successfully."
}
```

**Response Error - OTP Expired (400):**
```json
{
  "code": "otp_expired",
  "message": "The OTP code has expired or is invalid. Please request a new OTP code."
}
```

**Response Error - Invalid OTP (400):**
```json
{
  "code": "invalid_otp",
  "message": "The OTP code is incorrect. Please check and try again."
}
```

**Response Error - Password Mismatch (400):**
```json
{
  "code": "validation_error",
  "message": "Validation failed",
  "details": {
    "new_password": ["The two password fields didn't match."]
  }
}
```

**Response Error - Password Too Short (400):**
```json
{
  "code": "validation_error",
  "message": "Validation failed",
  "details": {
    "new_password": ["Password must be at least 8 characters long."]
  }
}
```

**Response Error - Email Mismatch (400):**
```json
{
  "code": "email_mismatch",
  "message": "Email does not match. Please use the same email you requested the OTP for."
}
```

---

## Flow hoàn chỉnh

### Bước 1: User request OTP

```bash
curl -X POST http://localhost:8000/api/v1/auth/password/forgot/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

**Kết quả:**
- Hệ thống generate OTP 6 số ngẫu nhiên (100000-999999)
- Lưu OTP vào Redis với key `password_reset_otp:{email}` (timeout 10 phút)
- Lưu user_id vào Redis với key `password_reset_otp_user:{email}` (timeout 10 phút)
- Gửi email chứa OTP qua Celery task
- Trả về success message (không tiết lộ email có tồn tại hay không)

### Bước 2: User nhận email

Email sẽ chứa:
- Mã OTP 6 số (ví dụ: `123456`)
- Thông báo hết hạn sau 10 phút
- Cảnh báo bảo mật

### Bước 3: User verify OTP và reset password

```bash
curl -X POST http://localhost:8000/api/v1/auth/password/reset/otp/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "otp": "123456",
    "new_password": "NewSecurePassword123",
    "new_password2": "NewSecurePassword123"
  }'
```

**Kết quả:**
- Verify OTP từ Redis
- Verify email khớp với email đã request OTP
- Set password mới cho user
- Xóa OTP và user_id khỏi Redis (one-time use)
- Trả về success message

---

## Security Features

### 1. OTP Generation
- **6 số ngẫu nhiên** (100000-999999)
- Sử dụng `random.randint()` để đảm bảo tính ngẫu nhiên
- Mỗi request tạo OTP mới (không reuse)

### 2. OTP Storage
- Lưu trong **Redis cache** với timeout 10 phút
- Key format: `password_reset_otp:{email}`
- Tự động expire sau 10 phút

### 3. One-Time Use
- OTP được **xóa ngay sau khi verify thành công**
- Không thể reuse OTP đã dùng

### 4. Email Privacy
- **Không tiết lộ** email có tồn tại hay không
- Response giống nhau cho cả email tồn tại và không tồn tại

### 5. Email Validation
- Verify email trong request OTP phải khớp với email trong reset password
- Ngăn chặn việc dùng OTP của email khác

### 6. Password Validation
- Tối thiểu 8 ký tự
- Phải khớp giữa `new_password` và `new_password2`

---

## Error Handling

### Các lỗi thường gặp

| Error Code | HTTP Status | Mô tả |
|------------|-------------|-------|
| `validation_error` | 400 | Validation failed (email format, password mismatch, etc.) |
| `otp_expired` | 400 | OTP đã hết hạn hoặc không tồn tại |
| `invalid_otp` | 400 | OTP không đúng |
| `email_mismatch` | 400 | Email không khớp với email đã request OTP |
| `user_not_found` | 400 | User không tồn tại |

### Xử lý lỗi trong code

```python
# OTP expired
if not stored_otp:
    return error_response(
        'otp_expired', 
        'The OTP code has expired or is invalid. Please request a new OTP code.', 
        status_code=400
    )

# Invalid OTP
if stored_otp != otp:
    return error_response(
        'invalid_otp', 
        'The OTP code is incorrect. Please check and try again.', 
        status_code=400
    )
```

---

## So sánh với API cũ (Token-based)

| Tính năng | Token-based (Cũ) | OTP-based (Mới) |
|-----------|------------------|-----------------|
| **Format** | Token 32 ký tự | OTP 6 số |
| **Dễ nhập** | ❌ Khó nhập thủ công | ✅ Dễ nhập |
| **Thời gian hết hạn** | 15 phút | 10 phút |
| **Gửi email** | Link với token | OTP code |
| **Frontend** | Cần redirect đến link | Chỉ cần form nhập OTP |
| **UX** | Phức tạp hơn | Đơn giản hơn |

### Khi nào dùng API nào?

**Dùng OTP API (`/password/forgot/`):**
- ✅ Mobile app
- ✅ Form nhập OTP trực tiếp
- ✅ UX đơn giản, không cần redirect

**Dùng Token API (`/password/reset/`):**
- ✅ Web app với link email
- ✅ Cần redirect đến trang reset password
- ✅ Token trong URL

**Cả hai API đều hoạt động song song**, bạn có thể chọn API phù hợp với use case.

---

## Testing

### Test với curl

#### 1. Request OTP
```bash
curl -X POST http://localhost:8000/api/v1/auth/password/forgot/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

#### 2. Check email (hoặc Redis)
```bash
# Check Redis
docker exec -it elearning_redis redis-cli
> GET password_reset_otp:test@example.com
> GET password_reset_otp_user:test@example.com
```

#### 3. Verify OTP và Reset Password
```bash
curl -X POST http://localhost:8000/api/v1/auth/password/reset/otp/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "123456",
    "new_password": "NewPassword123",
    "new_password2": "NewPassword123"
  }'
```

### Test với Postman

1. **Request OTP:**
   - Method: `POST`
   - URL: `http://localhost:8000/api/v1/auth/password/forgot/`
   - Body (JSON):
     ```json
     {
       "email": "test@example.com"
     }
     ```

2. **Verify OTP:**
   - Method: `POST`
   - URL: `http://localhost:8000/api/v1/auth/password/reset/otp/`
   - Body (JSON):
     ```json
     {
       "email": "test@example.com",
       "otp": "123456",
       "new_password": "NewPassword123",
       "new_password2": "NewPassword123"
     }
     ```

### Test Scenarios

#### ✅ Happy Path
1. Request OTP với email hợp lệ
2. Nhận email chứa OTP
3. Verify OTP và reset password thành công

#### ❌ OTP Expired
1. Request OTP
2. Đợi hơn 10 phút
3. Verify OTP → Nhận lỗi `otp_expired`

#### ❌ Invalid OTP
1. Request OTP
2. Nhập sai OTP
3. Verify OTP → Nhận lỗi `invalid_otp`

#### ❌ Password Mismatch
1. Request OTP
2. Verify OTP với password không khớp
3. Nhận lỗi `validation_error`

---

## Email Template

### HTML Template
File: `templates/emails/password_reset_otp.html`

- ✅ Responsive design
- ✅ OTP code nổi bật với font lớn
- ✅ Cảnh báo bảo mật rõ ràng
- ✅ Thông tin hết hạn

### Plain Text Template
File: `templates/emails/password_reset_otp.txt`

- ✅ Fallback cho email client không hỗ trợ HTML
- ✅ Format đơn giản, dễ đọc

---

## Redis Keys

### Keys được sử dụng

| Key | Format | Timeout | Mô tả |
|-----|--------|---------|-------|
| OTP Code | `password_reset_otp:{email}` | 600s (10 phút) | Lưu OTP 6 số |
| User ID | `password_reset_otp_user:{email}` | 600s (10 phút) | Lưu user_id để lookup nhanh |

### Example
```bash
# Set OTP
SET password_reset_otp:user@example.com "123456" EX 600

# Set User ID
SET password_reset_otp_user:user@example.com "42" EX 600

# Get OTP
GET password_reset_otp:user@example.com

# Delete after use
DEL password_reset_otp:user@example.com
DEL password_reset_otp_user:user@example.com
```

---

## Celery Task

### Task: `send_password_reset_otp_email_task`

**Location:** `src/accounts/tasks.py`

**Parameters:**
- `user_email`: Email người nhận
- `user_first_name`: Tên người dùng
- `user_last_name`: Họ người dùng
- `otp_code`: Mã OTP 6 số

**Features:**
- ✅ Bất đồng bộ (không block request)
- ✅ Retry tự động (max 3 lần)
- ✅ Error handling cho SMTP authentication
- ✅ Logging chi tiết

**Usage:**
```python
from src.accounts.tasks import send_password_reset_otp_email_task

send_password_reset_otp_email_task.delay(
    user_email="user@example.com",
    user_first_name="John",
    user_last_name="Doe",
    otp_code="123456"
)
```

---

## Frontend Integration

### Example: React/Next.js

```javascript
// 1. Request OTP
const requestOTP = async (email) => {
  const response = await fetch('/api/v1/auth/password/forgot/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
  
  const data = await response.json();
  return data;
};

// 2. Verify OTP and Reset Password
const resetPassword = async (email, otp, newPassword, newPassword2) => {
  const response = await fetch('/api/v1/auth/password/reset/otp/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      otp,
      new_password: newPassword,
      new_password2: newPassword2,
    }),
  });
  
  const data = await response.json();
  return data;
};
```

### Example: Vue.js

```javascript
// 1. Request OTP
async requestOTP(email) {
  try {
    const response = await this.$axios.post('/api/v1/auth/password/forgot/', {
      email
    });
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
}

// 2. Reset Password
async resetPassword(email, otp, newPassword, newPassword2) {
  try {
    const response = await this.$axios.post('/api/v1/auth/password/reset/otp/', {
      email,
      otp,
      new_password: newPassword,
      new_password2: newPassword2,
    });
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
}
```

---

## Troubleshooting

### Email không được gửi

**Kiểm tra:**
1. Celery worker có đang chạy không?
   ```bash
   docker compose ps celery
   ```

2. Check Celery logs:
   ```bash
   docker compose logs celery | grep "password reset OTP"
   ```

3. Check email configuration trong settings:
   ```python
   EMAIL_HOST = 'smtp.gmail.com'
   EMAIL_PORT = 587
   EMAIL_USE_TLS = True
   EMAIL_HOST_USER = 'your-email@gmail.com'
   EMAIL_HOST_PASSWORD = 'your-app-password'
   ```

### OTP không được lưu vào Redis

**Kiểm tra:**
1. Redis có đang chạy không?
   ```bash
   docker compose ps redis
   ```

2. Check Redis connection:
   ```bash
   docker exec -it elearning_redis redis-cli PING
   ```

3. Check Redis keys:
   ```bash
   docker exec -it elearning_redis redis-cli
   > KEYS password_reset_otp:*
   ```

### OTP hết hạn quá nhanh

**Giải pháp:**
- Tăng timeout trong code (hiện tại 600s = 10 phút)
- File: `src/accounts/views.py`, line 362:
  ```python
  cache.set(cache_key, otp_code, timeout=600)  # Tăng lên 900 (15 phút) nếu cần
  ```

---

## Best Practices

### 1. Rate Limiting
Nên thêm rate limiting để tránh spam:
- Giới hạn số lần request OTP mỗi email (ví dụ: 3 lần/giờ)
- Giới hạn số lần verify OTP sai (ví dụ: 5 lần trước khi lock)

### 2. OTP Format
- Luôn hiển thị OTP với format rõ ràng (ví dụ: `123 456`)
- Có thể thêm copy button trong email HTML

### 3. Security
- Không log OTP vào file log
- Không gửi OTP qua SMS (chỉ email)
- Xóa OTP ngay sau khi verify thành công

### 4. UX
- Hiển thị countdown timer cho OTP expiry
- Cho phép resend OTP sau một khoảng thời gian
- Clear error messages cho user

---

## Changelog

### Version 1.0.0 (2026-01-19)
- ✅ Initial implementation
- ✅ OTP 6 số
- ✅ Email template HTML và plain text
- ✅ Celery task bất đồng bộ
- ✅ Redis storage với timeout
- ✅ One-time use OTP
- ✅ Security features đầy đủ

---

## Support

Nếu gặp vấn đề, vui lòng:
1. Check logs: `docker compose logs web celery`
2. Check Redis: `docker exec -it elearning_redis redis-cli`
3. Check email configuration trong settings
4. Liên hệ team để được hỗ trợ
