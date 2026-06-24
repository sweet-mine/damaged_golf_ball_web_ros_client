<template>
  <section class="product-tile-parchment history-section">
    <div class="history-container">
      <!-- Header -->
      <div class="history-header">
        <h1 class="hero-headline">Analytics Page</h1>
        <p class="hero-tagline">축적된 골프공 파손 내역을 조회하고 그래프를 통해 파손 경향을 분석할 수 있습니다.</p>
      </div>

      <!-- Loading State (Large Spinner) -->
      <div v-if="isLoading && historyList.length === 0" class="spinner-container">
        <div class="spinner"></div>
        <p>파손 데이터 및 통계를 구성 중입니다...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="historyList.length === 0" class="empty-state">
        <div class="empty-icon-wrapper">
          <span class="empty-icon">📊</span>
        </div>
        <h2 class="empty-title">기록된 파손 이력이 없습니다</h2>
        <p class="empty-desc">깨진 골프공이 감지되면 이곳에 자동으로 통계와 이력이 기록됩니다.</p>
        <button class="button-refresh" @click="fetchHistory" style="margin-top: 16px;">
          데이터 동기화
        </button>
      </div>

      <template v-else>
        <!-- Statistics Section -->
        <div class="stats-dashboard">
          <!-- Card 1: Key Metrics -->
          <div class="store-utility-card summary-card">
            <h3 class="card-title">주요 지표</h3>
            <div class="metric-group">
              <div class="metric-item">
                <span class="metric-label">누적 검출 건수</span>
                <span class="metric-value">{{ totalCount }}<span class="metric-unit">건</span></span>
              </div>
              <div class="metric-item">
                <span class="metric-label">최다 발생 구역</span>
                <span class="metric-value text-highlight">
                  {{ roomStats.mostActiveRoom !== '없음' ? roomStats.mostActiveRoom + '번 방' : '없음' }}
                </span>
              </div>
              <div class="metric-item">
                <span class="metric-label">최대 발생 일자</span>
                <span class="metric-value date-value">
                  {{ dateStats.mostActiveDate !== '없음' ? dateStats.mostActiveDate.substring(5) : '없음' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Card 2: Room Distribution (Doughnut Chart) -->
          <div class="store-utility-card distribution-card">
            <h3 class="card-title">방별 검출 비율</h3>
            <div class="chart-wrapper">
              <canvas id="roomChart"></canvas>
            </div>
          </div>

          <!-- Card 3: Date Trend (Line Chart) -->
          <div class="store-utility-card trend-card">
            <h3 class="card-title">최근 일별 추이 (최근 7일)</h3>
            <div class="chart-wrapper">
              <div v-if="dateStats.chartData.length === 0" class="no-trend">
                추이 데이터 부족
              </div>
              <canvas v-else id="trendChart"></canvas>
            </div>
          </div>
        </div>

        <!-- Filters Block -->
        <div class="filters-panel product-tile-light">
          <div class="filter-header">
            <span class="filter-title">🔍 이력 필터링</span>
            <button class="button-clear" @click="resetFilters">필터 초기화</button>
          </div>
          
          <div class="filter-options">
            <!-- Room Filter -->
            <div class="filter-group">
              <label class="filter-label">검출 위치 (방)</label>
              <div class="segment-controls">
                <button 
                  class="segment-button" 
                  :class="{ active: selectedRoom === 'all' }" 
                  @click="selectedRoom = 'all'"
                >전체</button>
                <button 
                  v-for="roomNum in [1, 2, 3, 4]" 
                  :key="roomNum"
                  class="segment-button"
                  :class="{ active: selectedRoom === String(roomNum) }"
                  @click="selectedRoom = String(roomNum)"
                >{{ roomNum }}번 방</button>
              </div>
            </div>

            <!-- Date Filter -->
            <div class="filter-group">
              <label class="filter-label">검출 날짜</label>
              <div class="date-picker-wrapper">
                <input 
                  type="date" 
                  v-model="selectedDate" 
                  class="date-input" 
                />
                <button v-if="selectedDate" class="clear-date-btn" @click="selectedDate = ''">×</button>
              </div>
            </div>
          </div>
        </div>

        <!-- List Section (Table UI) -->
        <div class="history-list-section">
          <div class="list-section-header">
            <h2 class="section-subtitle">
              검출 이력 목록 
              <span class="count-badge">{{ filteredHistoryList.length }} / {{ totalCount }}건</span>
            </h2>
            <button class="button-refresh small" @click="fetchHistory" :disabled="isLoading">
              <span class="refresh-icon" :class="{ 'spinning': isLoading }">↻</span>
              새로고침
            </button>
          </div>

          <!-- Empty Filter State -->
          <div v-if="filteredHistoryList.length === 0" class="empty-filter-state">
            <p class="empty-filter-text">선택하신 필터 조건과 일치하는 파손 이력이 없습니다.</p>
            <button class="button-clear secondary" @click="resetFilters">모든 이력 보기</button>
          </div>

          <!-- Table Wrapper -->
          <div v-else class="table-wrapper">
            <table class="history-table">
              <thead>
                <tr>
                  <th class="col-id">검출 ID</th>
                  <th class="col-time">발생 시각</th>
                  <th class="col-location">검출 위치 (구역)</th>
                  <th class="col-actions">관리</th>
                </tr>
              </thead>
              <transition name="page-fade" mode="out-in">
                <tbody :key="currentPage">
                  <tr v-for="item in paginatedHistoryList" :key="item.id" @click="openImageModal(item)" class="clickable-row">
                    <td class="col-id font-mono">#{{ item.id }}</td>
                    <td class="col-time">{{ item.timestamp }}</td>
                    <td class="col-location">
                      <span class="room-badge" :class="'room-' + getRoomNumber(item.location)">
                        {{ getRoomName(item.location) }}
                      </span>
                    </td>
                    <td class="col-actions">
                      <button class="btn-delete-row" @click.stop="deleteItem(item.id)">
                        삭제
                      </button>
                    </td>
                  </tr>
                </tbody>
              </transition>
            </table>

            <!-- Pagination Controls -->
            <div class="pagination-container">
              <button 
                class="btn-pagination" 
                :disabled="currentPage === 1" 
                @click="currentPage = 1"
              >
                ≪
              </button>
              <button 
                class="btn-pagination" 
                :disabled="currentPage === 1" 
                @click="currentPage--"
              >
                이전
              </button>
              
              <span class="pagination-info">
                {{ currentPage }} / {{ totalPages }} 페이지
              </span>
              
              <button 
                class="btn-pagination" 
                :disabled="currentPage === totalPages" 
                @click="currentPage++"
              >
                다음
              </button>
              <button 
                class="btn-pagination" 
                :disabled="currentPage === totalPages" 
                @click="currentPage = totalPages"
              >
                ≫
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, onUnmounted, watch } from 'vue';
import { useGolfbotStore } from '../stores/golfbot';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const store = useGolfbotStore();
const historyList = ref([]);
const isLoading = ref(false);

const currentPage = ref(1);
const itemsPerPage = ref(10);

const openImageModal = (item) => {
  store.activeModalBall = item;
};

// Filter states
const selectedDate = ref('');
const selectedRoom = ref('all'); // 'all', '1', '2', '3', '4'

let roomChart = null;
let trendChart = null;

const initCharts = () => {
  const roomCtx = document.getElementById('roomChart');
  const trendCtx = document.getElementById('trendChart');
  
  if (roomCtx) {
    roomChart = new Chart(roomCtx, {
      type: 'doughnut',
      data: {
        labels: ['1번 방', '2번 방', '3번 방', '4번 방'],
        datasets: [{
          data: [0, 0, 0, 0],
          backgroundColor: ['#0066cc', '#34c759', '#ff9500', '#af52de'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              font: {
                family: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                size: 11
              },
              color: '#1d1d1f'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(29, 29, 31, 0.9)',
            titleFont: { family: 'SF Pro Text' },
            bodyFont: { family: 'SF Pro Text' }
          }
        },
        cutout: '70%'
      }
    });
  }
  
  if (trendCtx) {
    trendChart = new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: '검출 건수',
          data: [],
          borderColor: '#0066cc',
          backgroundColor: 'rgba(0, 102, 204, 0.05)',
          fill: true,
          tension: 0.3,
          borderWidth: 2,
          pointBackgroundColor: '#0066cc',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1.5,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(29, 29, 31, 0.9)',
            titleFont: { family: 'SF Pro Text' },
            bodyFont: { family: 'SF Pro Text' }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: {
                family: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                size: 11
              },
              color: '#7a7a7a'
            }
          },
          y: {
            beginAtZero: true,
            grid: { color: '#f0f0f0' },
            ticks: {
              stepSize: 1,
              font: {
                family: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                size: 11
              },
              color: '#7a7a7a'
            }
          }
        }
      }
    });
  }
  
  updateCharts();
};

const updateCharts = () => {
  if (roomChart) {
    const counts = roomStats.value.counts;
    roomChart.data.datasets[0].data = [
      counts[1] || 0,
      counts[2] || 0,
      counts[3] || 0,
      counts[4] || 0
    ];
    roomChart.update();
  }
  
  if (trendChart) {
    const chartData = dateStats.value.chartData;
    trendChart.data.labels = chartData.map(d => d.date);
    trendChart.data.datasets[0].data = chartData.map(d => d.count);
    trendChart.update();
  }
};

watch([selectedDate, historyList], () => {
  nextTick(() => {
    if (!roomChart && !trendChart) {
      initCharts();
    } else {
      updateCharts();
    }
  });
});

const fetchHistory = async () => {
  isLoading.value = true;
  try {
    const response = await fetch(`http://${window.location.hostname}:8000/api/broken_ball/`);
    if (response.ok) {
      const result = await response.json();
      if (result.status === 'success') {
        historyList.value = result.data;
      }
    } else {
      console.error('Failed to fetch history');
    }
  } catch (error) {
    console.error('Error fetching history:', error);
  } finally {
    isLoading.value = false;
  }
};

const deleteItem = async (id) => {
  if (!confirm('이 파손 기록을 정말 삭제하시겠습니까?')) return;
  
  try {
    const response = await fetch(`http://${window.location.hostname}:8000/api/broken_ball/${id}`, {
      method: 'DELETE',
    });
    if (response.ok) {
      const result = await response.json();
      if (result.status === 'success') {
        // Smoothly delete from local state
        historyList.value = historyList.value.filter(item => item.id !== id);
      }
    } else {
      console.error('Failed to delete item');
    }
  } catch (error) {
    console.error('Error deleting item:', error);
  }
};

onUnmounted(() => {
  if (roomChart) roomChart.destroy();
  if (trendChart) trendChart.destroy();
});

// Filter Reset
const resetFilters = () => {
  selectedDate.value = '';
  selectedRoom.value = 'all';
};

// Room Helpers
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

const dateFilteredHistoryList = computed(() => {
  if (!selectedDate.value) return historyList.value;
  return historyList.value.filter(item => {
    const itemDate = item.timestamp.split(' ')[0];
    return itemDate === selectedDate.value;
  });
});

// Computeds for Filtering
const filteredHistoryList = computed(() => {
  return historyList.value.filter(item => {
    // 1. Date Filter
    if (selectedDate.value) {
      const itemDate = item.timestamp.split(' ')[0]; // Extract "YYYY-MM-DD"
      if (itemDate !== selectedDate.value) return false;
    }
    // 2. Room Filter
    if (selectedRoom.value !== 'all') {
      const r = getRoomNumber(item.location);
      if (String(r) !== selectedRoom.value) return false;
    }
    return true;
  });
});

const totalPages = computed(() => {
  return Math.ceil(filteredHistoryList.value.length / itemsPerPage.value) || 1;
});

const paginatedHistoryList = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredHistoryList.value.slice(start, end);
});

watch([selectedDate, selectedRoom], () => {
  currentPage.value = 1;
});

watch(totalPages, (newVal) => {
  if (currentPage.value > newVal) {
    currentPage.value = newVal;
  }
});



const getRoomPercentage = (roomNum) => {
  const currentTotal = dateFilteredHistoryList.value.length;
  if (currentTotal === 0) return 0;
  const count = roomStats.value.counts[roomNum] || 0;
  return Math.round((count / currentTotal) * 100);
};

// Computeds for Global Statistics (Calculated from full history list)
const totalCount = computed(() => historyList.value.length);

const roomStats = computed(() => {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let unknown = 0;
  
  dateFilteredHistoryList.value.forEach(item => {
    const r = getRoomNumber(item.location);
    if (r >= 1 && r <= 4) {
      counts[r]++;
    } else {
      unknown++;
    }
  });

  let maxRoomCount = 0;
  let mostActiveRoom = '없음';
  Object.keys(counts).forEach(k => {
    if (counts[k] > maxRoomCount) {
      maxRoomCount = counts[k];
      mostActiveRoom = k;
    }
  });

  return { counts, unknown, mostActiveRoom };
});

const dateStats = computed(() => {
  const counts = {};
  
  historyList.value.forEach(item => {
    const dateStr = item.timestamp.split(' ')[0];
    counts[dateStr] = (counts[dateStr] || 0) + 1;
  });

  // Chronological sort
  const sortedDates = Object.keys(counts).sort((a, b) => new Date(a) - new Date(b));

  let maxDateCount = 0;
  let mostActiveDate = '없음';
  Object.keys(counts).forEach(d => {
    if (counts[d] > maxDateCount) {
      maxDateCount = counts[d];
      mostActiveDate = d;
    }
  });

  // Last 7 unique active dates
  const last7Dates = sortedDates.slice(-7);
  const chartData = last7Dates.map(d => ({
    date: d.substring(5), // MM-DD
    fullDate: d,
    count: counts[d]
  }));

  const maxCountInChart = Math.max(...chartData.map(d => d.count), 1);

  return { counts, mostActiveDate, chartData, maxCountInChart };
});

onMounted(() => {
  fetchHistory();
});
</script>

<style scoped>
.history-section {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: var(--space-section) 0;
  background-color: var(--color-canvas);
  min-height: 90vh;
}

.history-container {
  max-width: 1200px;
  width: 100%;
  padding: 0 var(--space-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.history-header {
  text-align: center;
}

.hero-headline {
  font: var(--text-display-lg);
  letter-spacing: var(--track-display-lg);
  margin-bottom: var(--space-xxs);
}

.hero-tagline {
  font: var(--text-body);
  color: var(--color-ink-muted-48);
  max-width: 800px;
  margin: 0 auto;
}

/* Spinner */
.spinner-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-xxl) 0;
  color: var(--color-ink-muted-48);
  gap: var(--space-md);
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid var(--color-divider-soft);
  border-top: 4px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Stats Dashboard */
.stats-dashboard {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-lg);
}

@media (min-width: 768px) {
  .stats-dashboard {
    grid-template-columns: repeat(3, 1fr);
  }
}

.store-utility-card {
  background-color: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.card-title {
  font: var(--text-body-strong);
  font-size: 16px;
  letter-spacing: var(--track-body-strong);
  color: var(--color-ink-muted-80);
  border-bottom: 1px solid var(--color-divider-soft);
  padding-bottom: var(--space-xs);
  margin: 0;
}

/* Summary Card */
.metric-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  justify-content: center;
  flex: 1;
}

.metric-item {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.metric-label {
  font: var(--text-caption);
  color: var(--color-ink-muted-48);
}

.metric-value {
  font: var(--text-body-strong);
  font-size: 20px;
  color: var(--color-ink);
}

.metric-value.text-highlight {
  color: var(--color-primary);
}

.metric-value.date-value {
  font-size: 16px;
}

.metric-unit {
  font-size: 13px;
  color: var(--color-ink-muted-48);
  margin-left: 2px;
}

/* Chart Wrapper */
.chart-wrapper {
  position: relative;
  width: 100%;
  height: 180px;
  flex: 1;
}

.no-trend {
  font: var(--text-caption);
  color: var(--color-ink-muted-48);
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

/* Filters Panel */
.filters-panel {
  background-color: var(--color-canvas-parchment);
  border: 1px solid var(--color-divider-soft);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-title {
  font: var(--text-body-strong);
  font-size: 15px;
  color: var(--color-ink);
}

.button-clear {
  background: none;
  border: none;
  color: var(--color-primary);
  font: var(--text-caption);
  font-weight: 500;
  cursor: pointer;
  padding: 2px 6px;
}
.button-clear:hover {
  text-decoration: underline;
}
.button-clear.secondary {
  border: 1px solid var(--color-divider-soft);
  background-color: var(--color-canvas);
  color: var(--color-ink);
  padding: 8px 16px;
  border-radius: var(--radius-pill);
  transition: background-color 0.2s ease;
  margin-top: var(--space-sm);
}
.button-clear.secondary:hover {
  background-color: var(--color-surface-pearl);
  text-decoration: none;
}

.filter-options {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-lg);
}

@media (min-width: 768px) {
  .filter-options {
    grid-template-columns: 2fr 1fr;
  }
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.filter-label {
  font: var(--text-caption);
  color: var(--color-ink-muted-48);
  font-weight: 500;
}

/* Segment Control */
.segment-controls {
  display: flex;
  background-color: var(--color-surface-pearl);
  border-radius: var(--radius-pill);
  padding: 3px;
  border: 1px solid var(--color-divider-soft);
  overflow-x: auto;
}

.segment-button {
  flex: 1;
  border: none;
  background: none;
  font: var(--text-caption);
  font-weight: 500;
  color: var(--color-ink-muted-80);
  padding: 8px 12px;
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
  white-space: nowrap;
}

.segment-button.active {
  background-color: var(--color-canvas);
  color: var(--color-ink);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

/* Date Picker */
.date-picker-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.date-input {
  width: 100%;
  padding: 8px 32px 8px 12px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--color-divider-soft);
  background-color: var(--color-canvas);
  font: var(--text-body);
  font-size: 14px;
  color: var(--color-ink);
  outline: none;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.02);
}
.date-input:focus {
  border-color: var(--color-primary);
}

.clear-date-btn {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  font-size: 18px;
  color: var(--color-ink-muted-48);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* History List Section */
.history-list-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin-top: var(--space-md);
}

.list-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-subtitle {
  font: var(--text-body-strong);
  font-size: 18px;
  color: var(--color-ink);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.count-badge {
  font: var(--text-caption);
  background-color: var(--color-surface-pearl);
  border: 1px solid var(--color-divider-soft);
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  color: var(--color-ink-muted-80);
}

.button-refresh {
  background-color: var(--color-surface-chip-translucent);
  border: 1px solid var(--color-divider-soft);
  color: var(--color-ink);
  font: var(--text-button-utility);
  padding: 8px 16px;
  border-radius: var(--radius-pill);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--space-xxs);
  transition: background-color 0.2s ease, transform 0.1s ease;
}
.button-refresh:hover {
  background-color: rgba(200, 200, 205, 0.8);
}
.button-refresh:active {
  transform: scale(0.97);
}
.button-refresh.small {
  padding: 6px 12px;
  font-size: 12px;
}

.refresh-icon {
  display: inline-block;
  font-size: 14px;
  line-height: 1;
}

.refresh-icon.spinning {
  animation: spin 1s linear infinite;
}

/* Empty Filter State */
.empty-filter-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-xl) 0;
  background-color: var(--color-surface-pearl);
  border: 1px dashed var(--color-divider-soft);
  border-radius: var(--radius-lg);
  color: var(--color-ink-muted-48);
}

.empty-filter-text {
  font: var(--text-body);
}

/* Table Design */
.table-wrapper {
  background-color: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
  min-height: 630px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.history-table th {
  background-color: var(--color-canvas-parchment);
  color: var(--color-ink-muted-48);
  font: var(--text-caption);
  font-weight: 600;
  padding: var(--space-md);
  border-bottom: 1px solid var(--color-divider-soft);
}

.history-table td {
  padding: var(--space-md);
  border-bottom: 1px solid var(--color-divider-soft);
  font: var(--text-body);
  color: var(--color-ink);
  vertical-align: middle;
}

.history-table tr {
  transition: background-color 0.15s ease;
}

.history-table tbody tr:hover {
  background-color: var(--color-surface-pearl);
}

.history-table tr:last-child td {
  border-bottom: none;
}

.font-mono {
  font-family: monospace;
  font-weight: 600;
}

.col-id {
  width: 15%;
  color: var(--color-primary);
}

.col-time {
  width: 40%;
}

.col-location {
  width: 30%;
}

.col-actions {
  width: 15%;
  text-align: right;
}

.btn-delete-row {
  background-color: transparent;
  border: none;
  color: #ff3b30;
  font: var(--text-button-utility);
  font-weight: 500;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  transition: background-color 0.2s ease;
}

.btn-delete-row:hover {
  background-color: rgba(255, 59, 48, 0.08);
}

/* Room Badges */
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

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-xxl) 0;
  text-align: center;
  background-color: var(--color-surface-pearl);
  border: 1px dashed var(--color-divider-soft);
  border-radius: var(--radius-lg);
  width: 100%;
}

.empty-icon-wrapper {
  background-color: var(--color-canvas);
  width: 80px;
  height: 80px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  margin-bottom: var(--space-md);
}

.empty-icon {
  font-size: 40px;
}

.empty-title {
  font: var(--text-body-strong);
  font-size: 20px;
  margin-bottom: var(--space-xxs);
}

.empty-desc {
  font: var(--text-caption);
  color: var(--color-ink-muted-48);
}

/* Page Transitions */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.15s ease;
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}
/* Clickable Rows */
.history-table tbody tr {
  cursor: pointer;
}

.history-table tbody tr:hover {
  background-color: var(--color-surface-pearl);
}

/* Pagination Styling */
.pagination-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-md);
  border-top: 1px solid var(--color-divider-soft);
  background-color: var(--color-canvas-parchment);
}

.btn-pagination {
  background-color: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  color: var(--color-ink);
  font: var(--text-caption);
  font-weight: 500;
  padding: 6px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-pagination:hover:not(:disabled) {
  background-color: var(--color-surface-pearl);
  border-color: var(--color-ink-muted-48);
}

.btn-pagination:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pagination-info {
  font: var(--text-caption);
  font-weight: 600;
  color: var(--color-ink-muted-80);
  min-width: 80px;
  text-align: center;
}

</style>
