"""Pre-built behavior library with 15+ kid-friendly behaviors."""
from dataclasses import dataclass

@dataclass
class Behavior:
    id: str
    name: str
    emoji: str
    description: str
    animation: str
    duration_ms: int
    color: str
    python_snippet: str
    category: str = "general"

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "emoji": self.emoji,
            "description": self.description,
            "animation": self.animation,
            "duration_ms": self.duration_ms,
            "color": self.color,
            "python_snippet": self.python_snippet,
            "category": self.category,
        }

BEHAVIORS: list[Behavior] = [
    Behavior("wave",        "Wave Hello",    "👋", "Reachy waves hello!",             "wave",        2000, "#4CAF50", 'reachy.wave_hello()',                       "greeting"),
    Behavior("nod",         "Nod Yes",       "✅", "Reachy nods yes",                 "nod",         1500, "#2196F3", 'reachy.nod(times=2)',                        "response"),
    Behavior("shake_head",  "Shake No",      "❌", "Reachy shakes head no",           "shake_head",  1500, "#f44336", 'reachy.shake_head(times=2)',                 "response"),
    Behavior("dance",       "Dance!",        "🕺", "Reachy does a little dance",      "dance",       3000, "#9C27B0", 'reachy.dance(style="happy")',                "fun"),
    Behavior("surprised",   "Surprised",     "😲", "Reachy looks surprised",          "surprised",   2000, "#FF9800", 'reachy.surprised()',                        "emotion"),
    Behavior("happy",       "Happy",         "😊", "Reachy is happy!",                "happy",       2000, "#FFEB3B", 'reachy.show_emotion("happy")',              "emotion"),
    Behavior("sad",         "Sad",           "😢", "Reachy feels sad",                "sad",         2000, "#607D8B", 'reachy.show_emotion("sad")',                "emotion"),
    Behavior("spin",        "Spin Around",   "🌀", "Reachy spins around",             "spin",        2500, "#00BCD4", 'reachy.spin(turns=1)',                      "movement"),
    Behavior("look_left",   "Look Left",     "👈", "Reachy looks to the left",        "look_left",   1000, "#795548", 'reachy.head.look_at(x=0, y=0.3, z=0)',     "movement"),
    Behavior("look_right",  "Look Right",    "👉", "Reachy looks to the right",       "look_right",  1000, "#795548", 'reachy.head.look_at(x=0, y=-0.3, z=0)',    "movement"),
    Behavior("look_up",     "Look Up",       "👆", "Reachy looks up",                 "look_up",     1000, "#009688", 'reachy.head.look_at(x=0, y=0, z=0.3)',     "movement"),
    Behavior("thinking",    "Thinking…",     "🤔", "Reachy is thinking",              "thinking",    3000, "#3F51B5", 'reachy.think()',                            "expression"),
    Behavior("sleeping",    "Sleep",         "😴", "Reachy goes to sleep",            "sleeping",    3000, "#9E9E9E", 'reachy.sleep()',                            "expression"),
    Behavior("excited",     "Excited!",      "🎉", "Reachy is super excited!",        "excited",     2500, "#E91E63", 'reachy.excited()',                          "emotion"),
    Behavior("celebrate",   "Celebrate",     "🏆", "Reachy celebrates!",              "celebrate",   3000, "#FF5722", 'reachy.celebrate()',                        "fun"),
    Behavior("stretch",     "Stretch",       "🙆", "Reachy stretches",                "stretch",     2000, "#8BC34A", 'reachy.stretch()',                          "movement"),
    Behavior("greet",       "Say Hello",     "🤖", "Reachy says hi in robot voice",   "greet",       2000, "#FF4081", 'reachy.say("Hello! I am Reachy!")',         "greeting"),
]

BEHAVIORS_BY_ID: dict[str, Behavior] = {b.id: b for b in BEHAVIORS}
