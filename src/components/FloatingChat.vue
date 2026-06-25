<template>
  <div class="floating-chat-container">
    <!-- Chat Widget Window -->
    <transition name="slide-up">
      <div v-if="isOpen" class="chat-window">
        <!-- Header -->
        <div class="chat-header">
          <template v-if="!showClearConfirm">
            <div class="header-title-group">
              <span class="header-status-indicator" :class="{ 'is-active': store.isConnected }"></span>
              <div class="header-text">
                <span class="header-title">Golfbot AI 어시스턴트</span>
                <span class="header-subtitle">실시간 로봇 시스템 및 대화 진단</span>
              </div>
            </div>
            <div class="header-actions">
              <button 
                class="header-action-btn" 
                @click="showClearConfirm = true" 
                title="대화 기록 초기화"
                v-if="store.chatMessages.length > 0"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>
              <button class="close-btn" @click="toggleChat">×</button>
            </div>
          </template>
          <template v-else>
            <div class="confirm-clear-group">
              <span class="confirm-clear-text">대화 기록을 모두 지우시겠습니까?</span>
              <div class="confirm-clear-actions">
                <button class="confirm-btn yes" @click="confirmClearHistory">지우기</button>
                <button class="confirm-btn no" @click="showClearConfirm = false">취소</button>
              </div>
            </div>
          </template>
        </div>

        <!-- Message List -->
        <div class="message-list" ref="messageList">
          <div v-if="store.chatMessages.length === 0" class="empty-state">
            <div class="empty-icon">🤖</div>
            <p class="empty-title">무엇을 도와드릴까요?</p>
            <div class="empty-desc">
              ROS2 시스템의 노드, 토픽 상태 분석 및 일반 대화가 가능합니다.<br>
              <div class="examples-container">
                <span class="example-tag" @click="useExample('현재 실행 중인 노드 목록을 보여줘')">"노드 목록 보여줘"</span>
                <span class="example-tag" @click="useExample('현재 활성화된 토픽 목록 알려줘')">"토픽 목록 알려줘"</span>
                <span class="example-tag" @click="useExample('시스템 진단 리포트를 뽑아줘')">"시스템 진단 리포트"</span>
              </div>
            </div>
          </div>

          <div 
            v-for="(msg, index) in store.chatMessages" 
            :key="index" 
            class="message-bubble-wrapper"
            :class="msg.role"
          >
            <div class="message-bubble">
              <div class="message-content" v-html="renderContent(msg.content)"></div>
            </div>
          </div>

          <!-- Thinking / Loading Indicator -->
          <transition name="fade">
            <div v-if="store.isAgentThinking" class="message-bubble-wrapper assistant">
              <div class="message-bubble thinking-bubble">
                <div class="thinking-loader">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div class="thinking-text">시스템 상태 분석 중...</div>
              </div>
            </div>
          </transition>
        </div>

        <!-- Input Area -->
        <form @submit.prevent="sendMessage" class="input-area">
          <button 
            type="button" 
            class="mic-btn"
            :class="{ 'is-recording': isRecording }"
            @click="toggleRecording"
            :disabled="store.isAgentThinking"
            :title="isRecording ? '녹음 중지 및 전송' : '음성 명령 보내기'"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v1a7 7 0 0 1-14 0v-1"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
          </button>
          <input 
            v-model="inputMsg" 
            type="text" 
            :placeholder="isRecording ? '음성 녹음 중... (한번 더 눌러 전송)' : '어시스턴트에게 질문해 보세요...'" 
            class="chat-input"
            :class="{ 'recording-active': isRecording }"
            :disabled="store.isAgentThinking || isRecording"
            ref="inputField"
          />
          <button 
            type="submit" 
            class="send-btn" 
            :disabled="!inputMsg.trim() || store.isAgentThinking || isRecording"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
      </div>
    </transition>

    <!-- Floating Action Button (FAB) -->
    <button 
      class="fab-button" 
      :class="{ 'is-open': isOpen }" 
      @click="toggleChat"
      title="Golfbot AI 어시스턴트"
    >
      <div class="fab-icon-wrapper">
        <svg v-if="!isOpen" viewBox="0 0 24 24" class="fab-icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <svg v-else viewBox="0 0 24 24" class="fab-icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </div>
      <span v-if="!isOpen && store.chatMessages.length === 0" class="fab-badge">AI</span>
    </button>
  </div>
</template>

<script setup>
import { ref, nextTick, watch, onMounted } from 'vue';
import { useGolfbotStore } from '../stores/golfbot';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const store = useGolfbotStore();

// Render Markdown and KaTeX math formulas safely
const renderContent = (text) => {
  if (!text) return '';
  
  // 1. Escape HTML to prevent XSS
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // 2. Extract math formulas to placeholders to protect from markdown parser
  const mathBlocks = [];
  
  // Block math \[ ... \]
  escaped = escaped.replace(/\\\[([\s\S]*?)\\\]/g, (match, math) => {
    try {
      const rawMath = math.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      const rendered = katex.renderToString(rawMath, { displayMode: true, throwOnError: false });
      const placeholder = `__MATH_BLOCK_${mathBlocks.length}__`;
      mathBlocks.push(`<div class="katex-block-wrapper">${rendered}</div>`);
      return placeholder;
    } catch (err) {
      return match;
    }
  });

  // Inline math \( ... \)
  escaped = escaped.replace(/\\\(([\s\S]*?)\\\)/g, (match, math) => {
    try {
      const rawMath = math.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      const rendered = katex.renderToString(rawMath, { displayMode: false, throwOnError: false });
      const placeholder = `__MATH_BLOCK_${mathBlocks.length}__`;
      mathBlocks.push(rendered);
      return placeholder;
    } catch (err) {
      return match;
    }
  });

  // 3. Simple Markdown parsing
  // Bold: **text**
  escaped = escaped.replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>');
  
  // Italic: *text*
  escaped = escaped.replace(/\*([\s\S]*?)\*/g, '<em>$1</em>');
  
  // Inline code: `code`
  escaped = escaped.replace(/`([^`]+)`/g, '<code class="chat-code">$1</code>');

  // Convert newlines to br
  escaped = escaped.replace(/\n/g, '<br>');

  // 4. Restore math blocks
  mathBlocks.forEach((renderedHtml, index) => {
    escaped = escaped.replace(`__MATH_BLOCK_${index}__`, renderedHtml);
  });

  return escaped;
};
const isOpen = ref(false);
const inputMsg = ref('');
const messageList = ref(null);
const inputField = ref(null);
const showClearConfirm = ref(false);

onMounted(() => {
  store.fetchAgentHistory();
});

const toggleChat = () => {
  isOpen.value = !isOpen.value;
  showClearConfirm.value = false;
  if (isOpen.value) {
    nextTick(() => {
      scrollToBottom();
      if (inputField.value) {
        inputField.value.focus();
      }
    });
  }
};

const sendMessage = async () => {
  const text = inputMsg.value.trim();
  if (!text || store.isAgentThinking) return;
  inputMsg.value = '';
  await store.sendAgentMessage(text);
  scrollToBottom();
};

const isRecording = ref(false);
let mediaRecorder = null;
let audioChunks = [];

const toggleRecording = async () => {
  if (isRecording.value) {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    isRecording.value = false;
  } else {
    audioChunks = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        stream.getTracks().forEach(track => track.stop());
        
        if (audioBlob.size > 100) {
          await store.sendVoiceAgentMessage(audioBlob);
          scrollToBottom();
        }
      };

      mediaRecorder.start();
      isRecording.value = true;
    } catch (err) {
      console.error('Failed to access microphone:', err);
      alert('마이크 사용 권한을 허용해 주세요.');
    }
  }
};

const useExample = (text) => {
  inputMsg.value = text;
  if (inputField.value) {
    inputField.value.focus();
  }
};

const confirmClearHistory = () => {
  store.clearAgentHistory();
  showClearConfirm.value = false;
};

const scrollToBottom = () => {
  nextTick(() => {
    if (messageList.value) {
      messageList.value.scrollTop = messageList.value.scrollHeight;
    }
  });
};

watch(() => store.chatMessages.length, scrollToBottom);
watch(() => store.isAgentThinking, scrollToBottom);
</script>

<style scoped>
.floating-chat-container {
  position: fixed;
  bottom: 0;
  right: 0;
  z-index: 9999;
}

/* Floating Action Button (FAB) */
.fab-button {
  position: fixed;
  bottom: 32px;
  right: 32px;
  width: 56px;
  height: 56px;
  border-radius: var(--radius-full);
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  border: none;
  box-shadow: 0 4px 24px rgba(0, 102, 204, 0.35);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  outline: none;
}

.fab-button:hover {
  background-color: var(--color-primary-focus);
  transform: translateY(-2px);
  box-shadow: 0 6px 28px rgba(0, 102, 204, 0.45);
}

.fab-button:active {
  transform: scale(0.95);
}

.fab-button.is-open {
  background-color: var(--color-surface-black);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.fab-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.fab-icon {
  width: 100%;
  height: 100%;
}

.fab-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background-color: #ff3b30;
  color: white;
  font-size: 9px;
  font-weight: 700;
  padding: 3px 6px;
  border-radius: var(--radius-pill);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

/* Chat Window */
.chat-window {
  position: fixed;
  bottom: 100px;
  right: 32px;
  width: 380px;
  height: 520px;
  max-height: calc(100vh - 140px);
  max-width: calc(100vw - 64px);
  border-radius: var(--radius-lg);
  background-color: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--color-divider-soft);
  box-shadow: var(--shadow-product);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.35s cubic-bezier(0.25, 0.8, 0.25, 1);
}

/* Header */
.chat-header {
  padding: var(--space-md);
  background-color: rgba(255, 255, 255, 0.4);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title-group {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.header-status-indicator {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background-color: var(--color-ink-muted-48);
  transition: background-color 0.3s ease;
}

.header-status-indicator.is-active {
  background-color: #34c759;
}

.header-text {
  display: flex;
  flex-direction: column;
}

.header-title {
  font: var(--text-body-strong);
  color: var(--color-ink);
  font-size: 15px;
}

.header-subtitle {
  font: var(--text-caption);
  color: var(--color-ink-muted-48);
  font-size: 11px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.header-action-btn {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: var(--space-xxs);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}

.header-action-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  font-weight: 300;
  color: var(--color-ink-muted-48);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-full);
  transition: all 0.2s ease;
}

.close-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: var(--color-ink);
}

/* Message List */
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  background-color: rgba(255, 255, 255, 0.2);
}

/* Custom Scrollbar for Message List */
.message-list::-webkit-scrollbar {
  width: 6px;
}
.message-list::-webkit-scrollbar-track {
  background: transparent;
}
.message-list::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}
.message-list::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 100%;
  padding: var(--space-lg);
  color: var(--color-ink-muted-48);
}

.empty-icon {
  font-size: 40px;
  margin-bottom: var(--space-xs);
}

.empty-title {
  font: var(--text-body-strong);
  color: var(--color-ink);
  margin-bottom: var(--space-xxs);
}

.empty-desc {
  font: var(--text-caption);
  color: var(--color-ink-muted-48);
  line-height: 1.5;
}

.examples-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin-top: var(--space-md);
  align-items: center;
}

.example-tag {
  display: inline-block;
  padding: 6px 14px;
  background-color: var(--color-canvas-parchment);
  color: var(--color-primary);
  border-radius: var(--radius-pill);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--color-divider-soft);
  transition: all 0.2s ease;
  width: fit-content;
}

.example-tag:hover {
  background-color: rgba(0, 102, 204, 0.05);
  border-color: rgba(0, 102, 204, 0.15);
  transform: translateY(-1px);
}

/* Message Bubble Wrapper */
.message-bubble-wrapper {
  display: flex;
  width: 100%;
  animation: fade-in 0.25s ease-out;
}

.message-bubble-wrapper.user {
  justify-content: flex-end;
}

.message-bubble-wrapper.assistant {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 80%;
  padding: 10px 14px;
  font-size: 14px;
  line-height: 1.45;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.user .message-bubble {
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  border-radius: 18px 18px 4px 18px;
}

.assistant .message-bubble {
  background-color: var(--color-canvas-parchment);
  color: var(--color-ink);
  border-radius: 18px 18px 18px 4px;
  border: 1px solid rgba(0, 0, 0, 0.03);
}

.message-content {
  word-break: break-word;
}

.katex-block-wrapper {
  margin: var(--space-xs) 0;
  overflow-x: auto;
  padding: 4px;
}

.chat-code {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-family: monospace;
  font-size: 0.9em;
}

/* Thinking Bubble & Loader */
.thinking-bubble {
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: var(--color-canvas-parchment);
  border-radius: 18px 18px 18px 4px;
}

.thinking-loader {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 10px;
}

.thinking-loader span {
  width: 6px;
  height: 6px;
  background-color: var(--color-ink-muted-48);
  border-radius: 50%;
  display: inline-block;
  animation: bounce 1.4s infinite ease-in-out both;
}

.thinking-loader span:nth-child(1) { animation-delay: -0.32s; }
.thinking-loader span:nth-child(2) { animation-delay: -0.16s; }

.thinking-text {
  font-size: 12px;
  color: var(--color-ink-muted-48);
  font-weight: 500;
}

/* Input Area */
.input-area {
  padding: var(--space-md);
  background-color: rgba(255, 255, 255, 0.6);
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  gap: var(--space-xs);
  align-items: center;
}

.mic-btn {
  background-color: var(--color-canvas-parchment);
  color: var(--color-primary);
  border: 1px solid rgba(0, 102, 204, 0.2);
  border-radius: var(--radius-full);
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.mic-btn:hover:not(:disabled) {
  background-color: rgba(0, 102, 204, 0.05);
  transform: scale(1.05);
}

.mic-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.mic-btn:disabled {
  background-color: var(--color-surface-chip-translucent);
  color: var(--color-ink-muted-48);
  border-color: transparent;
  cursor: not-allowed;
  box-shadow: none;
}

.mic-btn.is-recording {
  background-color: #ff3b30;
  color: white;
  border-color: transparent;
  animation: mic-pulse 1.5s infinite;
  box-shadow: 0 0 12px rgba(255, 59, 48, 0.5);
}

.chat-input.recording-active {
  border-color: rgba(255, 59, 48, 0.5);
  box-shadow: 0 0 0 3px rgba(255, 59, 48, 0.1);
  color: #ff3b30;
}

@keyframes mic-pulse {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 59, 48, 0.7); }
  70% { transform: scale(1.08); box-shadow: 0 0 0 10px rgba(255, 59, 48, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 59, 48, 0); }
}

.chat-input {
  flex: 1;
  background-color: var(--color-canvas);
  color: var(--color-ink);
  font: var(--text-body);
  font-size: 14px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: var(--radius-pill);
  padding: 10px 16px;
  height: 40px;
  outline: none;
  transition: all 0.2s ease;
}

.chat-input:focus {
  border-color: rgba(0, 102, 204, 0.5);
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.chat-input:disabled {
  background-color: var(--color-canvas-parchment);
  color: var(--color-ink-muted-48);
  cursor: not-allowed;
}

.send-btn {
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  border: none;
  border-radius: var(--radius-full);
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 102, 204, 0.2);
}

.send-btn:hover:not(:disabled) {
  background-color: var(--color-primary-focus);
  transform: scale(1.05);
}

.send-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.send-btn:disabled {
  background-color: var(--color-surface-chip-translucent);
  color: var(--color-ink-muted-48);
  cursor: not-allowed;
  box-shadow: none;
}

/* Animations */
@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Transitions */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.35s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(30px) scale(0.95);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.confirm-clear-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 2px 0;
  animation: fade-in 0.2s ease-out;
}

.confirm-clear-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-ink);
}

.confirm-clear-actions {
  display: flex;
  gap: var(--space-xs);
}

.confirm-btn {
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  border-radius: var(--radius-sm);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.confirm-btn.yes {
  background-color: #ff3b30;
  color: white;
}

.confirm-btn.yes:hover {
  background-color: #e02e24;
}

.confirm-btn.no {
  background-color: var(--color-surface-chip-translucent);
  color: var(--color-ink);
}

.confirm-btn.no:hover {
  background-color: rgba(0, 0, 0, 0.08);
}
</style>
