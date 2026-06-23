<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <h1 class="hero-headline">Sign In</h1>
        <p class="hero-tagline">Golfbot Control Interface</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <!-- Error Alert -->
        <transition name="fade">
          <div v-if="errorMessage" class="error-alert">
            <span class="error-icon">⚠️</span>
            <span class="error-text">{{ errorMessage }}</span>
          </div>
        </transition>

        <!-- Username field -->
        <div class="input-group">
          <label for="username" class="input-label">아이디</label>
          <div class="input-wrapper">
            <input
              type="text"
              id="username"
              v-model="username"
              required
              placeholder="Username"
              class="text-input"
              :disabled="isLoading"
              autocomplete="username"
            />
          </div>
        </div>

        <!-- Password field -->
        <div class="input-group">
          <label for="password" class="input-label">비밀번호</label>
          <div class="input-wrapper">
            <input
              type="password"
              id="password"
              v-model="password"
              required
              placeholder="Password"
              class="text-input"
              :disabled="isLoading"
              autocomplete="current-password"
            />
          </div>
        </div>

        <!-- Submit Button -->
        <div class="action-group">
          <button type="submit" class="button-primary-submit" :disabled="isLoading">
            <span v-if="isLoading" class="spinner-small"></span>
            <span v-else>로그인</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useGolfbotStore } from '../stores/golfbot';

const store = useGolfbotStore();
const router = useRouter();

const username = ref('');
const password = ref('');
const errorMessage = ref('');
const isLoading = ref(false);

// Helper to compute SHA256 natively in the browser
const computeSHA256 = async (message) => {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

const handleLogin = async () => {
  if (isLoading.value) return;
  isLoading.value = true;
  errorMessage.value = '';

  try {
    // 1. Hash password locally with SHA256 before transmission
    const passwordHash = await computeSHA256(password.value);
    
    // 2. Call login store action
    const result = await store.login(username.value, passwordHash);
    
    if (result.success) {
      // Clear password inputs
      password.value = '';
      router.push({ name: 'dashboard' });
    } else {
      errorMessage.value = result.message;
    }
  } catch (error) {
    console.error('Login action failed:', error);
    errorMessage.value = '로그인 중 네트워크 에러가 발생했습니다.';
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-canvas-parchment);
  padding: var(--space-xl);
}

.login-card {
  background-color: var(--color-canvas);
  border: 1px solid var(--color-divider-soft);
  border-radius: var(--radius-lg);
  padding: 48px var(--space-xl);
  max-width: 440px;
  width: 100%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.3s ease;
}

.login-header {
  text-align: center;
  margin-bottom: var(--space-xl);
}

.hero-headline {
  font: var(--text-hero-display);
  font-size: 34px;
  letter-spacing: var(--track-display-md);
  margin-bottom: var(--space-xxs);
  color: var(--color-ink);
}

.hero-tagline {
  font: var(--text-caption);
  color: var(--color-ink-muted-48);
  margin: 0;
}

.login-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.error-alert {
  background-color: rgba(255, 59, 48, 0.08);
  border: 1px solid rgba(255, 59, 48, 0.15);
  border-radius: var(--radius-sm);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.error-icon {
  font-size: 16px;
  color: #ff3b30;
}

.error-text {
  font: var(--text-caption);
  color: #ff3b30;
  font-weight: 500;
  line-height: 1.3;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-xxs);
  width: 100%;
}

.input-label {
  font: var(--text-caption-strong);
  color: var(--color-ink-muted-80);
}

.input-wrapper {
  position: relative;
  width: 100%;
}

.text-input {
  width: 100%;
  background-color: var(--color-canvas);
  color: var(--color-ink);
  font: var(--text-body);
  font-size: 15px;
  border: 1px solid var(--color-divider-soft);
  border-radius: var(--radius-pill);
  padding: 12px var(--space-md);
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.text-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.15);
}

.text-input:disabled {
  background-color: var(--color-surface-pearl);
  color: var(--color-ink-muted-48);
  cursor: not-allowed;
}

.action-group {
  margin-top: var(--space-xs);
  width: 100%;
}

.button-primary-submit {
  width: 100%;
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  font: var(--text-body-strong);
  font-size: 16px;
  border-radius: var(--radius-pill);
  padding: 12px var(--space-md);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s ease, background-color 0.2s ease;
}

.button-primary-submit:active:not(:disabled) {
  transform: scale(0.95);
}

.button-primary-submit:hover:not(:disabled) {
  background-color: var(--color-primary-focus);
}

.button-primary-submit:disabled {
  background-color: var(--color-surface-chip-translucent);
  color: var(--color-ink-muted-48);
  cursor: not-allowed;
}

/* Spinner small */
.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
