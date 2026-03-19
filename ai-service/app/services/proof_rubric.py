"""
Central proof scoring rubric for the unified hybrid AI flow.

Day 3 focus:
- bill evidence remains dominant
- scene evidence now uses relevance + forensic support
- duplicate risk becomes graded instead of a brittle boolean
"""

from dataclasses import asdict, dataclass, fields
from typing import Any, Literal, Mapping


ProofDecision = Literal["VERIFIED", "NEEDS_REVIEW", "SUSPICIOUS"]
DuplicateRiskLevel = Literal["none", "low", "medium", "high", "unknown"]


@dataclass(frozen=True)
class ProofScoringRubric:
    rubric_version: str = "day3-v1"
    bill_analysis_weight: float = 0.60
    scene_support_weight: float = 0.25
    clean_submission_bonus: int = 5
    duplicate_penalty_low: int = 10
    duplicate_penalty_medium: int = 20
    duplicate_penalty_high: int = 35
    bill_warning_penalty_per_warning: int = 5
    max_bill_warning_penalty: int = 15
    forensic_warning_penalty_per_warning: int = 4
    max_forensic_warning_penalty: int = 12
    verified_threshold: int = 80
    review_threshold: int = 55

    def to_dict(self) -> dict[str, Any]:
        """Serialize the rubric so it can be exported or reused by CLI tooling."""
        return asdict(self)

    @classmethod
    def from_mapping(
        cls,
        overrides: Mapping[str, Any] | None = None,
        *,
        base: "ProofScoringRubric | None" = None,
    ) -> "ProofScoringRubric":
        """
        Build a rubric from a partial mapping.

        This keeps Day 5 tuning lightweight: we can override only the fields
        we want to experiment with while inheriting the stable defaults.
        """
        if overrides is None:
            return base or cls()

        source = (base or cls()).to_dict()
        valid_fields = {field.name for field in fields(cls)}
        unknown_keys = sorted(set(overrides) - valid_fields)
        if unknown_keys:
            raise ValueError(f"Unknown rubric fields: {', '.join(unknown_keys)}")

        for key, value in overrides.items():
            source[key] = value
        return cls(**source)


@dataclass(frozen=True)
class ProofScoreBreakdown:
    bill_score: int
    scene_score: int
    duplicate_penalty: int
    bill_warning_penalty: int
    forensic_warning_penalty: int
    clean_bonus: int
    final_score: int
    decision: ProofDecision
    rubric_version: str


DEFAULT_RUBRIC = ProofScoringRubric()


def build_rubric(
    overrides: Mapping[str, Any] | None = None,
    *,
    base: ProofScoringRubric = DEFAULT_RUBRIC,
) -> ProofScoringRubric:
    """Convenience wrapper used by tests and evaluation scripts."""
    return ProofScoringRubric.from_mapping(overrides, base=base)


def _resolve_duplicate_penalty(risk_level: DuplicateRiskLevel, rubric: ProofScoringRubric) -> int:
    if risk_level == "high":
        return rubric.duplicate_penalty_high
    if risk_level == "medium":
        return rubric.duplicate_penalty_medium
    if risk_level == "low":
        return rubric.duplicate_penalty_low
    if risk_level == "unknown":
        return rubric.duplicate_penalty_low
    return 0


def assess_proof(
    *,
    bill_score: int,
    scene_score: int,
    duplicate_risk_level: DuplicateRiskLevel,
    bill_warning_count: int,
    forensic_warning_count: int,
    serves_campaign_goal: bool | None,
    rubric: ProofScoringRubric = DEFAULT_RUBRIC,
) -> ProofScoreBreakdown:
    """
    Compute the Day 3 proof score and decision.

    Exact or high-confidence duplicate evidence should strongly impact the
    decision, but weaker forensic warnings should route to review instead of
    forcing an automatic rejection.
    """
    normalized_bill = max(0, min(100, bill_score))
    normalized_scene = max(0, min(100, scene_score))

    weighted_score = int(
        normalized_bill * rubric.bill_analysis_weight
        + normalized_scene * rubric.scene_support_weight
    )

    duplicate_penalty = _resolve_duplicate_penalty(duplicate_risk_level, rubric)
    bill_warning_penalty = min(
        bill_warning_count * rubric.bill_warning_penalty_per_warning,
        rubric.max_bill_warning_penalty,
    )
    forensic_warning_penalty = min(
        forensic_warning_count * rubric.forensic_warning_penalty_per_warning,
        rubric.max_forensic_warning_penalty,
    )
    clean_bonus = (
        rubric.clean_submission_bonus
        if duplicate_risk_level == "none"
        and bill_warning_count == 0
        and forensic_warning_count == 0
        and serves_campaign_goal is True
        else 0
    )

    final_score = max(
        0,
        min(
            100,
            weighted_score
            + clean_bonus
            - duplicate_penalty
            - bill_warning_penalty
            - forensic_warning_penalty,
        ),
    )

    if serves_campaign_goal is False or duplicate_risk_level == "high":
        decision: ProofDecision = "SUSPICIOUS"
    elif serves_campaign_goal is None:
        if final_score >= rubric.review_threshold:
            decision = "NEEDS_REVIEW"
        else:
            decision = "SUSPICIOUS"
    elif final_score >= rubric.verified_threshold and duplicate_risk_level == "none":
        decision = "VERIFIED"
    elif final_score >= rubric.review_threshold:
        decision = "NEEDS_REVIEW"
    else:
        decision = "SUSPICIOUS"

    return ProofScoreBreakdown(
        bill_score=normalized_bill,
        scene_score=normalized_scene,
        duplicate_penalty=duplicate_penalty,
        bill_warning_penalty=bill_warning_penalty,
        forensic_warning_penalty=forensic_warning_penalty,
        clean_bonus=clean_bonus,
        final_score=final_score,
        decision=decision,
        rubric_version=rubric.rubric_version,
    )
