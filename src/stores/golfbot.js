import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useGolfbotStore = defineStore('golfbot', () => {
  const cmdVel = ref({ linear_x: 0, angular_z: 0 });
  const batteryState = ref({ voltage: 0, percentage: 0 });
  const robotLocation = ref({ x: 0.0, y: 0.0, location: '대기 중' });
  const isWsConnected = ref(false);
  const isRobotConnected = ref(false);
  const isConnected = computed(() => isWsConnected.value && isRobotConnected.value);
  const brokenBallNotification = ref(null);
  const activeModalBall = ref(null);
  const chatMessages = ref([]);
  const isAgentThinking = ref(false);
  const getInitialAuthState = () => {
    const token = localStorage.getItem('golfbot_auth_token') || '';
    const expiresAtStr = localStorage.getItem('golfbot_token_expires_at') || '0';
    const expiresAt = Number(expiresAtStr);
    
    if (token && expiresAt > Date.now()) {
      return { loggedIn: true, token, expiresAt };
    } else {
      localStorage.removeItem('golfbot_auth_token');
      localStorage.removeItem('golfbot_token_expires_at');
      return { loggedIn: false, token: '', expiresAt: 0 };
    }
  };

  const initialAuth = getInitialAuthState();
  const isLoggedIn = ref(initialAuth.loggedIn);
  const authToken = ref(initialAuth.token);
  const tokenExpiresAt = ref(initialAuth.expiresAt);
  
  let ws = null;
  let notificationTimeout = null;

  const connectWebSocket = () => {
    if (!isLoggedIn.value) return;
    if (ws) return;
    
    ws = new WebSocket(`ws://${window.location.hostname}:8000/ws`);
    
    ws.onopen = () => {
      isWsConnected.value = true;
    };
    
    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === 'cmd_vel_data') {
        cmdVel.value = payload.data;
      } else if (payload.type === 'battery_data') {
        batteryState.value = payload.data;
      } else if (payload.type === 'location_data') {
        robotLocation.value = payload.data;
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
      const res = await fetch(`http://${window.location.hostname}:8000/api/agent/chat`, {
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

  const sendVoiceAgentMessage = async (audioBlob) => {
    isAgentThinking.value = true;
    
    const historyPayload = chatMessages.value.map(m => ({
      role: m.role,
      content: m.content
    }));
    
    const formData = new FormData();
    formData.append('file', audioBlob, 'voice_input.wav');
    formData.append('history', JSON.stringify(historyPayload));
    
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/agent/voice`, {
        method: 'POST',
        body: formData
      });
      
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        const transcription = data.transcription;
        const responseText = data.response;
        
        if (transcription) {
          chatMessages.value.push({ role: 'user', content: `🎙️ ${transcription}` });
        } else {
          chatMessages.value.push({ role: 'user', content: `🎙️ [인식할 수 없는 음성]` });
        }
        
        chatMessages.value.push({ role: 'assistant', content: responseText });
      } else {
        chatMessages.value.push({ role: 'assistant', content: `에러가 발생했습니다: ${data.detail || '음성을 분석하지 못했습니다.'}` });
      }
    } catch (e) {
      console.error('Failed to send voice message:', e);
      chatMessages.value.push({ role: 'assistant', content: '네트워크 오류가 발생했습니다. 서버 연결 상태를 확인해 주세요.' });
    } finally {
      isAgentThinking.value = false;
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

  const login = async (username, passwordHash) => {
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password_hash: passwordHash
        })
      });
      
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        authToken.value = data.token;
        tokenExpiresAt.value = data.expires_at;
        isLoggedIn.value = true;
        localStorage.setItem('golfbot_auth_token', data.token);
        localStorage.setItem('golfbot_token_expires_at', data.expires_at);
        connectWebSocket();
        return { success: true };
      } else {
        return { success: false, message: data.detail || '로그인에 실패했습니다.' };
      }
    } catch (e) {
      console.error('Login error:', e);
      return { success: false, message: '서버와 통신 중 오류가 발생했습니다. 서버 상태를 확인해 주세요.' };
    }
  };

  const logout = () => {
    authToken.value = '';
    tokenExpiresAt.value = 0;
    isLoggedIn.value = false;
    localStorage.removeItem('golfbot_auth_token');
    localStorage.removeItem('golfbot_token_expires_at');
    disconnectWebSocket();
  };

  const validateTokenOnServer = async () => {
    if (!authToken.value) return false;
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/auth/validate`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken.value}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        tokenExpiresAt.value = data.expires_at;
        localStorage.setItem('golfbot_token_expires_at', data.expires_at);
        return true;
      } else {
        logout();
        return false;
      }
    } catch (e) {
      console.error('Token validation error:', e);
      // Fallback: if server is unreachable, check local expiration
      if (tokenExpiresAt.value > Date.now()) {
        return true;
      }
      logout();
      return false;
    }
  };

  const showBallDetail = async (ball) => {
    if (!ball) {
      activeModalBall.value = null;
      return;
    }
    
    // Set metadata first so modal opens instantly
    activeModalBall.value = { ...ball };
    
    // If there is no image (e.g. from the paginated list), fetch on-demand
    if (!ball.image) {
      try {
        const res = await fetch(`http://${window.location.hostname}:8000/api/broken_ball/${ball.id}`);
        if (res.ok) {
          const result = await res.json();
          if (result.status === 'success' && result.data.image) {
            // Check if the user hasn't closed or switched the modal to another ball
            if (activeModalBall.value && activeModalBall.value.id === ball.id) {
              activeModalBall.value.image = result.data.image;
            }
          }
        }
      } catch (e) {
        console.error('Failed to fetch image on-demand:', e);
      }
    }
  };

  return {
    cmdVel,
    batteryState,
    robotLocation,
    isConnected,
    brokenBallNotification,
    activeModalBall,
    chatMessages,
    isAgentThinking,
    isLoggedIn,
    authToken,
    tokenExpiresAt,
    connectWebSocket,
    disconnectWebSocket,
    fetchAgentHistory,
    sendAgentMessage,
    sendVoiceAgentMessage,
    clearAgentHistory,
    login,
    logout,
    validateTokenOnServer,
    showBallDetail
  };
});
