"""
TouchDesigner WebSocket DAT callbacks for Approach: Island.

Setup (see README.md):
  1. Add a WebSocket DAT, set Network Address to the relay
     (ws://127.0.0.1:8081) and Active on.
  2. Point the DAT's callbacks to this file.
  3. Optional: create a Table DAT named 'approach_state' to receive
     the latest values (station, clarity, sky progress, visitor x/z).

Outgoing (from this file, via the DAT's sendText):
  {"type":"hello","role":"td","protocol":1}
  {"type":"params","skyProgress":0.5,"intensity":1.2}
  {"type":"cue","name":"sunrise"}

Incoming from the website (already parsed as JSON):
  hello, approach, dwell, reveal, sky, presence, visitors, drift
"""

import json

# TouchDesigner will bind this name when the DAT runs in TD.
# A local default keeps the file importable outside TD.
try:
  me  # noqa: F821
except NameError:
  me = None


def _table(name="approach_state"):
  if me is None:
    return None
  try:
    return op(name)  # noqa: F821
  except Exception:
    return None


def _ensure_table(t):
  if t is None:
    return
  if t.numRows == 0:
    t.clear()
    t.appendRow(["key", "value"])


def _set(t, key, value):
  if t is None:
    return
  _ensure_table(t)
  row = t.row(key)
  if row is None:
    t.appendRow([key, value])
  else:
    t[key, "value"] = value


def onConnect(dat):
  """Identifies this machine as the TouchDesigner client."""
  dat.sendText(json.dumps({"type": "hello", "role": "td", "protocol": 1}))


def onDisconnect(dat):
  t = _table()
  _set(t, "connected", 0)


def onReceiveText(dat, rowIndex, message):
  try:
    msg = json.loads(message)
  except Exception:
    return
  if not isinstance(msg, dict):
    return
  t = _table()
  typ = msg.get("type")
  if typ == "hello":
    _set(t, "connected", 1)
    _set(t, "peer", msg.get("role", ""))
  elif typ == "approach":
    _set(t, "station", msg.get("station", ""))
    _set(t, "clarity", msg.get("clarity", 0))
    _set(t, "distance", msg.get("distance", 0))
  elif typ == "reveal":
    _set(t, "revealed", msg.get("station", ""))
  elif typ == "sky":
    _set(t, "sky", msg.get("progress", 0))
  elif typ == "presence" and msg.get("id") == "self":
    _set(t, "x", msg.get("x", 0))
    _set(t, "y", msg.get("y", 0))
    _set(t, "z", msg.get("z", 0))
    _set(t, "yaw", msg.get("yaw", 0))
  elif typ == "dwell":
    _set(t, "dwell", msg.get("station", ""))
  elif typ == "drift":
    _set(t, "drift_id", msg.get("id", ""))
    _set(t, "drift_text", msg.get("text", ""))
    _set(t, "drift_name", msg.get("name", ""))
    log = None
    try:
      log = op("drift_log")  # noqa: F821
    except Exception:
      log = None
    if log is not None:
      if log.numRows == 0:
        log.appendRow(["id", "text", "name", "ts"])
      log.appendRow([
        str(msg.get("id", "")),
        str(msg.get("text", "")),
        str(msg.get("name", "")),
        str(msg.get("ts", "")),
      ])


def onReceiveBinary(dat, contents):
  return


def onReceivePing(dat, contents):
  dat.sendPong(contents)


def onReceivePong(dat, contents):
  return


# Helpers you can call from a CHOP Execute or button in TD:

def send_params(dat, sky_progress=None, intensity=None):
  payload = {"type": "params"}
  if sky_progress is not None:
    payload["skyProgress"] = float(sky_progress)
  if intensity is not None:
    payload["intensity"] = float(intensity)
  dat.sendText(json.dumps(payload))


def send_cue(dat, name="sunrise"):
  dat.sendText(json.dumps({"type": "cue", "name": name}))
