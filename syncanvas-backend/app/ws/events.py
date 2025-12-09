import json
from typing import Dict

def mk_server_event(payload: Dict, from_user: str):
    # match frontend format: flat event, NOT nested in payload
    event = dict(payload)
    event["from_user"] = from_user
    event["server_timestamp"] = int(__import__("time").time() * 1000)
    return event

def parse_client_event(raw_text: str):
    obj = json.loads(raw_text)
    if not isinstance(obj, dict):
        raise ValueError("event must be an object")
    return obj
