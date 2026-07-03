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
