import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { signQrToken } from '@/lib/qrToken';

// === Senior Gala palette (Festzone-style layout, gold/black) ===
const COL_BG = [6, 6, 15];          // near-black canvas
const COL_BG_STUB = [15, 15, 26];   // slightly darker right panel
const COL_GOLD = [201, 168, 76];    // primary gold
const COL_GOLD_SOFT = [232, 213, 163];
const COL_GOLD_DEEP = [139, 105, 20];
const COL_TEXT = [245, 240, 232];   // off-white
const COL_MUTED = [138, 128, 112];
// Silver / platinum accent used for "general" (non-student) tickets
const COL_SILVER = [196, 202, 214];
const COL_SILVER_SOFT = [226, 230, 240];
const COL_SILVER_DEEP = [120, 128, 145];

interface TicketData {
  name: string;
  department: string;
  code: string;
  userId?: string;
  eventName: string;
  eventDate: string;
  venue: string;
  ticketType?: string;
  qty?: number;
  isReprint?: boolean;
  tierPrice?: number;
  paidAmount?: number;
  codeType?: 'student' | 'general';
  qrVersion?: number;
}

export async function generateETicket(data: TicketData): Promise<void> {
  // Custom landscape 200×95mm — concert-stub format
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [200, 95] });
  const w = 200;
  const h = 95;
  const splitX = 150;     // dashed perforation
  const spineW = 4;       // left gold spine
  const footerH = 12;     // bottom gold band

  const isGeneral = data.codeType === 'general';
  // Accent swap: silver for general, gold for student. Wordmark/footer stay gold for brand cohesion.
  const ACC = isGeneral ? COL_SILVER : COL_GOLD;
  const ACC_SOFT = isGeneral ? COL_SILVER_SOFT : COL_GOLD_SOFT;
  const ACC_DEEP = isGeneral ? COL_SILVER_DEEP : COL_GOLD_DEEP;

  // 1. Canvas
  doc.setFillColor(COL_BG[0], COL_BG[1], COL_BG[2]);
  doc.rect(0, 0, w, h, 'F');

  // 2. Right stub panel (darker)
  doc.setFillColor(COL_BG_STUB[0], COL_BG_STUB[1], COL_BG_STUB[2]);
  doc.rect(splitX, 0, w - splitX, h - footerH, 'F');

  // 3. Accent spine on left
  doc.setFillColor(ACC[0], ACC[1], ACC[2]);
  doc.rect(0, 0, spineW, h - footerH, 'F');

  // 4. Dashed perforation
  doc.setDrawColor(ACC[0], ACC[1], ACC[2]);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(splitX, 4, splitX, h - footerH - 4);
  doc.setLineDashPattern([], 0);

  // 5. Footer band
  doc.setFillColor(COL_GOLD[0], COL_GOLD[1], COL_GOLD[2]);
  doc.rect(0, h - footerH, w, footerH, 'F');

  // === LEFT SECTION ===
  const leftX = spineW + 8;

  // Wordmark
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(COL_GOLD[0], COL_GOLD[1], COL_GOLD[2]);
  doc.text('SENIOR GALA', leftX, 10);

  // Event title (large serif-feel)
  doc.setFont('times', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(COL_TEXT[0], COL_TEXT[1], COL_TEXT[2]);
  const title = data.eventName || 'Senior Gala Night';
  const titleLines = doc.splitTextToSize(title, splitX - leftX - 10);
  doc.text(titleLines, leftX, 22);

  // Accent pill — ticket type
  const pillLabel = data.tierPrice
    ? `${data.ticketType || 'General Admission'} · ${data.tierPrice.toLocaleString()} RWF`
    : `${data.ticketType || 'General Admission'} · ${data.qty || 1}x`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  const pillW = doc.getTextWidth(pillLabel) + 6;
  doc.setFillColor(ACC[0], ACC[1], ACC[2]);
  doc.roundedRect(leftX, 34, pillW, 5.5, 2.5, 2.5, 'F');
  doc.setTextColor(COL_BG[0], COL_BG[1], COL_BG[2]);
  doc.text(pillLabel, leftX + 3, 37.8);

  // Metadata rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  let y = 48;
  const rows: [string, string][] = [
    ['Date', data.eventDate || 'TBD'],
    ['Venue', data.venue || 'TBA'],
    isGeneral
      ? ['Guest Type', 'General Public']
      : ['School', data.department || '-'],
  ];
  rows.forEach(([k, v]) => {
    doc.setTextColor(COL_MUTED[0], COL_MUTED[1], COL_MUTED[2]);
    doc.text(k + ':', leftX, y);
    doc.setTextColor(COL_TEXT[0], COL_TEXT[1], COL_TEXT[2]);
    if (k === 'Venue') {
      // Location pin icon (vector) so it reflects whatever venue is currently set
      const pinX = leftX + 15;
      const pinY = y - 2.5;
      doc.setFillColor(ACC[0], ACC[1], ACC[2]);
      doc.circle(pinX + 1, pinY + 1.2, 1.2, 'F');
      doc.setDrawColor(ACC[0], ACC[1], ACC[2]);
      doc.setLineWidth(0.4);
      doc.line(pinX + 1, pinY + 2.2, pinX + 1, pinY + 3.2);
      doc.setTextColor(COL_TEXT[0], COL_TEXT[1], COL_TEXT[2]);
      doc.text(String(v), leftX + 19, y);
    } else {
      doc.text(String(v), leftX + (isGeneral && k === 'Guest Type' ? 22 : 15), y);
    }
    y += 5;
  });

  // Accent-colored "Issued to"
  y += 1;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(ACC[0], ACC[1], ACC[2]);
  doc.text('Issued to:', leftX, y);
  doc.setTextColor(COL_TEXT[0], COL_TEXT[1], COL_TEXT[2]);
  doc.text(data.name, leftX + 18, y);

  // Booking ref (bottom of left section)
  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(COL_MUTED[0], COL_MUTED[1], COL_MUTED[2]);
  doc.text(`Ref: ${data.code}`, leftX, h - footerH - 4);

  // Fee breakdown (above ref) if tier price provided
  if (data.tierPrice) {
    const paid = data.paidAmount ?? data.tierPrice;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(COL_MUTED[0], COL_MUTED[1], COL_MUTED[2]);
    doc.text(
      `Tier ${data.tierPrice.toLocaleString()} RWF  ·  Paid ${paid.toLocaleString()} RWF`,
      leftX, h - footerH - 9
    );
  }

  // === RIGHT STUB ===
  try {
    // Prefer signed token (anti-forgery). Fall back to ticket URL if userId missing.
    let qrPayload: string;
    if (data.userId) {
      try {
        qrPayload = await signQrToken(data.code, data.userId, data.qrVersion ?? 1);
      } catch {
        qrPayload = `https://seniorgalakigali.sadcorporation.com/ticket?code=${encodeURIComponent(data.code)}`;
      }
    } else {
      qrPayload = `https://seniorgalakigali.sadcorporation.com/ticket?code=${encodeURIComponent(data.code)}`;
    }
    // High-contrast (black on white) so scanners read it reliably.
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 700, margin: 2, errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#FFFFFF' },
    });
    const qrSize = 42;
    const stubCx = splitX + (w - splitX) / 2;
    // White tile behind QR for maximum scanner contrast on the dark stub.
    const pad = 2;
    doc.setFillColor(255, 255, 255);
    doc.rect(stubCx - qrSize / 2 - pad, 10 - pad, qrSize + pad * 2, qrSize + pad * 2, 'F');
    doc.addImage(qrDataUrl, 'PNG', stubCx - qrSize / 2, 10, qrSize, qrSize);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(COL_MUTED[0], COL_MUTED[1], COL_MUTED[2]);
    doc.text('Scan at entrance', stubCx, 56, { align: 'center' });

    doc.setFont('courier', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(ACC[0], ACC[1], ACC[2]);
    doc.text(data.code, stubCx, 62, { align: 'center' });
  } catch (e) {
    console.error('QR generation failed:', e);
  }

  // Footer text on gold band
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(COL_BG[0], COL_BG[1], COL_BG[2]);
  doc.text('seniorgalakigali.sadcorporation.com', 6, h - 4.5);
  doc.text('This ticket is non-transferable', w / 2, h - 4.5, { align: 'center' });
  doc.text(data.eventDate || '2026', w - 6, h - 4.5, { align: 'right' });

  // === Type badge (top-right corner ribbon) ===
  const badgeLabel = isGeneral ? 'GENERAL' : 'STUDENT';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  const badgeTextW = doc.getTextWidth(badgeLabel);
  const badgeW = badgeTextW + 8;
  const badgeH = 6;
  const badgeX = w - badgeW - 4;
  const badgeY = 4;
  doc.setFillColor(ACC[0], ACC[1], ACC[2]);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1, 1, 'F');
  doc.setDrawColor(ACC_DEEP[0], ACC_DEEP[1], ACC_DEEP[2]);
  doc.setLineWidth(0.2);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1, 1, 'S');
  doc.setTextColor(COL_BG[0], COL_BG[1], COL_BG[2]);
  doc.text(badgeLabel, badgeX + badgeW / 2, badgeY + 4.1, { align: 'center' });

  // REPRINT watermark
  if (data.isReprint) {
    try { (doc as any).GState && doc.setGState(new (doc as any).GState({ opacity: 0.18 })); } catch {}
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(48);
    doc.setTextColor(220, 38, 38);
    doc.text('REPRINT', w / 2, h / 2 + 10, { align: 'center', angle: -18 });
    try { (doc as any).GState && doc.setGState(new (doc as any).GState({ opacity: 1 })); } catch {}
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(220, 38, 38);
    doc.text('REPRINT', w - 6, 6, { align: 'right' });
  }

  const typeTag = isGeneral ? '-General' : '-Student';
  doc.save(`Senior-Gala-Ticket${typeTag}-${data.code}${data.isReprint ? '-REPRINT' : ''}.pdf`);
}

interface ReceiptData {
  code: string;
  school: string;
  amount: number;
  method: string;
  collectedBy?: string;
  date?: string;
  studentName?: string;
}

export async function generateRegistrationReceipt(data: ReceiptData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const spineW = 4;
  const footerH = 12;

  // Canvas
  doc.setFillColor(COL_BG[0], COL_BG[1], COL_BG[2]);
  doc.rect(0, 0, w, h, 'F');

  // Gold spine
  doc.setFillColor(COL_GOLD[0], COL_GOLD[1], COL_GOLD[2]);
  doc.rect(0, 0, spineW, h - footerH, 'F');

  // Footer band
  doc.setFillColor(COL_GOLD[0], COL_GOLD[1], COL_GOLD[2]);
  doc.rect(0, h - footerH, w, footerH, 'F');

  const cx = w / 2;

  // Wordmark
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(COL_GOLD[0], COL_GOLD[1], COL_GOLD[2]);
  doc.text('SENIOR GALA', cx, 14, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(COL_GOLD_SOFT[0], COL_GOLD_SOFT[1], COL_GOLD_SOFT[2]);
  doc.text('Registration Fee Receipt', cx, 19, { align: 'center' });

  // Hairline divider
  doc.setDrawColor(COL_GOLD_DEEP[0], COL_GOLD_DEEP[1], COL_GOLD_DEEP[2]);
  doc.setLineWidth(0.2);
  doc.line(15, 23, w - 15, 23);

  // Amount block
  doc.setFillColor(15, 15, 26);
  doc.roundedRect(spineW + 8, 32, w - spineW - 16, 26, 2, 2, 'F');
  doc.setDrawColor(COL_GOLD[0], COL_GOLD[1], COL_GOLD[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(spineW + 8, 32, w - spineW - 16, 26, 2, 2, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(COL_MUTED[0], COL_MUTED[1], COL_MUTED[2]);
  doc.text('AMOUNT PAID', cx, 40, { align: 'center' });
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(COL_GOLD[0], COL_GOLD[1], COL_GOLD[2]);
  doc.text(`${data.amount.toLocaleString()} RWF`, cx, 52, { align: 'center' });

  // Details
  let y = 72;
  const rows: [string, string][] = [
    ['Purpose', 'Registration Fee'],
    ['Code', data.code],
    ['School', data.school],
    ['Method', data.method.toUpperCase()],
  ];
  if (data.studentName) rows.push(['Student', data.studentName]);
  if (data.collectedBy) rows.push(['Received by', data.collectedBy]);
  if (data.date) rows.push(['Date', data.date]);
  else rows.push(['Date', new Date().toLocaleString()]);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  rows.forEach(([label, value]) => {
    doc.setTextColor(COL_MUTED[0], COL_MUTED[1], COL_MUTED[2]);
    doc.text(label, spineW + 10, y);
    doc.setTextColor(COL_TEXT[0], COL_TEXT[1], COL_TEXT[2]);
    doc.text(String(value), w - 15, y, { align: 'right' });
    y += 6;
  });

  // Footnote box
  y += 3;
  doc.setDrawColor(COL_GOLD_DEEP[0], COL_GOLD_DEEP[1], COL_GOLD_DEEP[2]);
  doc.setLineDashPattern([1, 1.2], 0);
  doc.line(15, y, w - 15, y);
  doc.setLineDashPattern([], 0);
  y += 5;
  doc.setFontSize(7);
  doc.setTextColor(COL_GOLD_SOFT[0], COL_GOLD_SOFT[1], COL_GOLD_SOFT[2]);
  doc.text('This is a non-refundable registration fee.', cx, y, { align: 'center' });
  y += 4;
  doc.setTextColor(COL_MUTED[0], COL_MUTED[1], COL_MUTED[2]);
  doc.text('Ticket balance (25,000 RWF) is paid separately on the Pay page.', cx, y, { align: 'center' });

  // Footer band text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(COL_BG[0], COL_BG[1], COL_BG[2]);
  doc.text('seniorgalakigali.sadcorporation.com', 6, h - 4.5);
  doc.text(`Keep this receipt`, cx, h - 4.5, { align: 'center' });
  doc.text(data.code, w - 6, h - 4.5, { align: 'right' });

  doc.save(`Senior-Gala-Receipt-${data.code}.pdf`);
}

// =================================================================
// PAYMENT CONFIRMATION RECEIPT (Feature 1 – /receipt page)
// Not a fiscal/government receipt.
// =================================================================
interface PaymentReceiptData {
  paymentId: string;
  name: string;
  email?: string;
  phone?: string;
  code: string;
  tier?: string;
  amount: number;
  method?: string;
  issuedAt?: Date;
}

export async function generatePaymentConfirmationReceipt(data: PaymentReceiptData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const footerH = 14;
  const headerH = 26;

  doc.setFillColor(245, 240, 232);
  doc.rect(0, 0, w, h, 'F');

  doc.setFillColor(COL_BG[0], COL_BG[1], COL_BG[2]);
  doc.rect(0, 0, w, headerH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(COL_GOLD[0], COL_GOLD[1], COL_GOLD[2]);
  doc.text('S.A.D CORPORATION', w / 2, 11, { align: 'center' });
  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(COL_TEXT[0], COL_TEXT[1], COL_TEXT[2]);
  doc.text('Senior Gala Kigali 2026', w / 2, 18, { align: 'center' });

  doc.setFillColor(COL_GOLD[0], COL_GOLD[1], COL_GOLD[2]);
  doc.rect(0, headerH, w, 1.5, 'F');

  const cx = w / 2;
  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text('PAYMENT CONFIRMATION', cx, headerH + 12, { align: 'center' });

  const issued = data.issuedAt || new Date();
  const dateStr = issued.toLocaleDateString('en-RW', { day: '2-digit', month: 'short', year: 'numeric' });
  const receiptNo = `PAY-${data.paymentId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(110, 95, 60);
  doc.text(`Receipt no. ${receiptNo}`, cx, headerH + 18, { align: 'center' });
  doc.text(`Issued ${dateStr}`, cx, headerH + 22, { align: 'center' });

  const boxY = headerH + 28;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(COL_GOLD[0], COL_GOLD[1], COL_GOLD[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(10, boxY, w - 20, 22, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(110, 95, 60);
  doc.text('AMOUNT PAID', cx, boxY + 6, { align: 'center' });
  doc.setFont('times', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(20, 20, 20);
  doc.text(`${data.amount.toLocaleString()} RWF`, cx, boxY + 17, { align: 'center' });

  let y = boxY + 30;
  const rows: [string, string][] = [['Attendee', data.name]];
  if (data.email) rows.push(['Email', data.email]);
  if (data.phone) rows.push(['Phone', data.phone]);
  rows.push(['Ticket code', data.code]);
  if (data.tier) rows.push(['Tier', data.tier]);
  rows.push(['Method', (data.method || 'MoMo').toUpperCase()]);
  rows.push(['Status', 'CONFIRMED']);

  doc.setFontSize(9);
  rows.forEach(([k, v]) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(110, 95, 60);
    doc.text(k, 12, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 20, 20);
    const txt = doc.splitTextToSize(String(v), w - 50);
    doc.text(txt, w - 12, y, { align: 'right' });
    y += Array.isArray(txt) ? 5 * txt.length : 5;
  });

  y += 4;
  doc.setDrawColor(COL_GOLD_DEEP[0], COL_GOLD_DEEP[1], COL_GOLD_DEEP[2]);
  doc.setLineDashPattern([1, 1.2], 0);
  doc.line(10, y, w - 10, y);
  doc.setLineDashPattern([], 0);
  y += 5;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(90, 75, 50);
  const disc = doc.splitTextToSize(
    'This document confirms that S.A.D Corporation received your payment for the Senior Gala Kigali 2026. It is not a government fiscal receipt.',
    w - 20
  );
  doc.text(disc, cx, y, { align: 'center' });

  doc.setFillColor(COL_GOLD[0], COL_GOLD[1], COL_GOLD[2]);
  doc.rect(0, h - footerH, w, footerH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(COL_BG[0], COL_BG[1], COL_BG[2]);
  doc.text('sadcorporation1@gmail.com', 6, h - 8.5);
  doc.text('+250 786 324 622', cx, h - 8.5, { align: 'center' });
  doc.text('seniorgalakigali.sadcorporation.com', w - 6, h - 8.5, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Thank you for being part of the Senior Gala Kigali 2026.', cx, h - 3.5, { align: 'center' });

  doc.save(`Senior-Gala-Payment-Receipt-${data.code}.pdf`);
}
