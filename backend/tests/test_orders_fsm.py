import pytest

from app.modules.orders.fsm import TransitionRequest, can_transition


def test_fsm_allows_admin_operational_transitions():
    can_transition(TransitionRequest(from_code="CONFIRMADO", to_code="EN_PREPARACION", actor_type="admin"))
    can_transition(TransitionRequest(from_code="EN_PREPARACION", to_code="EN_CAMINO", actor_type="admin"))
    can_transition(TransitionRequest(from_code="EN_CAMINO", to_code="ENTREGADO", actor_type="admin"))


def test_fsm_allows_kitchen_preparation_transitions_only():
    can_transition(TransitionRequest(from_code="CONFIRMADO", to_code="EN_PREPARACION", actor_type="kitchen"))
    can_transition(TransitionRequest(from_code="EN_PREPARACION", to_code="EN_CAMINO", actor_type="kitchen"))

    with pytest.raises(Exception) as exc:
        can_transition(TransitionRequest(from_code="EN_CAMINO", to_code="ENTREGADO", actor_type="kitchen"))
    assert getattr(exc.value, "code", "") == "ORDER_FORBIDDEN_TRANSITION"

    with pytest.raises(Exception) as exc:
        can_transition(TransitionRequest(from_code="CONFIRMADO", to_code="CANCELADO", actor_type="kitchen"))
    assert getattr(exc.value, "code", "") == "ORDER_FORBIDDEN_TRANSITION"


def test_fsm_rejects_invalid_transition():
    with pytest.raises(Exception) as exc:
        can_transition(TransitionRequest(from_code="PENDIENTE", to_code="ENTREGADO", actor_type="admin"))
    assert getattr(exc.value, "code", "") == "ORDER_INVALID_TRANSITION"


def test_fsm_rejects_terminal_transitions():
    with pytest.raises(Exception) as exc:
        can_transition(TransitionRequest(from_code="CANCELADO", to_code="CONFIRMADO", actor_type="admin"))
    assert getattr(exc.value, "code", "") == "ORDER_TERMINAL_STATE"


def test_fsm_customer_only_own_pending_cancel():
    can_transition(TransitionRequest(from_code="PENDIENTE", to_code="CANCELADO", actor_type="customer", is_owner=True))
    with pytest.raises(Exception) as exc:
        can_transition(TransitionRequest(from_code="PENDIENTE", to_code="CANCELADO", actor_type="customer", is_owner=False))
    assert getattr(exc.value, "code", "") == "ORDER_FORBIDDEN_TRANSITION"


def test_fsm_system_payment_only():
    can_transition(TransitionRequest(from_code="PENDIENTE", to_code="CONFIRMADO", actor_type="system", source="payment"))
    with pytest.raises(Exception) as exc:
        can_transition(TransitionRequest(from_code="PENDIENTE", to_code="CONFIRMADO", actor_type="system", source="api"))
    assert getattr(exc.value, "code", "") == "ORDER_FORBIDDEN_TRANSITION"
