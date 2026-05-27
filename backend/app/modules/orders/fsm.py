from dataclasses import dataclass
from typing import Literal

from app.modules.orders.errors import (
    order_forbidden_transition,
    order_invalid_transition,
    order_terminal_state,
)

ActorType = Literal["customer", "admin", "kitchen", "system"]

TERMINAL_STATES = {"ENTREGADO", "CANCELADO"}

ALLOWED_TRANSITIONS: dict[str | None, dict[str, set[ActorType]]] = {
    None: {"PENDIENTE": {"customer"}},
    "PENDIENTE": {
        "CONFIRMADO": {"admin", "system"},
        "CANCELADO": {"customer", "admin", "system"},
    },
    "CONFIRMADO": {
        "EN_PREPARACION": {"admin", "kitchen"},
        "CANCELADO": {"admin"},
    },
    "EN_PREPARACION": {
        "EN_CAMINO": {"admin", "kitchen"},
        "CANCELADO": {"admin"},
    },
    "EN_CAMINO": {"ENTREGADO": {"admin"}},
}


@dataclass(frozen=True)
class TransitionRequest:
    from_code: str | None
    to_code: str
    actor_type: ActorType
    is_owner: bool = False
    source: str = "api"


def can_transition(req: TransitionRequest) -> None:
    if req.from_code in TERMINAL_STATES:
        raise order_terminal_state(current_state=req.from_code)

    allowed_targets = ALLOWED_TRANSITIONS.get(req.from_code, {})
    allowed_actors = allowed_targets.get(req.to_code)
    if allowed_actors is None:
        raise order_invalid_transition(from_state=req.from_code, to_state=req.to_code)

    if req.actor_type not in allowed_actors:
        raise order_forbidden_transition(actor_type=req.actor_type, from_state=req.from_code, to_state=req.to_code)

    if req.actor_type == "customer":
        is_creation = req.from_code is None and req.to_code == "PENDIENTE"
        is_own_pending_cancel = req.from_code == "PENDIENTE" and req.to_code == "CANCELADO" and req.is_owner
        if not (is_creation or is_own_pending_cancel):
            raise order_forbidden_transition(actor_type=req.actor_type, from_state=req.from_code, to_state=req.to_code)

    if req.actor_type == "system":
        if req.source != "payment":
            raise order_forbidden_transition(actor_type=req.actor_type, from_state=req.from_code, to_state=req.to_code)
        if req.to_code not in {"CONFIRMADO", "CANCELADO"}:
            raise order_forbidden_transition(actor_type=req.actor_type, from_state=req.from_code, to_state=req.to_code)
