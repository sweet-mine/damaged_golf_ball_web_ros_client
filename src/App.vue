<template>
  <div class="apple-dashboard">
    <!-- Global Nav -->
    <nav class="global-nav">
      <div class="nav-content">
        <span class="nav-brand">FastAPI ROS 2 대시보드</span>
        
        <!-- Navigation Links -->
        <div class="nav-links">
          <router-link to="/" class="nav-link" active-class="active">대시보드</router-link>
          <router-link to="/history" class="nav-link" active-class="active">파손 이력</router-link>
        </div>

        <div class="nav-status">
          <span class="status-indicator" :class="{ 'is-connected': store.isConnected }"></span>
          {{ store.isConnected ? 'Robot Connected' : 'Robot Disconnected' }}
        </div>
      </div>
    </nav>

    <!-- Notification Banner -->
    <transition name="slide-down">
      <div v-if="store.brokenBallNotification" class="notification-banner clickable" @click="handleNotificationClick">
        <div class="notification-content">
          <span class="notification-icon">⚠️</span>
          <div class="notification-text">
            <strong class="notification-title">깨진 골프공 검출 (자세히 보기)</strong>
            <p class="notification-desc">위치: {{ getRoomName(store.brokenBallNotification.location) }}</p>
          </div>
        </div>
        <button class="button-icon-circular small" @click.stop="store.brokenBallNotification = null">×</button>
      </div>
    </transition>

    <!-- Main View Section -->
    <main class="main-content-area">
      <router-view />
    </main>
    
    <!-- Global Footer -->
    <footer class="footer">
      <p>Golfbot Control Interface</p>
    </footer>
  </div>

  <!-- Global Premium Image Detail Modal -->
  <div class="modal-overlay" v-if="store.activeModalBall" @click.self="store.activeModalBall = null">
    <div class="modal-content image-detail-modal" :class="'room-border-' + getRoomNumber(store.activeModalBall.location)">
      <div class="modal-header">
        <h2 class="card-title">파손 골프공 상세 정보 (#{{ store.activeModalBall.id }})</h2>
        <button class="button-icon-circular" @click="store.activeModalBall = null">×</button>
      </div>
      <div class="modal-body image-modal-body">
        <div class="detail-image-container">
          <img 
            v-if="store.activeModalBall.image" 
            :src="store.activeModalBall.image" 
            alt="Broken Golf Ball" 
            class="detail-image" 
          />
          <div v-else class="no-image-placeholder">
            <span class="placeholder-icon">📸</span>
            <p>송신된 이미지가 없습니다.</p>
          </div>
        </div>
        <div class="detail-info-grid">
          <div class="detail-info-row">
            <span class="detail-label">검출 일시</span>
            <span class="detail-value">{{ store.activeModalBall.timestamp }}</span>
          </div>
          <div class="detail-info-row">
            <span class="detail-label">검출 위치</span>
            <span class="room-badge" :class="'room-' + getRoomNumber(store.activeModalBall.location)">
              {{ getRoomName(store.activeModalBall.location) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Global Floating AI Chat -->
  <FloatingChat />
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { useGolfbotStore } from './stores/golfbot';
import FloatingChat from './components/FloatingChat.vue';

const store = useGolfbotStore();

onMounted(() => {
  store.connectWebSocket();
});

onUnmounted(() => {
  store.disconnectWebSocket();
});

const handleNotificationClick = () => {
  if (store.brokenBallNotification) {
    store.activeModalBall = store.brokenBallNotification;
    store.brokenBallNotification = null;
  }
};

const getRoomNumber = (location) => {
  if (location && typeof location === 'object' && 'room' in location) {
    return location.room;
  }
  return 'unknown';
};

const getRoomName = (location) => {
  if (location && typeof location === 'object' && 'room' in location) {
    const roomNum = location.room;
    if (roomNum >= 1 && roomNum <= 4) {
      return `${roomNum}번 방`;
    }
  }
  try {
    return JSON.stringify(location);
  } catch (e) {
    return location;
  }
};
</script>

<style>
/* Global variables are set in assets/main.css, we just style core shell layout here */

.apple-dashboard {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Global Nav */
.global-nav {
  background-color: var(--color-surface-black);
  color: var(--color-on-dark);
  font: var(--text-nav-link);
  letter-spacing: var(--track-nav-link);
  height: 48px;
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-content {
  width: 100%;
  max-width: 1200px;
  padding: 0 var(--space-xl);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-brand {
  font-weight: 600;
  font-size: 14px;
}

/* Navigation Links */
.nav-links {
  display: flex;
  gap: var(--space-md);
  align-items: center;
}

.nav-link {
  color: var(--color-body-muted);
  text-decoration: none;
  font: var(--text-nav-link);
  font-size: 13px;
  letter-spacing: var(--track-nav-link);
  transition: color 0.2s ease;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
}

.nav-link:hover {
  color: var(--color-on-dark);
}

.nav-link.active {
  color: var(--color-on-dark);
  background-color: rgba(255, 255, 255, 0.1);
  font-weight: 600;
}

/* Status Indicator */
.nav-status {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  color: var(--color-body-muted);
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background-color: var(--color-ink-muted-48);
}
.status-indicator.is-connected {
  background-color: #34c759; /* Apple's system green for true connection status */
}

/* Main Content Area */
.main-content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Footer */
.footer {
  background-color: var(--color-canvas-parchment);
  color: var(--color-ink-muted-48);
  font: var(--text-fine-print);
  padding: 48px var(--space-xl);
  text-align: center;
  border-top: 1px solid var(--color-divider-soft);
}

.button-icon-circular {
  background-color: var(--color-surface-chip-translucent);
  color: var(--color-ink);
  border-radius: var(--radius-full);
  width: 44px;
  height: 44px;
  border: none;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.button-icon-circular.small {
  width: 28px;
  height: 28px;
  font-size: 16px;
  background-color: transparent;
}

/* Notification Banner */
.notification-banner {
  position: fixed;
  top: 64px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--color-divider-soft);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  border-radius: var(--radius-lg);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  z-index: 1000;
  width: auto;
  min-width: 320px;
  max-width: 90%;
  transition: transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.2s ease, background-color 0.2s ease;
}

.notification-banner.clickable {
  cursor: pointer;
}

.notification-banner.clickable:hover {
  background-color: rgba(255, 255, 255, 0.95);
  transform: translate(-50%, -2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.notification-content {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.notification-icon {
  font-size: 20px;
}

.notification-text {
  display: flex;
  flex-direction: column;
}

.notification-title {
  font: var(--text-body-strong);
  letter-spacing: var(--track-body-strong);
  color: #ff3b30; /* Apple red for alert */
}

.notification-desc {
  font: var(--text-caption);
  letter-spacing: var(--track-caption);
  color: var(--color-ink-muted-80);
  margin: 0;
}

/* Vue Transitions */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px);
}

/* Global Modal Overlay & Content Layout */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  box-shadow: var(--shadow-product);
  display: flex;
  flex-direction: column;
  background-color: var(--color-canvas);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-lg);
  width: 100%;
}

/* Image Detail Modal Specifics */
.image-detail-modal {
  max-width: 480px;
  width: 90%;
  border-top: 5px solid var(--color-divider-soft);
  transition: border-color 0.3s ease;
}

.image-detail-modal.room-border-1 { border-top-color: #0066cc; }
.image-detail-modal.room-border-2 { border-top-color: #34c759; }
.image-detail-modal.room-border-3 { border-top-color: #ff9500; }
.image-detail-modal.room-border-4 { border-top-color: #af52de; }

.image-modal-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  align-items: center;
  width: 100%;
}

.detail-image-container {
  width: 320px;
  height: 320px;
  background-color: var(--color-surface-pearl);
  border: 1px solid var(--color-divider-soft);
  border-radius: var(--radius-lg);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
}

.detail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.no-image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--color-ink-muted-48);
  gap: var(--space-xs);
}

.placeholder-icon {
  font-size: 48px;
}

.detail-info-grid {
  width: 100%;
  background-color: var(--color-canvas-parchment);
  border: 1px solid var(--color-divider-soft);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.detail-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  padding-bottom: var(--space-xxs);
}
.detail-info-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.detail-label {
  font: var(--text-caption);
  color: var(--color-ink-muted-48);
}

.detail-value {
  font: var(--text-body-strong);
  color: var(--color-ink);
}

/* Room Badges (duplicated for global safety) */
.room-badge {
  font: var(--text-caption);
  font-weight: 600;
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  display: inline-block;
  background-color: var(--color-surface-pearl);
  color: var(--color-ink-muted-48);
  border: 1px solid var(--color-divider-soft);
}

.room-badge.room-1 {
  background-color: rgba(0, 102, 204, 0.08);
  color: #0066cc;
  border-color: rgba(0, 102, 204, 0.15);
}

.room-badge.room-2 {
  background-color: rgba(52, 199, 89, 0.08);
  color: #34c759;
  border-color: rgba(52, 199, 89, 0.15);
}

.room-badge.room-3 {
  background-color: rgba(255, 149, 0, 0.08);
  color: #ff9500;
  border-color: rgba(255, 149, 0, 0.15);
}

.room-badge.room-4 {
  background-color: rgba(175, 82, 222, 0.08);
  color: #af52de;
  border-color: rgba(175, 82, 222, 0.15);
}
</style>