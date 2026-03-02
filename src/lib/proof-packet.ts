import jsPDF from "jspdf";
import { getFile } from "@/lib/s3-client";

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

/** Read pixel dimensions from a raw JPEG or PNG buffer without any extra package. */
function getImageDimensions(bytes: Uint8Array, format: string): { width: number; height: number } | null {
  try {
    if (format === "PNG") {
      // IHDR chunk: width at bytes 16-19, height at 20-23 (big-endian uint32)
      if (bytes.length < 24) return null;
      const w = (bytes[16] << 24 | bytes[17] << 16 | bytes[18] << 8 | bytes[19]) >>> 0;
      const h = (bytes[20] << 24 | bytes[21] << 16 | bytes[22] << 8 | bytes[23]) >>> 0;
      return { width: w, height: h };
    } else {
      // JPEG: scan for SOF markers (0xC0–0xCF, excluding 0xC4/0xC8/0xCC)
      let i = 2; // skip SOI
      while (i < bytes.length - 8) {
        if (bytes[i] !== 0xFF) { i++; continue; }
        const marker = bytes[i + 1];
        if (marker >= 0xC0 && marker <= 0xCF &&
            marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
          const h = (bytes[i + 5] << 8) | bytes[i + 6];
          const w = (bytes[i + 7] << 8) | bytes[i + 8];
          return { width: w, height: h };
        }
        const segLen = (bytes[i + 2] << 8) | bytes[i + 3];
        i += 2 + segLen;
      }
      return null;
    }
  } catch {
    return null;
  }
}

async function fetchImageAsBase64(url: string): Promise<{ data: string; format: string; width: number; height: number } | null> {
  try {
    let bytes: Uint8Array;
    let contentType = "image/jpeg";

    // Photos are stored as /api/photos/<key> — fetch directly from S3 on the server
    const proxyMatch = url.match(/^\/api\/photos\/(.+)$/);
    if (proxyMatch) {
      const file = await getFile(proxyMatch[1]);
      if (!file) return null;
      bytes = file.body;
      contentType = file.contentType ?? "image/jpeg";
    } else {
      // Absolute URL fallback
      const res = await fetch(url);
      if (!res.ok) return null;
      contentType = res.headers.get("content-type") ?? "image/jpeg";
      bytes = new Uint8Array(await res.arrayBuffer());
    }

    const format = contentType.includes("png") ? "PNG" : "JPEG";
    const mime = format === "PNG" ? "image/png" : "image/jpeg";
    const base64 = Buffer.from(bytes).toString("base64");
    const dims = getImageDimensions(bytes, format) ?? { width: 4, height: 3 }; // fallback 4:3
    return { data: `data:${mime};base64,${base64}`, format, width: dims.width, height: dims.height };
  } catch {
    return null;
  }
}

export async function generateProofPacketPdf(data: ProofPacketData): Promise<Buffer> {
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

  // Photos – fetch and embed
  if (data.photos.length > 0) {
    heading("Photos");
    const colWidth = (contentWidth - 5) / 2; // two columns with 5 mm gap
    const maxImgHeight = 120; // cap so a tall portrait doesn't consume the whole page

    for (let i = 0; i < data.photos.length; i += 2) {
      const left = data.photos[i];
      const right = data.photos[i + 1] ?? null;

      // Fetch both in parallel
      const [imgLeft, imgRight] = await Promise.all([
        fetchImageAsBase64(left.url),
        right ? fetchImageAsBase64(right.url) : Promise.resolve(null),
      ]);

      // Compute rendered height for each image preserving aspect ratio, capped
      const heightLeft  = imgLeft  ? Math.min(colWidth * (imgLeft.height  / imgLeft.width),  maxImgHeight) : colWidth * 0.75;
      const heightRight = imgRight ? Math.min(colWidth * (imgRight.height / imgRight.width), maxImgHeight) : colWidth * 0.75;
      const rowHeight = right ? Math.max(heightLeft, heightRight) : heightLeft;

      checkPage(rowHeight + 14);

      // Labels above images
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(`${left.type} \u2013 ${fmt(left.takenAt)}`, margin, y);
      if (right) doc.text(`${right.type} \u2013 ${fmt(right.takenAt)}`, margin + colWidth + 5, y);
      y += 4;

      if (imgLeft) {
        doc.addImage(imgLeft.data, imgLeft.format, margin, y, colWidth, heightLeft);
      } else {
        doc.setFontSize(7);
        doc.setFont("helvetica", "italic");
        doc.text("(image unavailable)", margin + 2, y + heightLeft / 2);
      }

      if (right) {
        if (imgRight) {
          doc.addImage(imgRight.data, imgRight.format, margin + colWidth + 5, y, colWidth, heightRight);
        } else {
          doc.setFontSize(7);
          doc.setFont("helvetica", "italic");
          doc.text("(image unavailable)", margin + colWidth + 7, y + heightRight / 2);
        }
      }

      y += rowHeight + 6;
    }
  }

  return Buffer.from(doc.output("arraybuffer"));
}
