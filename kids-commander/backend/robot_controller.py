"""Abstract RobotController interface — swap MockController for ReachyController when hardware is ready."""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional

@dataclass
class RobotState:
    current_behavior: Optional[str] = None
    animation: Optional[str] = None
    is_busy: bool = False
    emotion: str = "idle"
    message: str = ""

class RobotController(ABC):
    """Abstract interface for Reachy Mini control. Implement with MockController or ReachyController."""

    @abstractmethod
    async def trigger_behavior(self, behavior_id: str) -> RobotState:
        """Trigger a named behavior and return updated state."""
        ...

    @abstractmethod
    async def play_sequence(self, behavior_ids: list[str]) -> list[RobotState]:
        """Play a sequence of behaviors in order."""
        ...

    @abstractmethod
    def get_state(self) -> RobotState:
        """Get current robot state."""
        ...

    @abstractmethod
    async def stop(self) -> RobotState:
        """Stop current behavior."""
        ...
