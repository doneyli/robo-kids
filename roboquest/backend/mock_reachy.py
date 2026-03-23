"""
Mock Reachy Mini SDK — simulates robot hardware without physical device.
Wraps real SDK if available, falls back to pure simulation.
"""
import asyncio
import logging
import time
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class RobotState:
    expression: str = "neutral"  # neutral, happy, sad, excited, thinking, sleepy
    eyes_open: bool = True
    last_action: str = "idle"
    left_arm_angle: float = 0.0  # degrees
    right_arm_angle: float = 0.0
    head_pan: float = 0.0   # left/right degrees
    head_tilt: float = 0.0  # up/down degrees
    is_busy: bool = False
    message: str = ""


class MockReachyMini:
    """
    Mock implementation of Reachy Mini SDK.
    Simulates robot responses with realistic timing and state transitions.
    """

    def __init__(self):
        self.state = RobotState()
        self._action_history: list[dict] = []

    async def wave(self, hand: str = "right") -> RobotState:
        """Simulate a wave motion."""
        self.state.is_busy = True
        self.state.last_action = f"wave_{hand}"
        self.state.expression = "happy"
        self.state.message = f"Waving with {hand} hand! 👋"

        # Simulate arm motion
        if hand == "right":
            for angle in [0, 45, 90, 60, 90, 45, 0]:
                self.state.right_arm_angle = float(angle)
                await asyncio.sleep(0.15)
        else:
            for angle in [0, 45, 90, 60, 90, 45, 0]:
                self.state.left_arm_angle = float(angle)
                await asyncio.sleep(0.15)

        self.state.is_busy = False
        self._record_action("wave", {"hand": hand})
        return self.state

    async def look(self, direction: str = "center") -> RobotState:
        """Simulate head movement."""
        self.state.is_busy = True
        self.state.last_action = f"look_{direction}"

        directions = {
            "left": (-30.0, 0.0),
            "right": (30.0, 0.0),
            "up": (0.0, -20.0),
            "down": (0.0, 20.0),
            "center": (0.0, 0.0),
        }
        pan, tilt = directions.get(direction, (0.0, 0.0))

        # Smooth transition
        steps = 5
        current_pan = self.state.head_pan
        current_tilt = self.state.head_tilt
        for i in range(1, steps + 1):
            self.state.head_pan = current_pan + (pan - current_pan) * i / steps
            self.state.head_tilt = current_tilt + (tilt - current_tilt) * i / steps
            await asyncio.sleep(0.05)

        self.state.message = f"Looking {direction}! 👀"
        self.state.is_busy = False
        self._record_action("look", {"direction": direction})
        return self.state

    async def speak(self, text: str) -> RobotState:
        """Simulate robot speech (TTS handled on frontend)."""
        self.state.is_busy = True
        self.state.last_action = "speak"
        self.state.expression = "happy"
        self.state.message = f'Saying: "{text}" 💬'

        # Simulate speaking time (approx 0.07s per char)
        speak_time = min(len(text) * 0.07, 3.0)
        await asyncio.sleep(speak_time)

        self.state.is_busy = False
        self._record_action("speak", {"text": text})
        return self.state

    async def express(self, emotion: str) -> RobotState:
        """Change robot's facial expression."""
        valid_emotions = ["happy", "sad", "excited", "thinking", "sleepy", "neutral", "surprised"]
        if emotion not in valid_emotions:
            emotion = "neutral"

        self.state.expression = emotion
        self.state.last_action = f"express_{emotion}"
        self.state.message = f"Feeling {emotion}! 😊"

        expression_emojis = {
            "happy": "😊", "sad": "😢", "excited": "🤩",
            "thinking": "🤔", "sleepy": "😴", "neutral": "😐", "surprised": "😲"
        }
        self.state.message = f"Feeling {emotion}! {expression_emojis.get(emotion, '🤖')}"

        await asyncio.sleep(0.3)
        self._record_action("express", {"emotion": emotion})
        return self.state

    async def dance(self, style: str = "happy") -> RobotState:
        """Simulate a dance routine."""
        self.state.is_busy = True
        self.state.last_action = f"dance_{style}"
        self.state.expression = "excited"
        self.state.message = f"Dancing {style} style! 🕺"

        dance_moves = {
            "happy": [(45, -45), (-45, 45), (60, -60), (-60, 60), (0, 0)],
            "robot": [(90, 0), (0, 90), (45, 45), (90, 0), (0, 0)],
            "wave": [(30, 30), (60, 60), (90, 90), (60, 60), (0, 0)],
        }
        moves = dance_moves.get(style, dance_moves["happy"])

        for right, left in moves:
            self.state.right_arm_angle = float(right)
            self.state.left_arm_angle = float(left)
            await asyncio.sleep(0.3)

        self.state.is_busy = False
        self._record_action("dance", {"style": style})
        return self.state

    async def blink(self, count: int = 3) -> RobotState:
        """Simulate eye blinking."""
        self.state.last_action = "blink"
        self.state.message = f"Blinking {count} times! 👁️"

        for _ in range(count):
            self.state.eyes_open = False
            await asyncio.sleep(0.15)
            self.state.eyes_open = True
            await asyncio.sleep(0.25)

        self._record_action("blink", {"count": count})
        return self.state

    async def sleep_mode(self) -> RobotState:
        """Put robot to sleep."""
        self.state.expression = "sleepy"
        self.state.eyes_open = False
        self.state.last_action = "sleep"
        self.state.message = "Going to sleep... 💤"
        self.state.left_arm_angle = 0.0
        self.state.right_arm_angle = 0.0
        self.state.head_pan = 0.0
        self.state.head_tilt = 10.0  # head droops slightly

        await asyncio.sleep(0.5)
        self._record_action("sleep", {})
        return self.state

    async def wake_up(self) -> RobotState:
        """Wake up the robot."""
        self.state.expression = "happy"
        self.state.eyes_open = True
        self.state.last_action = "wake_up"
        self.state.head_tilt = 0.0
        self.state.message = "Good morning! Ready to play! ☀️"

        for _ in range(2):
            self.state.eyes_open = False
            await asyncio.sleep(0.1)
            self.state.eyes_open = True
            await asyncio.sleep(0.2)

        self._record_action("wake_up", {})
        return self.state

    async def nod(self, times: int = 2) -> RobotState:
        """Nod the head."""
        self.state.last_action = "nod"
        self.state.message = "Nodding yes! ✅"

        for _ in range(times):
            self.state.head_tilt = 15.0
            await asyncio.sleep(0.2)
            self.state.head_tilt = 0.0
            await asyncio.sleep(0.2)

        self._record_action("nod", {"times": times})
        return self.state

    async def shake_head(self) -> RobotState:
        """Shake head no."""
        self.state.last_action = "shake_head"
        self.state.message = "Shaking head no! ❌"

        for pan in [-20, 20, -20, 20, 0]:
            self.state.head_pan = float(pan)
            await asyncio.sleep(0.15)

        self._record_action("shake_head", {})
        return self.state

    def get_state(self) -> dict:
        """Return current state as dict."""
        return {
            "expression": self.state.expression,
            "eyes_open": self.state.eyes_open,
            "last_action": self.state.last_action,
            "left_arm_angle": self.state.left_arm_angle,
            "right_arm_angle": self.state.right_arm_angle,
            "head_pan": self.state.head_pan,
            "head_tilt": self.state.head_tilt,
            "is_busy": self.state.is_busy,
            "message": self.state.message,
        }

    def _record_action(self, action: str, params: dict):
        self._action_history.append({
            "action": action,
            "params": params,
            "timestamp": time.time(),
        })
        # Keep last 100 actions
        if len(self._action_history) > 100:
            self._action_history.pop(0)
