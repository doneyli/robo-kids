'use client';
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { robotWs } from '@/lib/websocket';
import { RobotState, WsStatus, RobotCommand } from '@/lib/types';

const DEFAULT_STATE: RobotState = {
  expression: 'neutral',
  eyes_open: true,
  last_action: 'idle',
  left_arm_angle: 0,
  right_arm_angle: 0,
  head_pan: 0,
  head_tilt: 0,
  is_busy: false,
  message: '🤖 Ready to play!',
};

interface RobotContextValue {
  robotState: RobotState;
  wsStatus: WsStatus;
  sendCommand: (cmd: RobotCommand) => Promise<RobotState>;
  isBusy: boolean;
}

const RobotContext = createContext<RobotContextValue>({
  robotState: DEFAULT_STATE,
  wsStatus: 'disconnected',
  sendCommand: async () => DEFAULT_STATE,
  isBusy: false,
});

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [robotState, setRobotState] = useState<RobotState>(DEFAULT_STATE);
  const [wsStatus, setWsStatus] = useState<WsStatus>('disconnected');
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    robotWs.connect();

    const unsubMsg = robotWs.onMessage((msg) => {
      if (msg.robot) setRobotState(msg.robot);
    });
    const unsubStatus = robotWs.onStatus(setWsStatus);

    return () => {
      unsubMsg();
      unsubStatus();
    };
  }, []);

  const sendCommand = useCallback(async (cmd: RobotCommand): Promise<RobotState> => {
    setIsBusy(true);
    try {
      const state = await robotWs.sendCommand(cmd);
      setRobotState(state);
      return state;
    } finally {
      setIsBusy(false);
    }
  }, []);

  return (
    <RobotContext.Provider value={{ robotState, wsStatus, sendCommand, isBusy }}>
      {children}
    </RobotContext.Provider>
  );
}

export function useRobot() {
  return useContext(RobotContext);
}

export function WsStatusBadge() {
  const { wsStatus } = useRobot();
  const configs = {
    connected:    { color: 'bg-green-500',  label: '🟢 Connected' },
    mock:         { color: 'bg-yellow-400', label: '🟡 Mock Mode' },
    connecting:   { color: 'bg-blue-400',   label: '🔵 Connecting...' },
    disconnected: { color: 'bg-red-400',    label: '🔴 Disconnected' },
  };
  const { color, label } = configs[wsStatus] ?? configs.disconnected;
  return (
    <span className={`text-xs font-bold px-3 py-1 rounded-full text-white ${color}`}>
      {label}
    </span>
  );
}
