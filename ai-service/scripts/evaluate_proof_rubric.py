import argparse
import json
from collections import Counter
from pathlib import Path

from app.services.proof_rubric import DEFAULT_RUBRIC, assess_proof, build_rubric


DEFAULT_DATASET = Path(__file__).resolve().parents[1] / "tests" / "data" / "proof_rubric_cases.json"


def load_json(path: Path) -> dict | list:
    return json.loads(path.read_text(encoding="utf-8"))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Evaluate the proof scoring rubric against a regression dataset."
    )
    parser.add_argument(
        "--dataset",
        type=Path,
        default=DEFAULT_DATASET,
        help=f"Path to the regression dataset JSON. Default: {DEFAULT_DATASET}",
    )
    parser.add_argument(
        "--rubric",
        type=Path,
        help="Optional JSON file with partial rubric overrides.",
    )
    parser.add_argument(
        "--show-passing",
        action="store_true",
        help="Print every passing case, not only mismatches.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    dataset_path: Path = args.dataset.resolve()

    cases = load_json(dataset_path)
    rubric_overrides = load_json(args.rubric.resolve()) if args.rubric else None
    rubric = build_rubric(rubric_overrides, base=DEFAULT_RUBRIC)

    total_cases = len(cases)
    passed_cases = 0
    decision_counter: Counter[str] = Counter()
    expected_counter: Counter[str] = Counter()
    confusion: Counter[tuple[str, str]] = Counter()
    rows: list[dict] = []

    for case in cases:
        breakdown = assess_proof(rubric=rubric, **case["inputs"])
        passed = (
            breakdown.decision == case["expected_decision"]
            and case["expected_score_min"] <= breakdown.final_score <= case["expected_score_max"]
        )
        if passed:
            passed_cases += 1

        expected_decision = case["expected_decision"]
        actual_decision = breakdown.decision
        expected_counter[expected_decision] += 1
        decision_counter[actual_decision] += 1
        confusion[(expected_decision, actual_decision)] += 1

        rows.append(
            {
                "id": case["id"],
                "description": case["description"],
                "expected_decision": expected_decision,
                "actual_decision": actual_decision,
                "expected_range": f"{case['expected_score_min']}-{case['expected_score_max']}",
                "actual_score": breakdown.final_score,
                "passed": passed,
            }
        )

    accuracy = (passed_cases / total_cases * 100) if total_cases else 0.0

    print(f"Dataset: {dataset_path}")
    print(f"Rubric version: {rubric.rubric_version}")
    print(f"Accuracy: {passed_cases}/{total_cases} ({accuracy:.2f}%)")
    print("")

    print("Expected decisions:")
    for decision, count in sorted(expected_counter.items()):
        print(f"  - {decision}: {count}")
    print("")

    print("Actual decisions:")
    for decision, count in sorted(decision_counter.items()):
        print(f"  - {decision}: {count}")
    print("")

    print("Confusion matrix:")
    for expected in sorted(expected_counter):
        for actual in sorted(decision_counter):
            print(f"  - expected={expected:12s} actual={actual:12s} count={confusion[(expected, actual)]}")
    print("")

    print("Case results:")
    for row in rows:
        if not args.show_passing and row["passed"]:
            continue
        status = "PASS" if row["passed"] else "FAIL"
        print(
            f"  [{status}] {row['id']}: expected={row['expected_decision']} "
            f"(score {row['expected_range']}), got={row['actual_decision']} "
            f"(score {row['actual_score']})"
        )
        if not row["passed"]:
            print(f"         {row['description']}")

    return 0 if passed_cases == total_cases else 1


if __name__ == "__main__":
    raise SystemExit(main())
