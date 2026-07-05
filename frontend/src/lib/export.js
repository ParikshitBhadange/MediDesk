import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export function exportToPDF(title, columns, rows) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 16);
  doc.setFontSize(10);
  doc.text(new Date().toLocaleString(), 14, 22);
  autoTable(doc, {
    startY: 28,
    head: [columns],
    body: rows.map((r) => r.map((c) => String(c ?? ""))),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [15, 118, 130] },
  });
  doc.save(`${title.replace(/\s+/g, "_")}.pdf`);
}

// A properly formatted single-day consultation report — patient header,
// clinical fields as labeled sections, then a medications table — rather
// than a flat key/value dump. Used for the doctor's per-day report downloads.
export function exportConsultationReportPDF({ patientName, patientContact, doctorName, consultation }) {
  const doc = new jsPDF();
  const marginX = 14;
  let y = 18;

  doc.setFontSize(18);
  doc.setTextColor(15, 118, 130);
  doc.text("MediDesk — Consultation Report", marginX, y);
  y += 9;

  doc.setDrawColor(220, 220, 220);
  doc.line(marginX, y, 196, y);
  y += 8;

  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(`Patient: ${patientName || "—"}`, marginX, y);
  y += 6;
  if (patientContact) {
    doc.text(`Contact: ${patientContact}`, marginX, y);
    y += 6;
  }
  doc.text(`Doctor: ${doctorName || "—"}`, marginX, y);
  y += 6;
  doc.text(`Report date: ${new Date(consultation.createdAt).toLocaleDateString()}`, marginX, y);
  y += 10;

  const fields = [
    ["Cause", consultation.cause],
    ["Condition", consultation.condition],
    ["Disease", consultation.disease],
    ["Symptoms", consultation.symptoms],
    ["Patient description", consultation.patientDescription],
    ["Additional notes", consultation.additionalNote],
  ].filter(([, value]) => value && String(value).trim());

  if (fields.length) {
    doc.setFontSize(12);
    doc.setTextColor(15, 118, 130);
    doc.text("Clinical details", marginX, y);
    y += 5;
    autoTable(doc, {
      startY: y,
      body: fields,
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 45 } },
      theme: "grid",
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  const items = (consultation.prescriptions ?? []).flatMap((p) => p.items ?? []);
  doc.setFontSize(12);
  doc.setTextColor(15, 118, 130);
  doc.text("Medications", marginX, y);
  y += 5;

  if (items.length) {
    autoTable(doc, {
      startY: y,
      head: [["#", "Medicine", "Dosage", "Frequency", "Duration", "Instructions"]],
      body: items.map((i) => [i.sequence ?? "", i.medicine ?? "", i.dosage ?? "", i.frequency ?? "", i.duration ?? "", i.instructions ?? ""]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [15, 118, 130] },
    });
  } else {
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("No medications recorded for this visit.", marginX, y + 4);
  }

  const dateLabel = new Date(consultation.createdAt).toISOString().slice(0, 10);
  doc.save(`Report_${(patientName || "patient").replace(/\s+/g, "_")}_${dateLabel}.pdf`);
}

export function exportToExcel(filename, sheetName, rows) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function shareOnWhatsApp(text, phone) {
  const number = (phone || "").replace(/\D/g, "");
  const base = number ? `https://wa.me/${number}` : "https://wa.me/";
  const url = `${base}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function printHTML(html) {
  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>Print</title>
  <style>body{font-family:ui-sans-serif,system-ui;padding:32px;color:#111}
  h1,h2{margin:0 0 8px} table{width:100%;border-collapse:collapse;margin-top:12px}
  th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:13px}
  th{background:#f1f5f9}</style></head><body>${html}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 250);
}