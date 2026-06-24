<template>
  <!-- Main Dashboard Section -->
  <section class="product-tile-parchment dashboard-section">
    <div class="dashboard-container">
      <div class="dashboard-header">
        <h1 class="hero-headline">Live Vision</h1>
        <p class="hero-tagline">Real-time monitoring and navigation controls.</p>
      </div>
      
      <div class="dashboard-grid">
        <!-- Left: Camera Stream -->
        <div class="dashboard-column video-column">
          <div class="video-container">
            <img src="http://localhost:8000/video_feed" alt="ROS 2 Camera Stream" class="video-stream" />
          </div>
          <div class="connection-status">
            <div class="button-primary" :class="{ 'disconnected': !store.isConnected }">
              {{ store.isConnected ? '로봇 연결됨' : '로봇 연결 대기 중...' }}
            </div>
          </div>
        </div>
        
        <!-- Right: Metrics & Controls -->
        <div class="dashboard-column metrics-column">
          <div class="utility-grid-vertical">
            <!-- cmd_vel Utility Card -->
            <div class="store-utility-card">
              <div class="card-header">
                <h2 class="card-title">/cmd_vel</h2>
                <p class="card-subtitle">제어 명령</p>
              </div>
              <div class="card-body">
                <div class="data-row">
                  <span class="data-label">Linear X</span>
                  <span class="data-value">{{ store.cmdVel.linear_x }} <span class="unit">m/s</span></span>
                </div>
                <div class="data-row">
                  <span class="data-label">Angular Z</span>
                  <span class="data-value">{{ store.cmdVel.angular_z }} <span class="unit">rad/s</span></span>
                </div>
              </div>
            </div>

            <!-- performance_metrics Utility Card -->
            <div class="store-utility-card">
              <div class="card-header">
                <h2 class="card-title">/battery_state</h2>
                <p class="card-subtitle">배터리 상태</p>
              </div>
              <div class="card-body">
                <div class="data-row">
                  <span class="data-label">Voltage</span>
                  <span class="data-value">{{ store.batteryState.voltage }} <span class="unit">V</span></span>
                </div>
                <div class="data-row">
                  <span class="data-label">Percentage</span>
                  <span class="data-value">{{ store.batteryState.percentage }} <span class="unit">%</span></span>
                </div>
              </div>
            </div>
            
            <!-- Navigation CTA -->
            <div class="nav-cta-container">
              <button class="button-store-hero" @click="isNavModalOpen = true">
                Navigation Menu
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Navigation Modal -->
  <div class="nav-modal-overlay" v-if="isNavModalOpen" @click.self="isNavModalOpen = false">
    <div class="modal-content product-tile-light">
      <div class="modal-header">
        <h2 class="card-title">Select Navigation Target</h2>
        <button class="button-icon-circular" @click="isNavModalOpen = false">×</button>
      </div>
      <div class="modal-body utility-grid">
        <button class="store-utility-card nav-card" @click="sendNavCommand(1.83, 1.45)">
          <span class="data-value">1번 방</span>
        </button>
        <button class="store-utility-card nav-card" @click="sendNavCommand(1.83, -1.61)">
          <span class="data-value">2번 방</span>
        </button>
        <button class="store-utility-card nav-card" @click="sendNavCommand(-0.40, 1.45)">
          <span class="data-value">3번 방</span>
        </button>
        <button class="store-utility-card nav-card" @click="sendNavCommand(-0.40, -1.61)">
          <span class="data-value">4번 방</span>
        </button>
        <button class="store-utility-card nav-card" @click="sendNavCommand(-2.0, -0.5)">
          <span class="data-value">카운터</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useGolfbotStore } from '../stores/golfbot';

const store = useGolfbotStore();
const isNavModalOpen = ref(false);

const sendNavCommand = async (x, y) => {
  try {
    const response = await fetch('http://localhost:8000/nav', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ x, y })
    });
    if (response.ok) {
      console.log(`Nav command sent successfully: x=${x}, y=${y}`);
    } else {
      console.error('Failed to send nav command');
    }
  } catch (error) {
    console.error('Error sending nav command:', error);
  } finally {
    isNavModalOpen.value = false;
  }
};
</script>

<style scoped>
.dashboard-section {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--space-section) 0;
  background-color: var(--color-canvas);
}

.dashboard-container {
  max-width: 1440px;
  width: 100%;
  padding: 0 var(--space-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-xxl);
}

.dashboard-header {
  text-align: center;
}

.hero-headline {
  font: var(--text-display-lg);
  letter-spacing: var(--track-display-lg);
  margin-bottom: var(--space-xs);
}

.hero-tagline {
  font: var(--text-lead);
  letter-spacing: var(--track-lead);
  color: var(--color-ink);
  margin-bottom: var(--space-lg);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-xl);
}
@media (min-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: 2fr 1fr;
    align-items: start;
    gap: var(--space-xxl);
  }
}

.video-column {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  align-items: center;
  width: 100%;
}

.video-container {
  width: 100%;
  max-width: 900px;
}

.video-stream {
  width: 100%;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-product);
  display: block;
}

.connection-status {
  margin-top: var(--space-sm);
}

.button-primary {
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  font: var(--text-body);
  letter-spacing: var(--track-body);
  border-radius: var(--radius-pill);
  padding: 11px 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s ease;
  cursor: default;
}
.button-primary:active {
  transform: scale(0.95);
}
.button-primary.disconnected {
  background-color: var(--color-surface-pearl);
  color: var(--color-ink-muted-48);
  border: 1px solid var(--color-divider-soft);
}

.utility-grid-vertical {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  width: 100%;
}

.nav-cta-container {
  margin-top: var(--space-md);
  display: flex;
  justify-content: center;
}

.button-store-hero {
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  font-family: var(--font-text);
  font-size: 18px;
  font-weight: 300;
  line-height: 1.0;
  letter-spacing: 0;
  border-radius: var(--radius-pill);
  padding: 14px 28px;
  border: none;
  cursor: pointer;
  transition: transform 0.1s ease;
  width: 100%;
}
.button-store-hero:active {
  transform: scale(0.95);
}

/* Store Utility Card */
.store-utility-card {
  background-color: var(--color-canvas);
  color: var(--color-ink);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
}

.card-header {
  margin-bottom: var(--space-lg);
}

.card-title {
  font: var(--text-body-strong);
  letter-spacing: var(--track-body-strong);
}

.card-subtitle {
  font: var(--text-caption);
  letter-spacing: var(--track-caption);
  color: var(--color-ink-muted-48);
  margin-top: var(--space-xxs);
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.data-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 1px solid var(--color-divider-soft);
  padding-bottom: var(--space-xs);
}
.data-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.data-label {
  font: var(--text-body);
  letter-spacing: var(--track-body);
  color: var(--color-ink-muted-80);
}

.data-value {
  font: var(--text-body-strong);
  letter-spacing: var(--track-body-strong);
}

.unit {
  font: var(--text-caption);
  letter-spacing: var(--track-caption);
  color: var(--color-ink-muted-48);
  margin-left: var(--space-xxs);
}

/* Modal Styles */
.nav-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  max-width: 600px;
  width: 90%;
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

.utility-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-lg);
}

.nav-card {
  cursor: pointer;
  transition: transform 0.1s ease;
  text-align: center;
  background-color: var(--color-surface-pearl);
}

.nav-card:active {
  transform: scale(0.95);
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
</style>
