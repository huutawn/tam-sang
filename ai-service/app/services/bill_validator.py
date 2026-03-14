"""
Local validator for bill extraction results.

Day 2 goal:
- make bill scoring explainable
- verify arithmetic after the LLM extraction step
- degrade trust when extraction is incomplete or inconsistent
"""

from dataclasses import dataclass
from typing import Any, Dict, List


UNKNOWN_ITEM_NAMES = {
    "",
    "unknown",
    "mat hang 1",
    "mat hang 2",
    "mặt hàng 1",
    "mặt hàng 2",
}


@dataclass(frozen=True)
class BillValidationResult:
    normalized_items: List[Dict[str, Any]]
    validation_warnings: List[str]
    adjusted_trust_score: int
    is_structurally_valid: bool
    computed_items_total: float
    detected_total_gap: float


def _to_float(value: Any) -> float:
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)

    text = str(value).strip()
    if not text:
        return 0.0

    text = text.replace("VND", "").replace("đ", "").replace(",", "").strip()
    try:
        return float(text)
    except ValueError:
        return 0.0


def _to_str(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def validate_bill_result(result: Dict[str, Any]) -> BillValidationResult:
    warnings: List[str] = []
    penalty = 0
    is_structurally_valid = True

    total_amount = _to_float(result.get("total_amount"))
    merchant_name = _to_str(result.get("merchant_name"))
    invoice_date = _to_str(result.get("invoice_date"))
    extraction_confidence = _to_float(result.get("extraction_confidence"))
    raw_items = result.get("items", []) or []
    normalized_items: List[Dict[str, Any]] = []

    if total_amount <= 0:
        warnings.append("Khong doc duoc tong tien hop le tren hoa don")
        penalty += 35
        is_structurally_valid = False

    if not merchant_name:
        warnings.append("Thieu ten don vi/phat hanh hoa don")
        penalty += 5

    if not invoice_date:
        warnings.append("Thieu ngay hoa don")
        penalty += 5

    if extraction_confidence and extraction_confidence < 0.5:
        warnings.append("Muc do tu tin trich xuat bill thap")
        penalty += 10

    if not raw_items:
        warnings.append("Khong doc duoc danh sach mat hang")
        penalty += 30
        is_structurally_valid = False

    computed_items_total = 0.0

    for index, item in enumerate(raw_items, start=1):
        name = _to_str(item.get("name"))
        quantity = max(_to_float(item.get("quantity")), 0.0)
        unit_price = max(_to_float(item.get("unit_price")), 0.0)
        total_price = max(_to_float(item.get("total_price")), 0.0)
        is_reasonable = bool(item.get("is_reasonable", True))

        if not name or name.lower() in UNKNOWN_ITEM_NAMES:
            warnings.append(f"Mat hang {index} co ten khong ro rang")
            penalty += 8

        if quantity <= 0:
            warnings.append(f"Mat hang {index} co so luong khong hop le")
            penalty += 8
            is_structurally_valid = False

        if unit_price <= 0:
            warnings.append(f"Mat hang {index} co don gia khong hop le")
            penalty += 8
            is_structurally_valid = False

        inferred_total = quantity * unit_price
        if total_price <= 0 and inferred_total > 0:
            total_price = inferred_total
            warnings.append(f"Mat hang {index} thieu thanh tien, da noi suy tu so luong x don gia")
            penalty += 3
        elif total_price > 0:
            item_tolerance = max(2000.0, inferred_total * 0.05)
            if inferred_total > 0 and abs(inferred_total - total_price) > item_tolerance:
                warnings.append(f"Mat hang {index} co sai lech giua thanh tien va so luong x don gia")
                penalty += 6
                is_structurally_valid = False

        computed_items_total += total_price
        normalized_items.append(
            {
                "name": name or f"Item {index}",
                "quantity": quantity,
                "unit_price": unit_price,
                "total_price": total_price,
                "is_reasonable": is_reasonable,
            }
        )

    detected_total_gap = abs(computed_items_total - total_amount)
    invoice_tolerance = max(3000.0, total_amount * 0.05)
    if total_amount > 0 and computed_items_total > 0 and detected_total_gap > invoice_tolerance:
        warnings.append("Tong tien hoa don lech dang ke so voi tong cac mat hang")
        penalty += 15
        is_structurally_valid = False

    base_score = int(_to_float(result.get("trust_score")))
    adjusted_trust_score = max(0, min(100, base_score - penalty))

    return BillValidationResult(
        normalized_items=normalized_items,
        validation_warnings=warnings,
        adjusted_trust_score=adjusted_trust_score,
        is_structurally_valid=is_structurally_valid,
        computed_items_total=computed_items_total,
        detected_total_gap=detected_total_gap,
    )
