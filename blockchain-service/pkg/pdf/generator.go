package pdf

import (
	"bytes"
	"fmt"
	"strings"
	"time"

	"github.com/jung-kurt/gofpdf"
)

const (
	platformName           = "NEN TANG TAM SANG"
	platformRepresentative = "Bo phan quan tri he thong Tam Sang"
	documentTitle          = "THOA THUAN TAO VA VAN HANH CHIEN DICH THIEN NGUYEN"
	defaultTextPlaceholder = "Khong co thong tin"
	defaultDatePlaceholder = "Chua xac dinh"
	defaultDurationClause  = "Thoi han chien dich duoc tinh tu ngay bat dau den het ngay ket thuc neu khong co quyet dinh tam dung som hon."
)

// ContractData represents the data needed to generate a contract PDF.
type ContractData struct {
	ContractID             string
	CampaignID             string
	CampaignName           string
	Description            string
	OrganizerName          string
	OrganizerID            string
	OrganizerIDNumber      string
	PlatformName           string
	PlatformRepresentative string
	TargetAmount           float64
	Currency               string
	StartDate              time.Time
	EndDate                time.Time
	CreatedAt              time.Time
	SignedAt               time.Time
	SignatureAlgorithm     string
	PublicKeyID            string
}

// Generator handles PDF generation.
type Generator struct{}

// NewGenerator creates a new PDF generator.
func NewGenerator() *Generator {
	return &Generator{}
}

// GenerateContract generates a charity campaign agreement PDF in Vietnamese structure.
func (g *Generator) GenerateContract(data *ContractData) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetCompression(false)
	pdf.SetMargins(18, 18, 18)
	pdf.SetAutoPageBreak(true, 18)
	pdf.SetTitle(documentTitle, false)
	pdf.SetAuthor(firstNonEmpty(data.PlatformName, platformName), false)
	pdf.SetCreator("Tam Sang Blockchain Service", false)
	pdf.SetSubject("Thoa thuan tao va van hanh chien dich thien nguyen", false)
	pdf.SetKeywords("tam sang, contract, campaign, blockchain", false)
	pdf.AddPage()

	renderHeader(pdf, data)
	renderLegalBasis(pdf)
	renderPartySection(pdf, data)
	renderCampaignSection(pdf, data)
	renderTermsSection(pdf, data)
	renderDigitalEvidenceSection(pdf, data)
	renderSignatureSection(pdf, data)
	renderFooter(pdf, data)

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, fmt.Errorf("failed to generate PDF: %w", err)
	}

	return buf.Bytes(), nil
}

func renderHeader(pdf *gofpdf.Fpdf, data *ContractData) {
	pdf.SetFont("Times", "B", 15)
	pdf.CellFormat(0, 8, strings.ToUpper(firstNonEmpty(data.PlatformName, platformName)), "", 1, "C", false, 0, "")
	pdf.SetFont("Times", "", 11)
	pdf.CellFormat(0, 6, "He thong luu tru hop dong so va doi soat minh chung chien dich", "", 1, "C", false, 0, "")
	pdf.Ln(3)

	pdf.SetFont("Times", "B", 16)
	pdf.MultiCell(0, 8, documentTitle, "", "C", false)
	pdf.Ln(2)

	pdf.SetFont("Times", "I", 11)
	pdf.MultiCell(
		0,
		6,
		fmt.Sprintf(
			"Ma hop dong: %s | Ma chien dich: %s | Ngay lap: %s",
			formatIdentifier(data.ContractID),
			formatIdentifier(data.CampaignID),
			formatDateTimeVN(data.CreatedAt),
		),
		"",
		"C",
		false,
	)
	pdf.Ln(4)
	drawSeparator(pdf)
	pdf.Ln(5)
}

func renderLegalBasis(pdf *gofpdf.Fpdf) {
	renderSectionTitle(pdf, "I. CAN CU VA NGUYEN TAC AP DUNG")

	pdf.SetFont("Times", "", 11)
	pdf.MultiCell(0, 6, "Can cu Bo luat Dan su 2015 va nguyen tac giao ket hop dong tu nguyen, trung thuc, minh bach;", "", "J", false)
	pdf.MultiCell(0, 6, "Can cu Luat Giao dich dien tu 2023 va nhu cau tao chien dich thien nguyen tren nen tang so;", "", "J", false)
	pdf.MultiCell(0, 6, "Can cu thong tin dinh danh da duoc xac minh cua ben to chuc chien dich va quy che van hanh cua nen tang Tam Sang.", "", "J", false)
	pdf.Ln(3)
}

func renderPartySection(pdf *gofpdf.Fpdf, data *ContractData) {
	renderSectionTitle(pdf, "II. THONG TIN CAC BEN")

	renderPartyBlock(
		pdf,
		"BEN A - DON VI VAN HANH NEN TANG",
		[]string{
			fmt.Sprintf("Ten don vi: %s", firstNonEmpty(data.PlatformName, platformName)),
			fmt.Sprintf("Dai dien he thong: %s", firstNonEmpty(data.PlatformRepresentative, platformRepresentative)),
			"Vai tro: cung cap he thong tao chien dich, luu tru hop dong dien tu, luu vet giao dich va ho tro doi soat minh chung.",
		},
	)

	renderPartyBlock(
		pdf,
		"BEN B - BEN TO CHUC CHIEN DICH",
		[]string{
			fmt.Sprintf("Ho va ten: %s", formatText(data.OrganizerName)),
			fmt.Sprintf("Ma nguoi dung he thong: %s", formatIdentifier(data.OrganizerID)),
			fmt.Sprintf("So giay to dinh danh: %s", formatIdentifier(data.OrganizerIDNumber)),
			"Trang thai KYC: da duoc xac minh truoc khi tao chien dich.",
		},
	)
}

func renderCampaignSection(pdf *gofpdf.Fpdf, data *ContractData) {
	renderSectionTitle(pdf, "III. NOI DUNG CHIEN DICH")

	addLabelValue(pdf, "Ten chien dich", formatText(data.CampaignName))
	addLabelValue(pdf, "Muc tieu su dung quy", formatText(data.Description))
	addLabelValue(pdf, "Tong muc van dong", formatCurrency(data.TargetAmount, data.Currency))
	addLabelValue(pdf, "Thoi gian bat dau", formatDateVN(data.StartDate))
	addLabelValue(pdf, "Thoi gian ket thuc", formatDateVN(data.EndDate))
	addLabelValue(pdf, "Pham vi ap dung", "Tat ca giao dich va chung tu phat sinh tren nen tang Tam Sang lien quan den chien dich nay")

	pdf.SetFont("Times", "", 11)
	pdf.MultiCell(0, 6, defaultDurationClause, "", "J", false)
	pdf.Ln(3)
}

func renderTermsSection(pdf *gofpdf.Fpdf, data *ContractData) {
	renderSectionTitle(pdf, "IV. DIEU KHOAN THOA THUAN")

	clauses := []string{
		"1. Ben B cam ket thong tin khai bao de tao chien dich la trung thuc, hop le va phu hop muc dich thien nguyen da cong bo.",
		"2. Ben B chi duoc su dung tien dong gop dung muc dich, dung doi tuong thu huong va trong pham vi chien dich da dang ky.",
		"3. Moi dot giai ngan hoac chi tieu tu quy chien dich phai co bang chung gom hoa don, anh hien truong va cac minh chung lien quan theo yeu cau cua he thong.",
		"4. Ben A co quyen ap dung co che doi soat AI, luu vet blockchain, kiem tra trung lap, tam dung hoac chuyen xet duyet thu cong khi phat hien dau hieu bat thuong.",
		"5. Ben B dong y rang ket qua AI chi la cong cu ho tro doi soat; trong truong hop can thiet, Ben A duoc yeu cau bo sung tai lieu de xac minh.",
		"6. Ben B co nghia vu phoi hop, cung cap bo sung sao ke, bien nhan, giay xac nhan hoac giai trinh khi Ben A hoac co quan co tham quyen yeu cau.",
		"7. Ben A co trach nhiem luu tru hop dong, hash tai lieu, chu ky so va lich su doi soat de phuc vu truy vet khi co tranh chap.",
		"8. Du lieu ca nhan cua Ben B va nguoi dong gop duoc xu ly phuc vu muc dich van hanh nen tang, doi soat va tuan thu quy dinh phap luat hien hanh.",
		"9. Neu Ben B co hanh vi gian doi, su dung quy sai muc dich, che giau chung tu hoac co dau hieu tron tranh doi soat, Ben A co quyen tam dung chien dich va tu choi cac yeu cau giai ngan tiep theo.",
		"10. Moi tranh chap phat sinh duoc uu tien thuong luong; truong hop khong dat duoc thoa thuan, cac ben thong nhat ap dung phap luat Viet Nam de giai quyet.",
	}

	pdf.SetFont("Times", "", 11)
	for _, clause := range clauses {
		pdf.MultiCell(0, 6, clause, "", "J", false)
		pdf.Ln(1)
	}
	pdf.Ln(3)
}

func renderDigitalEvidenceSection(pdf *gofpdf.Fpdf, data *ContractData) {
	renderSectionTitle(pdf, "V. THONG TIN DOI SOAT VA KY SO")

	addLabelValue(pdf, "Ma hop dong", formatIdentifier(data.ContractID))
	addLabelValue(pdf, "Thoi diem ky so", formatDateTimeVN(data.SignedAt))
	addLabelValue(pdf, "Thuat toan chu ky", formatText(data.SignatureAlgorithm))
	addLabelValue(pdf, "Ma khoa cong khai", formatIdentifier(data.PublicKeyID))
	addLabelValue(pdf, "Co che luu vet", "Hop dong duoc luu tru tren blockchain-service va co the kiem tra tinh toan ven qua API verify")

	pdf.SetFont("Times", "", 11)
	pdf.MultiCell(
		0,
		6,
		"Tai lieu nay la phien ban hop dong dien tu duoc he thong tao tu dong. Gia tri doi soat bao gom hash tai lieu, chu ky so va lich su giao dich lien quan den chien dich.",
		"",
		"J",
		false,
	)
	pdf.Ln(3)
}

func renderSignatureSection(pdf *gofpdf.Fpdf, data *ContractData) {
	renderSectionTitle(pdf, "VI. XAC NHAN CUA CAC BEN")

	pdf.SetFont("Times", "", 11)
	pdf.MultiCell(
		0,
		6,
		"Cac ben xac nhan da doc, hieu va dong y voi noi dung thoa thuan nay. Hop dong co hieu luc ke tu thoi diem duoc Ben B tao chien dich thanh cong va he thong Ben A ky so luu tru.",
		"",
		"J",
		false,
	)
	pdf.Ln(5)

	signTopY := pdf.GetY()
	leftX := pdf.GetX()
	pageWidth, _ := pdf.GetPageSize()
	rightX := pageWidth/2 + 5
	columnWidth := (pageWidth - 36) / 2

	pdf.SetFont("Times", "B", 12)
	pdf.SetXY(leftX, signTopY)
	pdf.CellFormat(columnWidth, 7, "BEN A", "", 0, "C", false, 0, "")
	pdf.SetXY(rightX, signTopY)
	pdf.CellFormat(columnWidth, 7, "BEN B", "", 1, "C", false, 0, "")

	pdf.SetFont("Times", "", 11)
	pdf.SetX(leftX)
	pdf.CellFormat(columnWidth, 6, firstNonEmpty(data.PlatformName, platformName), "", 0, "C", false, 0, "")
	pdf.SetX(rightX)
	pdf.CellFormat(columnWidth, 6, formatText(data.OrganizerName), "", 1, "C", false, 0, "")

	pdf.SetX(leftX)
	pdf.CellFormat(columnWidth, 6, "(Ky so boi he thong)", "", 0, "C", false, 0, "")
	pdf.SetX(rightX)
	pdf.CellFormat(columnWidth, 6, "(Thong tin Ben B da xac minh KYC)", "", 1, "C", false, 0, "")

	pdf.Ln(14)

	pdf.SetFont("Times", "I", 10)
	pdf.SetX(leftX)
	pdf.CellFormat(columnWidth, 6, formatDateTimeVN(data.SignedAt), "", 0, "C", false, 0, "")
	pdf.SetX(rightX)
	pdf.CellFormat(columnWidth, 6, formatDateTimeVN(data.CreatedAt), "", 1, "C", false, 0, "")
}

func renderFooter(pdf *gofpdf.Fpdf, data *ContractData) {
	pdf.SetY(-18)
	drawSeparator(pdf)
	pdf.Ln(2)
	pdf.SetFont("Times", "I", 8)
	pdf.MultiCell(
		0,
		4,
		fmt.Sprintf(
			"Tai lieu duoc sinh boi Tam Sang Blockchain Service | Contract ID: %s | Signature: %s",
			formatIdentifier(data.ContractID),
			formatText(data.SignatureAlgorithm),
		),
		"",
		"C",
		false,
	)
}

func renderSectionTitle(pdf *gofpdf.Fpdf, title string) {
	pdf.SetFont("Times", "B", 12)
	pdf.SetFillColor(241, 245, 249)
	pdf.CellFormat(0, 8, title, "", 1, "L", true, 0, "")
	pdf.Ln(2)
}

func renderPartyBlock(pdf *gofpdf.Fpdf, title string, lines []string) {
	pdf.SetFont("Times", "B", 11)
	pdf.CellFormat(0, 7, title, "", 1, "L", false, 0, "")
	pdf.SetFont("Times", "", 11)
	for _, line := range lines {
		pdf.MultiCell(0, 6, "- "+line, "", "J", false)
	}
	pdf.Ln(2)
}

func drawSeparator(pdf *gofpdf.Fpdf) {
	pdf.SetDrawColor(148, 163, 184)
	y := pdf.GetY()
	pdf.Line(18, y, 192, y)
}

func addLabelValue(pdf *gofpdf.Fpdf, label, value string) {
	pdf.SetFont("Times", "B", 11)
	pdf.CellFormat(48, 7, label+":", "", 0, "L", false, 0, "")
	pdf.SetFont("Times", "", 11)
	pdf.MultiCell(0, 7, value, "", "L", false)
}

func formatCurrency(amount float64, currency string) string {
	unit := firstNonEmpty(currency, "VND")
	if strings.EqualFold(unit, "VND") {
		return fmt.Sprintf("%s VND", formatNumber(amount))
	}
	return fmt.Sprintf("%s %s", formatNumber(amount), unit)
}

func formatNumber(value float64) string {
	negative := value < 0
	if negative {
		value = -value
	}

	raw := fmt.Sprintf("%.0f", value)
	if len(raw) <= 3 {
		if negative {
			return "-" + raw
		}
		return raw
	}

	var builder strings.Builder
	for index, char := range raw {
		if index > 0 && (len(raw)-index)%3 == 0 {
			builder.WriteString(".")
		}
		builder.WriteRune(char)
	}

	if negative {
		return "-" + builder.String()
	}
	return builder.String()
}

func formatDateVN(value time.Time) string {
	if value.IsZero() {
		return defaultDatePlaceholder
	}
	return value.Format("02/01/2006")
}

func formatDateTimeVN(value time.Time) string {
	if value.IsZero() {
		return defaultDatePlaceholder
	}
	return value.Format("15:04 02/01/2006")
}

func formatText(value string) string {
	if strings.TrimSpace(value) == "" {
		return defaultTextPlaceholder
	}
	return strings.TrimSpace(value)
}

func formatIdentifier(value string) string {
	if strings.TrimSpace(value) == "" {
		return defaultTextPlaceholder
	}
	return strings.TrimSpace(value)
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}
