<script setup lang="ts">
import { notification } from 'ant-design-vue'

const { forgotPasswordOTP, resetPasswordOTP } = useAuth()
const { t } = useI18n()

definePageMeta({
  layout: 'auth',
  middleware: 'guest',
})

const step = ref<'email' | 'otp' | 'success'>('email')
const loading = ref(false)
const resendLoading = ref(false)
const resendCooldown = ref(0)

const formState = reactive({
  email: '',
  otp: '',
  new_password: '',
  new_password2: '',
})

const validationErrors = ref<Record<string, string[]>>({})
const generalError = ref<string>('')

// Countdown timer for resend OTP
let countdownInterval: NodeJS.Timeout | null = null

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
})

function startResendCooldown() {
  resendCooldown.value = 60 // 60 seconds cooldown
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
  countdownInterval = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0) {
      if (countdownInterval) {
        clearInterval(countdownInterval)
        countdownInterval = null
      }
    }
  }, 1000)
}

// Watch email changes to clear errors
watch(() => formState.email, () => {
  if (validationErrors.value.email) {
    delete validationErrors.value.email
  }
  generalError.value = ''
})

// Watch OTP changes to clear errors
watch(() => formState.otp, () => {
  if (validationErrors.value.otp) {
    delete validationErrors.value.otp
  }
  generalError.value = ''
})

// Watch password changes to clear errors
watch(() => formState.new_password, () => {
  if (validationErrors.value.new_password) {
    delete validationErrors.value.new_password
  }
})

watch(() => formState.new_password2, () => {
  if (validationErrors.value.new_password2) {
    delete validationErrors.value.new_password2
  }
})

async function requestOTP() {
  loading.value = true
  validationErrors.value = {}
  generalError.value = ''

  try {
    const result = await forgotPasswordOTP(formState.email.toLowerCase())

    if (result.success) {
      step.value = 'otp'
      startResendCooldown()
      notification.success({
        message: t('auth.forgotPassword.notifications.otpSent') || 'OTP code has been sent to your email address.',
      })
    }
    else {
      // Handle validation errors
      if (result.errorCode === 'validation_error' && result.errorData?.details) {
        validationErrors.value = result.errorData.details
        generalError.value = result.error || t('auth.forgotPassword.notifications.otpFailed')
      }
      else {
        generalError.value = result.error || t('auth.forgotPassword.notifications.otpFailed')
      }
    }
  }
  catch (error: any) {
    console.error('Request OTP error:', error)
    
    if (error?.data?.code === 'validation_error' && error?.data?.details) {
      validationErrors.value = error.data.details
      generalError.value = error.data?.message || t('auth.forgotPassword.notifications.otpFailed')
    }
    else {
      generalError.value = error?.data?.message || error?.statusMessage || t('auth.forgotPassword.notifications.otpFailed')
    }
  }
  finally {
    loading.value = false
  }
}

async function resendOTP() {
  if (resendCooldown.value > 0) {
    return
  }

  resendLoading.value = true
  validationErrors.value = {}
  generalError.value = ''

  try {
    const result = await forgotPasswordOTP(formState.email.toLowerCase())

    if (result.success) {
      startResendCooldown()
      notification.success({
        message: t('auth.forgotPassword.notifications.otpResent') || 'OTP code has been resent to your email address.',
      })
    }
    else {
      if (result.errorCode === 'validation_error' && result.errorData?.details) {
        validationErrors.value = result.errorData.details
        generalError.value = result.error || t('auth.forgotPassword.notifications.otpFailed')
      }
      else {
        generalError.value = result.error || t('auth.forgotPassword.notifications.otpFailed')
      }
    }
  }
  catch (error: any) {
    console.error('Resend OTP error:', error)
    generalError.value = error?.data?.message || error?.statusMessage || t('auth.forgotPassword.notifications.otpFailed')
  }
  finally {
    resendLoading.value = false
  }
}

async function resetPassword() {
  // Validate password length
  if (formState.new_password.length < 8) {
    notification.error({
      message: t('auth.forgotPassword.notifications.passwordMinLength') || 'Password must be at least 8 characters long.',
    })
    return
  }

  // Validate passwords match
  if (formState.new_password !== formState.new_password2) {
    notification.error({
      message: t('auth.forgotPassword.notifications.passwordMismatch') || 'Passwords do not match.',
    })
    return
  }

  loading.value = true
  validationErrors.value = {}
  generalError.value = ''

  try {
    const result = await resetPasswordOTP({
      email: formState.email.toLowerCase(),
      otp: formState.otp,
      new_password: formState.new_password,
      new_password2: formState.new_password2,
    })

    if (result.success) {
      step.value = 'success'
      notification.success({
        message: t('auth.forgotPassword.notifications.resetSuccess') || 'Your password has been reset successfully.',
      })
      
      // Redirect to login after 3 seconds
      setTimeout(async () => {
        await navigateTo('/auth/login')
      }, 3000)
    }
    else {
      // Handle different error codes
      if (result.errorCode === 'otp_expired') {
        generalError.value = result.error || t('auth.forgotPassword.notifications.otpExpired') || 'The OTP code has expired. Please request a new OTP code.'
      }
      else if (result.errorCode === 'invalid_otp') {
        generalError.value = result.error || t('auth.forgotPassword.notifications.invalidOtp') || 'The OTP code is incorrect. Please check and try again.'
      }
      else if (result.errorCode === 'email_mismatch') {
        generalError.value = result.error || t('auth.forgotPassword.notifications.emailMismatch') || 'Email does not match. Please use the same email you requested the OTP for.'
      }
      else if (result.errorCode === 'validation_error' && result.errorData?.details) {
        validationErrors.value = result.errorData.details
        generalError.value = result.error || t('auth.forgotPassword.notifications.resetFailed')
      }
      else {
        generalError.value = result.error || t('auth.forgotPassword.notifications.resetFailed')
      }
    }
  }
  catch (error: any) {
    console.error('Reset password error:', error)
    
    if (error?.data?.code === 'otp_expired') {
      generalError.value = error.data?.message || t('auth.forgotPassword.notifications.otpExpired') || 'The OTP code has expired. Please request a new OTP code.'
    }
    else if (error?.data?.code === 'invalid_otp') {
      generalError.value = error.data?.message || t('auth.forgotPassword.notifications.invalidOtp') || 'The OTP code is incorrect. Please check and try again.'
    }
    else if (error?.data?.code === 'email_mismatch') {
      generalError.value = error.data?.message || t('auth.forgotPassword.notifications.emailMismatch') || 'Email does not match. Please use the same email you requested the OTP for.'
    }
    else if (error?.data?.code === 'validation_error' && error?.data?.details) {
      validationErrors.value = error.data.details
      generalError.value = error.data?.message || t('auth.forgotPassword.notifications.resetFailed')
    }
    else {
      generalError.value = error?.data?.message || error?.statusMessage || t('auth.forgotPassword.notifications.resetFailed')
    }
  }
  finally {
    loading.value = false
  }
}

function goBack() {
  if (step.value === 'otp') {
    step.value = 'email'
    formState.otp = ''
    formState.new_password = ''
    formState.new_password2 = ''
    validationErrors.value = {}
    generalError.value = ''
  }
  else if (step.value === 'email') {
    navigateTo('/auth/login')
  }
}

// Format OTP input (6 digits)
function formatOTP(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6)
}

watch(() => formState.otp, (newValue) => {
  formState.otp = formatOTP(newValue)
})
</script>

<template>
  <div class="flex flex-col lg:flex-row items-stretch min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
    <!-- Form Section -->
    <div class="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-6 lg:px-12 py-8 lg:py-12">
      <div class="w-full max-w-md">
        <!-- Success Step -->
        <div v-if="step === 'success'" class="text-center">
          <div class="inline-block p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-3xl shadow-lg mb-6">
            <Icon name="solar:check-circle-bold" size="64" class="text-white" />
          </div>
          <h1 class="text-gray-900 dark:text-white text-3xl sm:text-4xl font-bold mb-2">
            {{ t('auth.forgotPassword.success.title') || 'Password Reset Successful!' }}
          </h1>
          <p class="text-gray-600 dark:text-gray-400 text-base mb-8">
            {{ t('auth.forgotPassword.success.message') || 'Your password has been reset successfully. Redirecting to login...' }}
          </p>
          <a-button
            type="primary"
            class="!h-12 !rounded-xl !flex !items-center !justify-center text-base font-semibold !bg-gradient-to-r !from-green-500 !to-green-600 hover:!from-green-600 hover:!to-green-700 !border-0 shadow-lg hover:shadow-xl transition-all"
            @click="navigateTo('/auth/login')"
          >
            {{ t('auth.forgotPassword.success.goToLogin') || 'Go to Login' }}
            <Icon class="ml-2 text-lg" name="solar:arrow-right-bold" />
          </a-button>
        </div>

        <!-- Email and OTP Steps -->
        <a-form
          v-else
          :model="formState"
          name="forgot-password"
          autocomplete="off"
          layout="vertical"
          class="space-y-6"
          @finish="step === 'email' ? requestOTP() : resetPassword()"
        >
          <!-- Logo & Header -->
          <div class="text-center mb-8">
            <div class="inline-block p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-3xl shadow-lg mb-6">
              <Icon name="solar:lock-password-unlocked-bold" size="64" class="text-white" />
            </div>
            <h1 class="text-gray-900 dark:text-white text-3xl sm:text-4xl font-bold mb-2">
              {{ step === 'email' ? t('auth.forgotPassword.form.title') : t('auth.forgotPassword.form.resetTitle') }}
            </h1>
            <p class="text-gray-600 dark:text-gray-400 text-base">
              {{ step === 'email' ? t('auth.forgotPassword.form.subtitle') : t('auth.forgotPassword.form.resetSubtitle') }}
            </p>
          </div>

          <!-- Validation Errors Display -->
          <div v-if="Object.keys(validationErrors).length > 0 || generalError" class="mb-4">
            <a-alert
              type="error"
              :message="generalError || t('auth.forgotPassword.validation.errors')"
              show-icon
              class="!rounded-xl"
            >
              <template #description v-if="Object.keys(validationErrors).length > 0">
                <ul class="list-disc list-inside mt-2 space-y-1">
                  <li v-for="(errors, field) in validationErrors" :key="field">
                    <span class="font-semibold capitalize">{{ field }}:</span>
                    <span v-for="(error, index) in errors" :key="index">
                      {{ error }}<span v-if="index < errors.length - 1">, </span>
                    </span>
                  </li>
                </ul>
              </template>
            </a-alert>
          </div>

          <!-- Email Input Step -->
          <div v-if="step === 'email'" class="space-y-4">
            <a-form-item
              :label="t('auth.forgotPassword.form.email')"
              name="email"
              :rules="[
                { required: true, message: t('auth.forgotPassword.form.emailRequired') },
                { type: 'email', message: t('auth.forgotPassword.form.emailInvalid') }
              ]"
              :validate-status="validationErrors.email ? 'error' : ''"
              :help="validationErrors.email ? validationErrors.email.join(', ') : ''"
              class="mb-0"
            >
              <a-input
                v-model:value="formState.email"
                size="large"
                placeholder="email@example.com"
                class="!h-12 !rounded-xl"
              >
                <template #prefix>
                  <Icon name="solar:letter-bold" size="20" class="text-gray-400" />
                </template>
              </a-input>
            </a-form-item>

            <!-- Submit Button -->
            <a-button
              type="primary"
              class="w-full !h-12 !rounded-xl !flex !items-center !justify-center text-base font-semibold !bg-gradient-to-r !from-green-500 !to-green-600 hover:!from-green-600 hover:!to-green-700 !border-0 shadow-lg hover:shadow-xl transition-all"
              html-type="submit"
              :loading="loading"
              :disabled="loading"
            >
              <span v-if="!loading">{{ t('auth.forgotPassword.form.sendButton') }}</span>
              <Icon v-if="!loading" class="ml-2 text-lg" name="solar:arrow-right-bold" />
            </a-button>
          </div>

          <!-- OTP and Password Reset Step -->
          <div v-else-if="step === 'otp'" class="space-y-4">
            <!-- Email Display -->
            <div class="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div class="flex items-center gap-2 text-sm text-gray-600">
                <Icon name="solar:letter-bold" size="16" />
                <span>{{ formState.email }}</span>
                <a-button
                  type="link"
                  size="small"
                  class="!p-0 !h-auto ml-auto"
                  @click="goBack"
                >
                  {{ t('auth.forgotPassword.form.changeEmail') || 'Change' }}
                </a-button>
              </div>
            </div>

            <!-- OTP Input -->
            <a-form-item
              :label="t('auth.forgotPassword.form.otp')"
              name="otp"
              :rules="[
                { required: true, message: t('auth.forgotPassword.form.otpRequired') },
                { len: 6, message: t('auth.forgotPassword.form.otpLength') }
              ]"
              :validate-status="validationErrors.otp ? 'error' : ''"
              :help="validationErrors.otp ? validationErrors.otp.join(', ') : ''"
              class="mb-0"
            >
              <a-input
                v-model:value="formState.otp"
                size="large"
                :placeholder="t('auth.forgotPassword.form.otpPlaceholder') || 'Enter 6-digit OTP'"
                class="!h-12 !rounded-xl text-center text-2xl font-mono tracking-widest"
                maxlength="6"
              >
                <template #prefix>
                  <Icon name="solar:shield-check-bold" size="20" class="text-gray-400" />
                </template>
              </a-input>
            </a-form-item>

            <!-- Resend OTP -->
            <div class="text-center">
              <span class="text-sm text-gray-600 mr-2">{{ t('auth.forgotPassword.form.didntReceiveOtp') || "Didn't receive OTP?" }}</span>
              <a-button
                type="link"
                size="small"
                :loading="resendLoading"
                :disabled="resendCooldown > 0"
                class="!p-0 !h-auto"
                @click="resendOTP"
              >
                {{ resendCooldown > 0 ? `${t('auth.forgotPassword.form.resendIn') || 'Resend in'} ${resendCooldown}s` : (t('auth.forgotPassword.form.resendOtp') || 'Resend OTP') }}
              </a-button>
            </div>

            <!-- New Password -->
            <a-form-item
              :label="t('auth.forgotPassword.form.newPassword')"
              name="new_password"
              :rules="[
                { required: true, message: t('auth.forgotPassword.form.newPasswordRequired') },
                { min: 8, message: t('auth.forgotPassword.form.passwordMinLength') }
              ]"
              :validate-status="validationErrors.new_password ? 'error' : ''"
              :help="validationErrors.new_password ? validationErrors.new_password.join(', ') : ''"
              class="mb-0"
            >
              <a-input-password
                v-model:value="formState.new_password"
                :placeholder="t('auth.forgotPassword.form.newPasswordPlaceholder')"
                size="large"
                class="!h-12 !rounded-xl"
              >
                <template #prefix>
                  <Icon name="solar:lock-password-bold" size="20" class="text-gray-400" />
                </template>
              </a-input-password>
            </a-form-item>

            <!-- Confirm Password -->
            <a-form-item
              :label="t('auth.forgotPassword.form.confirmPassword')"
              name="new_password2"
              :rules="[
                { required: true, message: t('auth.forgotPassword.form.confirmPasswordRequired') },
                { min: 8, message: t('auth.forgotPassword.form.passwordMinLength') }
              ]"
              :validate-status="validationErrors.new_password2 ? 'error' : ''"
              :help="validationErrors.new_password2 ? validationErrors.new_password2.join(', ') : ''"
              class="mb-0"
            >
              <a-input-password
                v-model:value="formState.new_password2"
                :placeholder="t('auth.forgotPassword.form.confirmPasswordPlaceholder')"
                size="large"
                class="!h-12 !rounded-xl"
              >
                <template #prefix>
                  <Icon name="solar:shield-check-bold" size="20" class="text-gray-400" />
                </template>
              </a-input-password>
            </a-form-item>

            <!-- Submit Button -->
            <a-button
              type="primary"
              class="w-full !h-12 !rounded-xl !flex !items-center !justify-center text-base font-semibold !bg-gradient-to-r !from-green-500 !to-green-600 hover:!from-green-600 hover:!to-green-700 !border-0 shadow-lg hover:shadow-xl transition-all"
              html-type="submit"
              :loading="loading"
              :disabled="loading"
            >
              <span v-if="!loading">{{ t('auth.forgotPassword.form.resetButton') }}</span>
              <Icon v-if="!loading" class="ml-2 text-lg" name="solar:arrow-right-bold" />
            </a-button>
          </div>

          <!-- Back Button -->
          <div class="text-center mt-6">
            <a-button
              type="text"
              class="!text-gray-600 !flex items-center justify-center hover:!text-green-600 font-semibold transition-colors !p-0 !h-auto"
              @click="goBack"
            >
              <Icon name="solar:arrow-left-bold" size="18" class="mr-2" />
              {{ step === 'email' ? t('auth.forgotPassword.form.backToLogin') : t('auth.forgotPassword.form.backToEmail') }}
            </a-button>
          </div>

          <!-- Help Text -->
          <div v-if="step === 'email'" class="text-center p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div class="flex items-start gap-3">
              <Icon name="solar:info-circle-bold" size="20" class="text-blue-600 mt-0.5" />
              <div class="text-sm text-gray-700 text-left">
                <p class="font-semibold mb-1">{{ t('auth.forgotPassword.form.helpTitle') }}</p>
                <p class="text-gray-600">{{ t('auth.forgotPassword.form.helpText') }}</p>
              </div>
            </div>
          </div>

          <!-- OTP Help Text -->
          <div v-else-if="step === 'otp'" class="text-center p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div class="flex items-start gap-3">
              <Icon name="solar:info-circle-bold" size="20" class="text-blue-600 mt-0.5" />
              <div class="text-sm text-gray-700 text-left">
                <p class="font-semibold mb-1">{{ t('auth.forgotPassword.form.otpHelpTitle') || 'Check Your Email' }}</p>
                <p class="text-gray-600">{{ t('auth.forgotPassword.form.otpHelpText') || 'We sent a 6-digit OTP code to your email. The code will expire in 10 minutes.' }}</p>
              </div>
            </div>
          </div>
        </a-form>
      </div>
    </div>

    <!-- Image Section -->
    <div class="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-green-500 to-green-700 items-center justify-center p-12">
      <div class="absolute inset-0 opacity-10">
        <div class="absolute top-10 right-10 w-72 h-72 bg-white rounded-full blur-3xl" />
        <div class="absolute bottom-10 left-10 w-96 h-96 bg-white rounded-full blur-3xl" />
      </div>

      <div class="relative z-10 text-white max-w-lg">
        <div class="mb-8">
          <Icon name="solar:shield-check-bold" size="64" class="text-white/90 mb-6" />
          <h2 class="text-4xl font-bold mb-4">
            {{ t('auth.forgotPassword.hero.title') }}
          </h2>
          <p class="text-lg text-white/90 leading-relaxed">
            {{ t('auth.forgotPassword.hero.description') }}
          </p>
        </div>

        <!-- Security Tips -->
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-white/20 rounded-lg backdrop-blur">
              <Icon name="solar:check-circle-bold" size="24" />
            </div>
            <span class="text-white/90">{{ t('auth.forgotPassword.securityTips.strongPassword') }}</span>
          </div>
          <div class="flex items-center gap-3">
            <div class="p-2 bg-white/20 rounded-lg backdrop-blur">
              <Icon name="solar:check-circle-bold" size="24" />
            </div>
            <span class="text-white/90">{{ t('auth.forgotPassword.securityTips.dontShare') }}</span>
          </div>
          <div class="flex items-center gap-3">
            <div class="p-2 bg-white/20 rounded-lg backdrop-blur">
              <Icon name="solar:check-circle-bold" size="24" />
            </div>
            <span class="text-white/90">{{ t('auth.forgotPassword.securityTips.twoFactor') }}</span>
          </div>
        </div>

        <!-- Support -->
        <div class="mt-12 p-6 bg-white/10 rounded-2xl backdrop-blur border border-white/20">
          <div class="flex items-start gap-3">
            <Icon name="solar:question-circle-bold" size="24" class="text-white/90 mt-1" />
            <div>
              <h3 class="font-semibold text-lg mb-2">{{ t('auth.forgotPassword.support.title') }}</h3>
              <p class="text-sm text-white/80 mb-3">
                {{ t('auth.forgotPassword.support.description') }}
              </p>
              <a href="#" class="text-sm font-semibold text-white underline hover:text-white/80 transition-colors">
                {{ t('auth.forgotPassword.support.contactLink') }}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom input styles */
:deep(.ant-input-affix-wrapper) {
  border-radius: 0.75rem;
}

:deep(.ant-input) {
  border-radius: 0.75rem;
}

:deep(.ant-form-item-label > label) {
  font-weight: 600;
  color: #374151;
}

/* Smooth transitions */
button, a {
  transition: all 0.2s ease;
}
</style>
