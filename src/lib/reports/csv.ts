// CSV export: turns rows into a .csv file the browser downloads, ready for Excel or Google Sheets.

type Cell = string | number;

function escapeCell(cell: Cell) {
  let text = String(cell);
  // A cell starting with = + - or @ can run as a formula when the file is opened in a
  // spreadsheet. A leading apostrophe makes the spreadsheet treat it as plain text.
  if (typeof cell === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(header: string[], rows: Cell[][]) {
  return [header, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n");
}

export function downloadCsv(filename: string, header: string[], rows: Cell[][]) {
  // The leading ﻿ tells Excel the file is UTF-8, so product names with accents survive.
  const blob = new Blob(["﻿", toCsv(header, rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
