"""MockController — simulates Reachy Mini without physical hardware."""
import asyncio
import time
from typing import Optional, Callable, Awaitable
from .robot_controller import RobotController, RobotState
from .behaviors import BEHAVIORS_BY_ID, Behavior

StateCallback = Callable[[RobotState], Awaitable[None]]

class MockController(RobotController):
    """Simulates Reachy Mini. All behaviors run on timer, emit state via callbacks."""

    def __init__(self):
        self._state = RobotState()
        self._callbacks: list[StateCallback] = []

    def register_callback(self, cb: StateCallback) -> None:
        self._callbacks.append(cb)

    def unregister_callback(self, cb: StateCallback) -> None:
        self._callbacks.remove(cb)

    async def _emit(self, state: RobotState) -> None:
        for cb in list(self._callbacks):
            try:
                await cb(state)
            except Exception:
                pass

    async def trigger_behavior(self, behavior_id: str) -> RobotState:
        behavior = BEHAVIORS_BY_ID.get(behavior_id)
        if not behavior:
            raise ValueError(f"Unknown behavior: {behavior_id}")
        if self._state.is_busy:
            return self._state

        self._state = RobotState(
            current_behavior=behavior.id,
            animation=behavior.animation,
            is_busy=True,
            emotion=behavior.category,
            message=behavior.description,
        )
        await self._emit(self._state)
        asyncio.create_task(self._finish_behavior(behavior))
        return self._state

    async def _finish_behavior(self, behavior: Behavior) -> None:
        await asyncio.sleep(behavior.duration_ms / 1000)
        self._state = RobotState(
            current_behavior=None,
            animation="idle",
            is_busy=False,
            emotion="idle",
            message="",
        )
        await self._emit(self._state)

    async def play_sequence(self, behavior_ids: list[str]) -> list[RobotState]:
        states = []
        for bid in behavior_ids:
            if bid not in BEHAVIORS_BY_ID:
                continue
            while self._state.is_busy:
                await asyncio.sleep(0.1)
            state = await self.trigger_behavior(bid)
            states.append(state)
            behavior = BEHAVIORS_BY_ID[bid]
            await asyncio.sleep(behavior.duration_ms / 1000 + 0.2)
        return states

    def get_state(self) -> RobotState:
        return self._state

    async def stop(self) -> RobotState:
        self._state = RobotState(animation="idle", is_busy=False)
        await self._emit(self._state)
        return self._state
