import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useGolfbotStore = defineStore('golfbot', () => {
  const cmdVel = ref({ linear_x: 0, angular_z: 0 });
  const batteryState = ref({ voltage: 0, percentage: 0 });
  const isWsConnected = ref(false);
  const isRobotConnected = ref(false);
  const isConnected = computed(() => isWsConnected.value && isRobotConnected.value);
  const brokenBallNotification = ref(null);
  const activeModalBall = ref(null);
  
  let ws = null;
  let notificationTimeout = null;

  const connectWebSocket = () => {
    if (ws) return;
    
    ws = new WebSocket('ws://localhost:8000/ws');
    
    ws.onopen = () => {
      isWsConnected.value = true;
    };
    
    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === 'cmd_vel_data') {
        cmdVel.value = payload.data;
      } else if (payload.type === 'battery_data') {
        batteryState.value = payload.data;
      } else if (payload.type === 'robot_connection') {
        isRobotConnected.value = payload.data.connected;
      } else if (payload.type === 'broken_ball_notification') {
        brokenBallNotification.value = payload.data;
        if (notificationTimeout) clearTimeout(notificationTimeout);
        notificationTimeout = setTimeout(() => {
          brokenBallNotification.value = null;
        }, 5000);
      }
    };
    
    ws.onclose = () => {
      isWsConnected.value = false;
      isRobotConnected.value = false;
      ws = null;
      // Reconnect after 3 seconds
      setTimeout(connectWebSocket, 3000);
    };
  };

  const disconnectWebSocket = () => {
    if (ws) {
      ws.close();
      ws = null;
    }
  };

  return {
    cmdVel,
    batteryState,
    isConnected,
    brokenBallNotification,
    activeModalBall,
    connectWebSocket,
    disconnectWebSocket
  };
});
