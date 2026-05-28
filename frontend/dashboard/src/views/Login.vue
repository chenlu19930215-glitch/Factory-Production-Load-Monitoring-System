<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { setToken, setUser } from '../utils/auth.js'

const router = useRouter()

const username = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

// 修改密码
const showChangePwd = ref(false)
const cpUsername = ref('')
const cpOldPwd = ref('')
const cpNewPwd = ref('')
const cpConfirmPwd = ref('')
const cpLoading = ref(false)
const cpError = ref('')
const cpSuccess = ref(false)

function openChangePwd() {
  cpUsername.value = ''
  cpOldPwd.value = ''
  cpNewPwd.value = ''
  cpConfirmPwd.value = ''
  cpError.value = ''
  cpSuccess.value = false
  showChangePwd.value = true
}

async function handleChangePwd() {
  cpError.value = ''
  cpSuccess.value = false

  if (!cpUsername.value || !cpOldPwd.value || !cpNewPwd.value || !cpConfirmPwd.value) {
    cpError.value = '请填写所有字段'
    return
  }
  if (cpNewPwd.value.length < 6) {
    cpError.value = '新密码至少6位'
    return
  }
  if (/^\d+$/.test(cpNewPwd.value)) {
    cpError.value = '密码不能为纯数字，请包含字母或符号'
    return
  }
  if (cpNewPwd.value !== cpConfirmPwd.value) {
    cpError.value = '两次输入的新密码不一致'
    return
  }

  cpLoading.value = true
  try {
    const { data: resp } = await axios.post('/api/auth/change-password', {
      username: cpUsername.value,
      oldPassword: cpOldPwd.value,
      newPassword: cpNewPwd.value,
      confirmPassword: cpConfirmPwd.value,
    })
    if (resp.code === 0) {
      cpSuccess.value = true
      cpError.value = ''
    } else {
      cpError.value = resp.msg || '修改失败'
    }
  } catch (err) {
    cpError.value = err.response?.data?.msg || '网络错误，请重试'
  } finally {
    cpLoading.value = false
  }
}

async function handleLogin() {
  if (!username.value || !password.value) {
    errorMsg.value = '请输入用户名和密码'
    return
  }

  loading.value = true
  errorMsg.value = ''

  try {
    const { data: resp } = await axios.post('/api/auth/login', {
      username: username.value,
      password: password.value,
    })

    if (resp.code === 0) {
      setToken(resp.data.token)
      setUser({ username: resp.data.username })
      router.replace('/overview')
    } else {
      errorMsg.value = resp.msg || '登录失败'
    }
  } catch (err) {
    errorMsg.value = err.response?.data?.msg || '网络错误，请重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <svg class="login-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
        <h1 class="login-title">一家园工厂生产负载系统</h1>
        <p class="login-desc">请登录后查看生产数据</p>
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="form-group">
          <label class="form-label" for="username">用户名</label>
          <input
            id="username"
            v-model="username"
            type="text"
            class="form-input"
            placeholder="请输入用户名"
            autocomplete="username"
          />
        </div>
        <div class="form-group">
          <label class="form-label" for="password">密码</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="form-input"
            placeholder="请输入密码"
            autocomplete="current-password"
          />
        </div>

        <p v-if="errorMsg" class="form-error">{{ errorMsg }}</p>

        <button type="submit" class="login-btn" :disabled="loading">
          {{ loading ? '登录中...' : '登 录' }}
        </button>
      </form>

      <div class="login-footer">
        <button type="button" class="change-pwd-link" @click="openChangePwd">修改密码</button>
      </div>
    </div>

    <!-- 修改密码弹窗 -->
    <Teleport to="body">
      <div v-if="showChangePwd" class="dialog-overlay" @click.self="showChangePwd = false">
        <div class="dialog-card">
          <h2 class="dialog-title">🔒 修改密码</h2>

          <div class="dialog-form">
            <div class="form-group">
              <label class="form-label">用户名</label>
              <input
                v-model="cpUsername"
                type="text"
                class="form-input"
                placeholder="请输入用户名"
                autocomplete="off"
              />
            </div>
            <div class="form-group">
              <label class="form-label">原密码</label>
              <input
                v-model="cpOldPwd"
                type="password"
                class="form-input"
                placeholder="请输入原密码"
                autocomplete="off"
              />
            </div>
            <div class="form-group">
              <label class="form-label">新密码</label>
              <input
                v-model="cpNewPwd"
                type="password"
                class="form-input"
                placeholder="请输入新密码"
                autocomplete="off"
              />
            </div>
            <div class="form-group">
              <label class="form-label">确认新密码</label>
              <input
                v-model="cpConfirmPwd"
                type="password"
                class="form-input"
                placeholder="请再次输入新密码"
                autocomplete="off"
              />
            </div>

            <p class="form-hint">密码规则：至少6位，不能为纯数字</p>
            <p v-if="cpError" class="form-error">{{ cpError }}</p>
            <p v-if="cpSuccess" class="form-success">✅ 密码修改成功，请使用新密码登录</p>

            <div class="dialog-actions">
              <button type="button" class="dialog-btn dialog-btn-cancel" @click="showChangePwd = false">
                取消
              </button>
              <button
                type="button"
                class="dialog-btn dialog-btn-confirm"
                :disabled="cpLoading"
                @click="handleChangePwd"
              >
                {{ cpLoading ? '修改中...' : '确认修改' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0F1B3D 0%, #1E40AF 50%, #2563EB 100%);
}

.login-card {
  width: 400px;
  background: #fff;
  border-radius: 12px;
  padding: 40px 36px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-icon {
  width: 40px;
  height: 40px;
  color: #1E40AF;
  margin-bottom: 12px;
}

.login-title {
  font-size: 20px;
  font-weight: 600;
  color: #1E293B;
  margin: 0 0 6px 0;
}

.login-desc {
  font-size: 14px;
  color: #94A3B8;
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #475569;
}

.form-input {
  padding: 10px 14px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 14px;
  color: #1E293B;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input::placeholder {
  color: #CBD5E1;
}

.form-input:focus {
  border-color: #3B82F6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.form-error {
  font-size: 13px;
  color: #EF4444;
  margin: 0;
  text-align: center;
}

.login-btn {
  padding: 12px;
  background: linear-gradient(135deg, #1E40AF, #2563EB);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.login-btn:hover {
  opacity: 0.9;
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-footer {
  text-align: center;
  margin-top: 16px;
}

.change-pwd-link {
  background: none;
  border: none;
  font-size: 13px;
  color: #3B82F6;
  cursor: pointer;
  padding: 4px 8px;
  transition: color 0.2s;
}

.change-pwd-link:hover {
  color: #1E40AF;
  text-decoration: underline;
}

/* 弹窗遮罩 */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-card {
  width: 380px;
  background: #fff;
  border-radius: 12px;
  padding: 32px 28px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25);
}

.dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: #1E293B;
  margin: 0 0 24px;
  text-align: center;
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-hint {
  font-size: 12px;
  color: #94A3B8;
  margin: 0;
  text-align: center;
}

.form-success {
  font-size: 13px;
  color: #16A34A;
  margin: 0;
  text-align: center;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  margin-top: 4px;
}

.dialog-btn {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: opacity 0.2s;
}

.dialog-btn-cancel {
  background: #F1F5F9;
  color: #64748B;
}

.dialog-btn-cancel:hover {
  background: #E2E8F0;
}

.dialog-btn-confirm {
  background: #1E40AF;
  color: #fff;
}

.dialog-btn-confirm:hover {
  opacity: 0.9;
}

.dialog-btn-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
