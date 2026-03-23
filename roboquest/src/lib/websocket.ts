import { RobotCommand, RobotState, WsStatus, WsMessage } from './types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4002';

const MOCK_STATES: Record<string, Partial<RobotState>> = {
  wake_up:    { expression: 'happy',    eyes_open: true,  last_action: 'wake_up',    message: 'Good morning! Ready to play! ☀️' },
  sleep:      { expression: 'sleepy',   eyes_open: false, last_action: 'sleep',      message: 'Going to sleep... 💤' },
  wave:       { expression: 'happy',    eyes_open: true,  last_action: 'wave_right',  message: 'Waving with right hand! 👋' },
  look:       { expression: 'neutral',  eyes_open: true,  last_action: 'look_right', message: 'Looking around! 👀' },
  speak:      { expression: 'happy',    eyes_open: true,  last_action: 'speak',      message: 'Talking! 💬' },
  express:    { expression: 'excited',  eyes_open: true,  last_action: 'express',    message: 'Feeling excited! 🤩' },
  dance:      { expression: 'excited',  eyes_open: true,  last_action: 'dance_happy', message: 'Dancing! 🕺' },
  blink:      { expression: 'neutral',  eyes_open: true,  last_action: 'blink',      message: 'Blinking! 👁️' },
  nod:        { expression: 'happy',    eyes_open: true,  last_action: 'nod',        message: 'Nodding yes! ✅' },
  shake_head: { expression: 'neutral',  eyes_open: true,  last_action: 'shake_head', message: 'Shaking head no! ❌' },
  get_state:  { expression: 'neutral',  eyes_open: true,  last_action: 'idle',       message: 'Ready!' },
};

const DEFAULT_STATE: RobotState = {
  expression: 'neutral',
  eyes_open: true,
  last_action: 'idle',
  left_arm_angle: 0,
  right_arm_angle: 0,
  head_pan: 0,
  head_tilt: 0,
  is_busy: false,
  message: '🤖 Mock mode — no hardware needed!',
};

type MessageHandler = (msg: WsMessage) => void;
type StatusHandler = (status: WsStatus) => void;

class RobotWebSocket {
  private ws: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
  private status: WsStatus = 'disconnected';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private useMock = false;
  private mockState: RobotState = { ...DEFAULT_STATE };

  connect() {
    if (typeof window === 'undefined') return;
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.setStatus('connecting');
    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        this.useMock = false;
        this.setStatus('connected');
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      };

      this.ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data) as WsMessage;
          if (msg.robot) this.mockState = { ...this.mockState, ...msg.robot };
          this.messageHandlers.forEach(h => h(msg));
        } catch {
          console.warn('Invalid WS message:', evt.data);
        }
      };

      this.ws.onclose = () => {
        if (!this.useMock) {
          this.useMock = true;
          this.setStatus('mock');
          this.broadcastMockConnect();
        }
        // Attempt reconnect every 5s
        this.reconnectTimer = setTimeout(() => this.connect(), 5000);
      };

      this.ws.onerror = () => {
        this.useMock = true;
        this.setStatus('mock');
        this.broadcastMockConnect();
      };
    } catch {
      this.useMock = true;
      this.setStatus('mock');
      this.broadcastMockConnect();
    }
  }

  private broadcastMockConnect() {
    const msg: WsMessage = {
      type: 'connected',
      robot: this.mockState,
      mode: 'mock',
      message: '🤖 Mock mode active — running without hardware!',
    };
    this.messageHandlers.forEach(h => h(msg));
  }

  async sendCommand(command: RobotCommand): Promise<RobotState> {
    if (this.useMock || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return this.simulateMock(command);
    }

    return new Promise((resolve) => {
      const payload = JSON.stringify({ type: 'command', ...command });
      const handler: MessageHandler = (msg) => {
        if (msg.type === 'state' || msg.type === 'error') {
          this.messageHandlers.delete(handler);
          resolve(msg.robot ?? this.mockState);
        }
      };
      this.messageHandlers.add(handler);
      this.ws!.send(payload);

      // Timeout after 5s
      setTimeout(() => {
        this.messageHandlers.delete(handler);
        resolve(this.mockState);
      }, 5000);
    });
  }

  private async simulateMock(command: RobotCommand): Promise<RobotState> {
    // Simulate async delay
    const delay = command.action === 'dance' ? 1500 : 600;
    await new Promise(r => setTimeout(r, delay));

    const stateOverride = MOCK_STATES[command.action] ?? {};
    if (command.action === 'express' && command.params?.emotion) {
      stateOverride.expression = command.params.emotion as string;
      stateOverride.message = `Feeling ${command.params.emotion}!`;
    }
    if (command.action === 'speak' && command.params?.text) {
      stateOverride.message = `Saying: "${command.params.text}" 💬`;
    }

    this.mockState = { ...this.mockState, ...stateOverride };

    const msg: WsMessage = { type: 'state', robot: this.mockState, ok: true };
    this.messageHandlers.forEach(h => h(msg));
    return this.mockState;
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  private setStatus(status: WsStatus) {
    this.status = status;
    this.statusHandlers.forEach(h => h(status));
  }

  getStatus(): WsStatus { return this.status; }
  getState(): RobotState { return this.mockState; }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
  }
}

// Singleton
export const robotWs = new RobotWebSocket();
