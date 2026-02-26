const fs = require('fs');

const generateCampaignReq = (i) => ({
    title: `Chiến dịch xây cầu yêu thương số ${i}`,
    content: `Cùng chung tay xây dựng cây cầu kiên cố cho bà con qua lại an toàn, dự án số ${i}.`,
    targetAmount: 50000000 + i * 10000000,
    images: [
        `https://example.com/images/camp_${i}_1.jpg`,
        `https://example.com/images/camp_${i}_2.jpg`
    ],
    startDate: new Date(Date.now() + i * 86400000).toISOString(),
    endDate: new Date(Date.now() + (i + 30) * 86400000).toISOString()
});

const generateDonationInitReq = (i) => ({
    campaignId: `camp_${i}`,
    amount: 100000 * i,
    donorName: i % 2 === 0 ? `Nguyễn Văn A${i}` : `Trần Thị B${i}`,
    message: `Ủng hộ chiến dịch phần công đức nhỏ số ${i}`
});

const generateDonationCompleteReq = (i) => ({
    donationId: `don_${1000 + i}`,
    campaignId: `camp_${i}`,
    amount: 100000 * i,
    donorName: i % 2 === 0 ? `Nguyễn Văn A${i}` : `Trần Thị B${i}`,
    message: `Ủng hộ chiến dịch phần công đức nhỏ số ${i}`,
    transactionHash: `0xabc123def456${i}`,
    blockIndex: 12345 + i
});

const generateWebhookReq = (i) => ({
    id: `txn_${i}`,
    gateway: "VNPAY",
    transactionDate: new Date().toISOString(),
    accountNumber: `012345678${i}`,
    code: `MB_00${i}`,
    content: `CHUYEN KHOAN TAMSANG ${i}`,
    transferType: "IN",
    transferAmount: 100000 * i,
    accumulated: `${10000000 + i * 100000}`,
    subAccount: "000",
    referenceCode: `REF${i}`,
    description: "Thanh toán thành công"
});

const generateHybridCallReq = (i) => ({
    proof_id: `proof_${i}`,
    trust_score: 85 + i,
    is_valid: i % 2 !== 0,
    analysis_summary: "Hình ảnh rõ nét, phù hợp chứng từ.",
    trust_hash: `hash_trust_${i}`,
    gemini_total_amount: 1000000.0 * i,
    gemini_items_count: i + 1,
    gemini_price_warnings: [],
    clip_scene_score: 0.95,
    duplicate_detected: false,
    timestamp: new Date().toISOString()
});

const generateWithdrawalReq = (i) => ({
    campaignId: `camp_${i}`,
    amount: 2000000 * i,
    reason: `Rút tiền thanh toán đợt ${i} cho nhà thầu xây dựng`,
    type: "STANDARD",
    quick: i % 3 === 0
});

const generateRejectReq = (i) => ({
    reason: `Chứng từ không hợp lệ lần ${i}, vui lòng chụp rõ nét hơn.`
});

const mockRequests = {
    // 2.1 Quản lý Chiến dịch
    "POST /campaigns (CreateCampaignRequest)": Array.from({ length: 5 }).map((_, i) => generateCampaignReq(i + 1)),

    // 2.2 Quản lý Quyên góp
    "POST /donations/init (InitDonationRequest)": Array.from({ length: 5 }).map((_, i) => generateDonationInitReq(i + 1)),

    "POST /donations/complete (DonationCompleteRequest)": Array.from({ length: 5 }).map((_, i) => generateDonationCompleteReq(i + 1)),

    // 2.3 Webhook
    "POST /webhook/payment (PaymentWebhookRequest)": Array.from({ length: 5 }).map((_, i) => generateWebhookReq(i + 1)),

    // 2.4 Quản lý Bằng chứng (POST /proofs dùng form-data nên không có JSON thuần, đây là callback)
    "POST /proofs/internal/hybrid-callback (HybridReasoningCallbackRequest)": Array.from({ length: 5 }).map((_, i) => generateHybridCallReq(i + 1)),

    // 2.5 Quản lý Rút tiền
    "POST /withdrawals (CreateWithdrawalRequest)": Array.from({ length: 5 }).map((_, i) => generateWithdrawalReq(i + 1)),

    "PUT /withdrawals/{id}/reject (RejectWithdrawalRequest)": Array.from({ length: 5 }).map((_, i) => generateRejectReq(i + 1))
};

fs.writeFileSync('d:/tamsang/core_mock_requests.json', JSON.stringify(mockRequests, null, 2), 'utf-8');
console.log('Successfully generated d:/tamsang/core_mock_requests.json');
