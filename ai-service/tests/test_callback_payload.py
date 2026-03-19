from datetime import UTC

from app.models.hybrid_events import CallbackPayload, HybridReasoningResponse
from app.utils.callback_utils import build_callback_urls


def test_callback_payload_serializes_timestamp_with_timezone() -> None:
    response = HybridReasoningResponse(
        proof_id="proof-123",
        trust_score=88,
        is_valid=True,
    )

    payload = CallbackPayload.from_response(response)
    serialized = payload.model_dump(mode="json")

    assert payload.timestamp.tzinfo == UTC
    assert serialized["timestamp"].endswith("Z")


def test_build_callback_urls_skips_direct_path_for_gateway_base_url() -> None:
    urls = build_callback_urls(
        base_url="http://localhost:8080",
        configured_endpoint="/proofs/internal/hybrid-callback",
        gateway_path="/api/core/proofs/internal/hybrid-callback",
        direct_path="/proofs/internal/hybrid-callback",
    )

    assert urls == ["http://localhost:8080/api/core/proofs/internal/hybrid-callback"]
