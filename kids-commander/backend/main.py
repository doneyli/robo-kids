"""FastAPI backend for Kids Commander."""
import json
import uuid
from pathlib import Path
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from .behaviors import BEHAVIORS, BEHAVIORS_BY_ID
from .mock_controller import MockController
from .robot_controller import RobotState

DATA_FILE = Path(__file__).parent.parent / "data" / "saved_sequences.json"

app = FastAPI(title="Kids Commander", version="1.0.0")
controller = MockController()


# ── Persistence ──────────────────────────────────────────────────────────────

def load_sequences() -> list[dict]:
    if DATA_FILE.exists():
        return json.loads(DATA_FILE.read_text())
    return []

def save_sequences(sequences: list[dict]) -> None:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    DATA_FILE.write_text(json.dumps(sequences, indent=2))


# ── WebSocket manager ─────────────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        self.active.remove(ws)

    async def broadcast(self, data: dict):
        dead = []
        for ws in self.active:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.active.remove(ws)

manager = ConnectionManager()

async def state_broadcast(state: RobotState):
    await manager.broadcast({
        "type": "state",
        "current_behavior": state.current_behavior,
        "animation": state.animation,
        "is_busy": state.is_busy,
        "emotion": state.emotion,
        "message": state.message,
    })

controller.register_callback(state_broadcast)


# ── Models ────────────────────────────────────────────────────────────────────

class TriggerRequest(BaseModel):
    behavior_id: str

class SequenceRequest(BaseModel):
    behavior_ids: list[str]

class SaveSequenceRequest(BaseModel):
    name: str
    emoji: str
    behavior_ids: list[str]


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/api/behaviors")
def get_behaviors():
    return [b.to_dict() for b in BEHAVIORS]

@app.get("/api/state")
def get_state():
    s = controller.get_state()
    return {
        "current_behavior": s.current_behavior,
        "animation": s.animation,
        "is_busy": s.is_busy,
        "emotion": s.emotion,
        "message": s.message,
    }

@app.post("/api/behaviors/trigger")
async def trigger_behavior(req: TriggerRequest):
    if req.behavior_id not in BEHAVIORS_BY_ID:
        raise HTTPException(status_code=404, detail=f"Behavior '{req.behavior_id}' not found")
    state = await controller.trigger_behavior(req.behavior_id)
    return {"ok": True, "state": state.__dict__}

@app.post("/api/sequences/play")
async def play_sequence(req: SequenceRequest):
    if not req.behavior_ids:
        raise HTTPException(status_code=400, detail="behavior_ids cannot be empty")
    import asyncio
    asyncio.create_task(controller.play_sequence(req.behavior_ids))
    return {"ok": True, "queued": req.behavior_ids}

@app.post("/api/sequences/stop")
async def stop_sequence():
    state = await controller.stop()
    return {"ok": True, "state": state.__dict__}

@app.get("/api/saved-sequences")
def get_saved_sequences():
    return load_sequences()

@app.post("/api/saved-sequences")
def create_saved_sequence(req: SaveSequenceRequest):
    sequences = load_sequences()
    new_seq = {
        "id": str(uuid.uuid4()),
        "name": req.name,
        "emoji": req.emoji,
        "behavior_ids": req.behavior_ids,
    }
    sequences.append(new_seq)
    save_sequences(sequences)
    return new_seq

@app.delete("/api/saved-sequences/{seq_id}")
def delete_saved_sequence(seq_id: str):
    sequences = load_sequences()
    sequences = [s for s in sequences if s["id"] != seq_id]
    save_sequences(sequences)
    return {"ok": True}

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        # Send current state immediately on connect
        s = controller.get_state()
        await ws.send_json({
            "type": "state",
            "current_behavior": s.current_behavior,
            "animation": s.animation,
            "is_busy": s.is_busy,
            "emotion": s.emotion,
            "message": s.message,
        })
        while True:
            await ws.receive_text()  # keep alive
    except WebSocketDisconnect:
        manager.disconnect(ws)


# ── Static files ──────────────────────────────────────────────────────────────

STATIC_DIR = Path(__file__).parent.parent / "static"
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.get("/")
def serve_index():
    return FileResponse(str(STATIC_DIR / "index.html"))
