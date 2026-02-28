import jsPDF from "jspdf";

export interface ProofPacketData {
  referenceNumber: string;
  description: string;
  category: string;
  urgency: string;
  submittedAt: Date | null;
  resolvedAt: Date | null;

  propertyName: string;
  propertyAddress: string;

  organizationName: string;
  organizationEmail: string;
  organizationPhone: string;
  organizationAddress: string;

  jobId: string;
  vendorCompanyName: string;
  vendorContactName: string;
  vendorPhone: string;
  vendorEmail: string;
  acceptedAt: Date | null;
  completedAt: Date | null;
  enRouteAt: Date | null;
  arrivedAt: Date | null;
  totalLabourHours: number | null;
  totalMaterialsCost: number | null;
  totalCost: number | null;
  vendorNotes: string | null;
  completionSummary: string | null;

  materials: {
    description: string;
    quantity: number;
    unitCost: number;
  }[];

  photos: {
    url: string;
    type: string;
    takenAt: Date | null;
  }[];

  notes: {
    text: string;
    authorName: string;
    createdAt: Date;
  }[];

  createdAt: Date;
  dispatchedAt: Date;
}

function fmt(d: Date | string | null | undefined): string {
  if (!d) return "N/A";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function currency(n: number | null | undefined): string {
  if (n == null) return "$0.00";
  return `$${n.toFixed(2)}`;
}

export function generateProofPacketPdf(data: ProofPacketData): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  function checkPage(needed: number) {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  }

  function heading(text: string) {
    checkPage(12);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(text, margin, y);
    y += 7;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;
  }

  function row(label: string, value: string) {
    checkPage(7);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(label, margin, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value, contentWidth - 45);
    doc.text(lines, margin + 45, y);
    y += Math.max(5, lines.length * 4.5);
  }

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Proof of Service Packet", margin, y);
  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Reference: ${data.referenceNumber}`, margin, y);
  y += 5;
  doc.text(`Generated: ${fmt(new Date())}`, margin, y);
  y += 10;

  // Service Request
  heading("Service Request");
  row("Category:", data.category);
  row("Urgency:", data.urgency);
  row("Description:", data.description);
  row("Submitted:", fmt(data.submittedAt));
  row("Resolved:", fmt(data.resolvedAt));
  y += 4;

  // Property
  heading("Property");
  row("Name:", data.propertyName);
  row("Address:", data.propertyAddress);
  y += 4;

  // Organization
  heading("Organization");
  row("Name:", data.organizationName);
  row("Email:", data.organizationEmail);
  row("Phone:", data.organizationPhone);
  row("Address:", data.organizationAddress);
  y += 4;

  // Vendor / Job
  heading("Vendor & Job Details");
  row("Vendor:", data.vendorCompanyName);
  row("Contact:", data.vendorContactName);
  row("Phone:", data.vendorPhone);
  row("Email:", data.vendorEmail);
  row("Dispatched:", fmt(data.dispatchedAt));
  row("Accepted:", fmt(data.acceptedAt));
  row("En Route:", fmt(data.enRouteAt));
  row("Arrived:", fmt(data.arrivedAt));
  row("Completed:", fmt(data.completedAt));
  row("Labour Hours:", String(data.totalLabourHours ?? "N/A"));
  row("Materials Cost:", currency(data.totalMaterialsCost));
  row("Total Cost:", currency(data.totalCost));
  if (data.vendorNotes) row("Vendor Notes:", data.vendorNotes);
  if (data.completionSummary) row("Completion:", data.completionSummary);
  y += 4;

  // Materials
  if (data.materials.length > 0) {
    heading("Materials");
    for (const m of data.materials) {
      row("Item:", `${m.description} (qty: ${m.quantity}, unit: ${currency(m.unitCost)})`);
    }
    y += 4;
  }

  // Notes
  if (data.notes.length > 0) {
    heading("Notes");
    for (const n of data.notes) {
      checkPage(10);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(`${n.authorName} \u2013 ${fmt(n.createdAt)}`, margin, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(n.text, contentWidth);
      doc.text(lines, margin, y);
      y += lines.length * 4 + 3;
    }
    y += 4;
  }

  // Photos (list URLs since we can't embed images server-side easily)
  if (data.photos.length > 0) {
    heading("Photos");
    for (const p of data.photos) {
      row(`${p.type}:`, `${p.url} (${fmt(p.takenAt)})`);
    }
  }

  return Buffer.from(doc.output("arraybuffer"));
}
