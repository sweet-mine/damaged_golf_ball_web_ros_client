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
  const chatMessages = ref([]);
  const isAgentThinking = ref(false);
  
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

  const fetchAgentHistory = async () => {
    try {
      const cached = localStorage.getItem('golfbot_chat_history');
      if (cached) {
        chatMessages.value = JSON.parse(cached);
      } else {
        chatMessages.value = [];
      }
    } catch (e) {
      console.error('Failed to load agent history from localStorage:', e);
      chatMessages.value = [];
    }
  };

  const sendAgentMessage = async (messageText) => {
    if (!messageText.trim()) return;
    
    // Add user message locally for immediate feedback
    const userMsg = { role: 'user', content: messageText };
    chatMessages.value.push(userMsg);
    
    // Save current messages to LocalStorage immediately
    try {
      localStorage.setItem('golfbot_chat_history', JSON.stringify(chatMessages.value));
    } catch (e) {
      console.error('Failed to save user message to localStorage:', e);
    }
    
    isAgentThinking.value = true;
    
    // Prepare history payload for backend (excluding the current user message)
    const historyPayload = chatMessages.value.slice(0, -1).map(m => ({
      role: m.role,
      content: m.content
    }));
    
    try {
      const res = await fetch('http://localhost:8000/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: messageText,
          history: historyPayload
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        chatMessages.value.push({ role: 'assistant', content: data.response });
      } else {
        chatMessages.value.push({ role: 'assistant', content: `에러가 발생했습니다: ${data.detail || '응답을 받지 못했습니다.'}` });
      }
    } catch (e) {
      console.error('Failed to send message:', e);
      chatMessages.value.push({ role: 'assistant', content: '네트워크 오류가 발생했습니다. 서버 연결 상태를 확인해 주세요.' });
    } finally {
      isAgentThinking.value = false;
      // Save finalized messages to LocalStorage
      try {
        localStorage.setItem('golfbot_chat_history', JSON.stringify(chatMessages.value));
      } catch (e) {
        console.error('Failed to save finalized chat history to localStorage:', e);
      }
    }
  };

  const clearAgentHistory = () => {
    try {
      localStorage.removeItem('golfbot_chat_history');
      chatMessages.value = [];
    } catch (e) {
      console.error('Failed to clear agent history:', e);
    }
  };

  return {
    cmdVel,
    batteryState,
    isConnected,
    brokenBallNotification,
    activeModalBall,
    chatMessages,
    isAgentThinking,
    connectWebSocket,
    disconnectWebSocket,
    fetchAgentHistory,
    sendAgentMessage,
    clearAgentHistory
  };
});
