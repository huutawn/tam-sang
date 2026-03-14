import json
from pathlib import Path

import pytest

from app.services.proof_rubric import DEFAULT_RUBRIC, assess_proof, build_rubric


DATASET_PATH = Path(__file__).parent / "data" / "proof_rubric_cases.json"


def load_cases() -> list[dict]:
    return json.loads(DATASET_PATH.read_text(encoding="utf-8"))


@pytest.mark.parametrize("case", load_cases(), ids=lambda case: case["id"])
def test_proof_rubric_regression_cases(case: dict):
    breakdown = assess_proof(rubric=DEFAULT_RUBRIC, **case["inputs"])

    assert breakdown.decision == case["expected_decision"]
    assert case["expected_score_min"] <= breakdown.final_score <= case["expected_score_max"]
    assert breakdown.rubric_version == DEFAULT_RUBRIC.rubric_version


def test_build_rubric_supports_partial_overrides():
    rubric = build_rubric({"rubric_version": "custom-day5", "duplicate_penalty_high": 40})

    assert rubric.rubric_version == "custom-day5"
    assert rubric.duplicate_penalty_high == 40
    assert rubric.verified_threshold == DEFAULT_RUBRIC.verified_threshold


def test_build_rubric_rejects_unknown_fields():
    with pytest.raises(ValueError, match="Unknown rubric fields"):
        build_rubric({"not_a_real_field": 123})
