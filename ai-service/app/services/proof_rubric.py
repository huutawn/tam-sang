"""
Central proof scoring rubric for the unified hybrid AI flow.

Day 1 goal:
- keep one proof-analysis narrative across the whole project
- avoid hardcoded weights scattered across services
- expose a review lane instead of forcing every non-perfect case to reject
"""

from dataclasses import dataclass
from typing import Literal


ProofDecision = Literal["VERIFIED", "NEEDS_REVIEW", "SUSPICIOUS"]


@dataclass(frozen=True)
class ProofScoringRubric:
    rubric_version: str = "day1-v1"
    bill_analysis_weight: float = 0.60
    scene_relevance_weight: float = 0.25
    clean_submission_bonus: int = 5
    duplicate_penalty: int = 25
    price_warning_penalty_per_warning: int = 5
    max_price_warning_penalty: int = 15
    verified_threshold: int = 80
    review_threshold: int = 55


@dataclass(frozen=True)
class ProofScoreBreakdown:
    bill_score: int
    scene_score: int
    duplicate_penalty: int
    price_penalty: int
    clean_bonus: int
    final_score: int
    decision: ProofDecision
    rubric_version: str


DEFAULT_RUBRIC = ProofScoringRubric()


def assess_proof(
    *,
    bill_score: int,
    scene_score: int,
    duplicate_detected: bool,
    bill_warning_count: int,
    serves_campaign_goal: bool,
    rubric: ProofScoringRubric = DEFAULT_RUBRIC,
) -> ProofScoreBreakdown:
    """
    Compute the Day 1 proof score and decision.

    The bill remains the dominant signal, scene evidence is supportive,
    and anti-fraud signals can heavily reduce trust.
    """
    normalized_bill = max(0, min(100, bill_score))
    normalized_scene = max(0, min(100, scene_score))

    weighted_score = int(
        normalized_bill * rubric.bill_analysis_weight
        + normalized_scene * rubric.scene_relevance_weight
    )

    duplicate_penalty = rubric.duplicate_penalty if duplicate_detected else 0
    price_penalty = min(
        bill_warning_count * rubric.price_warning_penalty_per_warning,
        rubric.max_price_warning_penalty,
    )
    clean_bonus = (
        rubric.clean_submission_bonus
        if not duplicate_detected and bill_warning_count == 0 and serves_campaign_goal
        else 0
    )

    final_score = max(0, min(100, weighted_score + clean_bonus - duplicate_penalty - price_penalty))

    if duplicate_detected or not serves_campaign_goal:
        decision: ProofDecision = "SUSPICIOUS"
    elif final_score >= rubric.verified_threshold:
        decision = "VERIFIED"
    elif final_score >= rubric.review_threshold:
        decision = "NEEDS_REVIEW"
    else:
        decision = "SUSPICIOUS"

    return ProofScoreBreakdown(
        bill_score=normalized_bill,
        scene_score=normalized_scene,
        duplicate_penalty=duplicate_penalty,
        price_penalty=price_penalty,
        clean_bonus=clean_bonus,
        final_score=final_score,
        decision=decision,
        rubric_version=rubric.rubric_version,
    )
