from io import BytesIO

import pytest
from PIL import Image, ImageDraw

from app.models.hybrid_events import ClipAnalysisResult, GeminiAnalysisResult
from app.services.hybrid_reasoning import HybridReasoningService
from app.services.llm_reasoning import LlmReasoningService
from app.services.proof_rubric import assess_proof


def _build_receipt_like_image_bytes() -> bytes:
    image = Image.new("RGB", (1200, 1800), color=(95, 95, 95))
    draw = ImageDraw.Draw(image)
    draw.rectangle((430, 40, 780, 1740), fill=(245, 245, 245))

    buffer = BytesIO()
    image.save(buffer, format="JPEG", quality=90)
    return buffer.getvalue()


def test_invoice_preprocessing_adds_focus_crops_for_receipt_photos() -> None:
    service = LlmReasoningService()

    contents = service._build_invoice_contents("prompt", _build_receipt_like_image_bytes())

    assert len(contents) >= 4


@pytest.mark.anyio
async def test_bill_analysis_keeps_campaign_goal_unknown_when_extraction_is_incomplete(monkeypatch) -> None:
    async def fake_download_image(url: str) -> bytes:
        return b"fake-image"

    async def fake_analyze_invoice_detailed(*, image_bytes: bytes, withdrawal_reason: str, campaign_goal: str):
        return {
            "merchant_name": "",
            "invoice_date": "",
            "currency": "VND",
            "total_amount": 0,
            "items": [],
            "price_warnings": [],
            "serves_campaign_goal": None,
            "reasoning": "Khong du du lieu OCR de ket luan",
            "trust_score": 40,
            "extraction_confidence": 0.2,
        }

    monkeypatch.setattr("app.services.hybrid_reasoning.download_image", fake_download_image)
    monkeypatch.setattr(
        "app.services.hybrid_reasoning.llm_reasoning_service.analyze_invoice_detailed",
        fake_analyze_invoice_detailed,
    )

    service = HybridReasoningService()
    result = await service._analyze_bill_images(
        image_urls=["http://example.com/bill.jpg"],
        withdrawal_reason="mua thuc pham",
        campaign_goal="Ho tro thuc pham cho nguoi dan",
    )

    assert result.serves_campaign_goal is None
    assert result.bill_structurally_valid is False
    assert "Không đọc được tổng tiền hợp lệ trên hóa đơn" in result.validation_warnings


def test_unknown_campaign_goal_routes_to_manual_review_instead_of_hard_reject() -> None:
    breakdown = assess_proof(
        bill_score=92,
        scene_score=88,
        duplicate_risk_level="none",
        bill_warning_count=0,
        forensic_warning_count=0,
        serves_campaign_goal=None,
    )

    assert breakdown.decision == "NEEDS_REVIEW"


def test_final_summary_uses_readable_vietnamese_labels() -> None:
    service = HybridReasoningService()

    _, _, summary, _, _ = service._compute_final_score(
        ClipAnalysisResult(
            scene_relevance_score=0.64,
            scene_support_score=0.72,
            forensic_score=91,
            forensic_warnings=["Ảnh 1: Không có EXIF gốc"],
        ),
        GeminiAnalysisResult(
            total_amount=262531,
            items=[],
            price_warnings=["Giá một số mặt hàng chưa rõ"],
            validation_warnings=["Không đọc được danh sách mặt hàng"],
            serves_campaign_goal=None,
            bill_structurally_valid=False,
            trust_score=68,
        ),
    )

    assert "[Kết luận]" in summary
    assert "Đánh giá nghiệp vụ" in summary
    assert "Điểm tin cậy cuối cùng" in summary
