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

// Pure JS SHA-256 fallback for insecure contexts (HTTP / Wi-Fi IP access)
const sha256Fallback = (ascii) => {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i, j;
  
  const words = [];
  const asciiLength = ascii[lengthProperty] * 8;
  
  let hash = [];
  const k = [];
  let primeCounter = 0;
  
  const isPrime = (n) => {
    for (let factor = 2; factor * factor <= n; factor++) {
      if (n % factor === 0) return false;
    }
    return true;
  };
  
  let candidate = 2;
  while (primeCounter < 64) {
    if (isPrime(candidate)) {
      if (primeCounter < 8) {
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      }
      k[primeCounter] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      primeCounter++;
    }
    candidate++;
  }
  
  ascii += '\x80';
  while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return;
    words[i >> 2] |= j << (24 - (i % 4) * 8);
  }
  words[words[lengthProperty]] = ((asciiLength / maxWord) | 0);
  words[words[lengthProperty]] = (asciiLength | 0);
  
  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, j += 16);
    const oldHash = hash.slice(0);
    
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      
      const temp1 = hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + 
            ((hash[4] & hash[5]) ^ (~hash[4] & hash[6])) + k[i] + (w[i] = (i < 16 ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0));
      const temp2 = (rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + 
            ((hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]));
      
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
      hash.pop();
    }
    
    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }
  
  let hexString = '';
  for (i = 0; i < 8; i++) {
    const hex = (hash[i] >>> 0).toString(16);
    hexString += hex.padStart(8, '0');
  }
  return hexString;
};

// Helper to compute SHA256 natively or fallback
const computeSHA256 = async (message) => {
  if (window.crypto && window.crypto.subtle) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } else {
    return sha256Fallback(message);
  }
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
