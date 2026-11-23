"""Select JS action builds affected by a Renovate PR's changed paths."""
import json
import sys

ACTION_NODES = {
    "assets-action": "26",
    "cla-assistant": "26",
    "container-package-cleanup": "24",
    "custom-event": "26",
    "metadata-action": "26",
    "pr-assigner": "26",
}


def select_actions(paths):
    shared_changed = any(path.startswith("packages/action-logger/") for path in paths)
    return [
        {"action": action, "node": node}
        for action, node in ACTION_NODES.items()
        if shared_changed or any(path.startswith(f"actions/{action}/") for path in paths)
    ]


if __name__ == "__main__":
    print(json.dumps({"include": select_actions(json.load(sys.stdin))}))
