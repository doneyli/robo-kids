"""
RoboQuest WebSocket Server — Mock Reachy Mini backend.
Connects to frontend via WebSocket at ws://localhost:4002

Message protocol:
  Command (client → server):
    { "type": "command", "action": "<action>", "params": {...} }

  Response (server → client):
    { "type": "state", "robot": { <RobotState> }, "ok": true }
    { "type": "error", "message": "...", "ok": false }
    { "type": "update", "robot": { <RobotState> } }  # during long actions

  Ping/Pong:
    { "type": "ping" } → { "type": "pong" }
"""

import asyncio
import json
import logging
import os

import websockets  # type: ignore[import-untyped]

from mock_reachy import MockReachyMini

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

PORT = int(os.environ.get("ROBOQUEST_WS_PORT", "4002"))
connected_clients: set = set()
robot = MockReachyMini()


async def broadcast_state() -> None:
    """Send current robot state to all connected clients."""
    if not connected_clients:
        return
    state_msg = json.dumps({"type": "update", "robot": robot.get_state()})
    disconnected = set()
    for ws in list(connected_clients):
        try:
            await ws.send(state_msg)
        except Exception:
            disconnected.add(ws)
    connected_clients.difference_update(disconnected)


async def handle_command(ws: object, data: dict) -> dict:
    """Route a command to the mock robot and return the response."""
    action = data.get("action", "")
    params = data.get("params", {})

    logger.info(f"Command: {action} {params}")

    try:
        if action == "wake_up":
            await robot.wake_up()
        elif action == "sleep":
            await robot.sleep_mode()
        elif action == "wave":
            await robot.wave(params.get("hand", "right"))
        elif action == "look":
            await robot.look(params.get("direction", "center"))
        elif action == "speak":
            await robot.speak(params.get("text", "Hello!"))
        elif action == "express":
            await robot.express(params.get("emotion", "happy"))
        elif action == "dance":
            await robot.dance(params.get("style", "happy"))
        elif action == "blink":
            await robot.blink(int(params.get("count", 3)))
        elif action == "nod":
            await robot.nod(int(params.get("times", 2)))
        elif action == "shake_head":
            await robot.shake_head()
        elif action == "get_state":
            return {"type": "state", "robot": robot.get_state(), "ok": True}
        elif action == "run_sequence":
            sequence = params.get("sequence", [])
            results = []
            for cmd in sequence:
                sub = await handle_command(ws, {"action": cmd["action"], "params": cmd.get("params", {})})
                results.append(sub)
                await broadcast_state()
            return {"type": "sequence_complete", "robot": robot.get_state(), "results": results, "ok": True}
        else:
            return {"type": "error", "message": f"Unknown action: {action}", "ok": False}

        return {"type": "state", "robot": robot.get_state(), "ok": True}

    except Exception as e:
        logger.error(f"Error handling {action}: {e}")
        return {"type": "error", "message": str(e), "ok": False}


async def handler(ws: object) -> None:
    """Handle a WebSocket connection."""
    remote = getattr(ws, "remote_address", None)
    client_id = f"{remote[0]}:{remote[1]}" if remote else "unknown"
    connected_clients.add(ws)
    logger.info(f"Client connected: {client_id} (total: {len(connected_clients)})")

    try:
        await ws.send(json.dumps({  # type: ignore[attr-defined]
            "type": "connected",
            "robot": robot.get_state(),
            "mode": "mock",
            "message": "🤖 RoboQuest Mock Server ready!",
        }))

        async for message in ws:  # type: ignore[attr-defined]
            try:
                data = json.loads(message)
                msg_type = data.get("type", "")

                if msg_type == "ping":
                    await ws.send(json.dumps({"type": "pong"}))  # type: ignore[attr-defined]
                    continue

                if msg_type == "command":
                    response = await handle_command(ws, data)
                    await ws.send(json.dumps(response))  # type: ignore[attr-defined]
                    await broadcast_state()
                else:
                    await ws.send(json.dumps({  # type: ignore[attr-defined]
                        "type": "error",
                        "message": f"Unknown message type: {msg_type}",
                        "ok": False,
                    }))

            except json.JSONDecodeError:
                await ws.send(json.dumps({"type": "error", "message": "Invalid JSON", "ok": False}))  # type: ignore[attr-defined]
            except Exception as e:
                logger.error(f"Handler error: {e}")
                try:
                    await ws.send(json.dumps({"type": "error", "message": str(e), "ok": False}))  # type: ignore[attr-defined]
                except Exception:
                    pass

    except Exception:
        pass
    finally:
        connected_clients.discard(ws)
        logger.info(f"Client disconnected: {client_id} (total: {len(connected_clients)})")


async def main() -> None:
    logger.info(f"🤖 RoboQuest Mock Server starting on ws://localhost:{PORT}")
    logger.info("   Mock mode: no Reachy Mini hardware required")
    logger.info("   Press Ctrl+C to stop")

    async with websockets.serve(handler, "127.0.0.1", PORT):  # type: ignore[attr-defined]
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("\n✋ Server stopped")
