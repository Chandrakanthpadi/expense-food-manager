export interface PdfReportData {
  fileName: string;
  title: string;
  subtitle: string;
  themeColor?: [number, number, number];
  summary?: Array<{ label: string; value: string }>;
  tables: Array<{
    title?: string;
    head: string[];
    body: (string | number)[][];
  }>;
}

export async function exportReportToPdf(data: PdfReportData) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 20;

  // Header Title
  doc.setFontSize(22);
  doc.setTextColor(20, 20, 20);
  doc.text(data.title, 14, currentY);
  currentY += 8;

  // Header Subtitle
  if (data.subtitle) {
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(data.subtitle, 14, currentY);
    currentY += 12;
  }

  // Summary Metrics Section
  if (data.summary && data.summary.length > 0) {
    const marginX = 14;
    const itemsPerRow = 3;
    const boxWidth = (pageWidth - marginX * 2 - (itemsPerRow - 1) * 5) / itemsPerRow;
    const boxHeight = 16;
    
    let row = 0;
    
    data.summary.forEach((item, index) => {
      const col = index % itemsPerRow;
      if (index > 0 && col === 0) row++;
      
      const x = marginX + (boxWidth + 5) * col;
      const y = currentY + row * (boxHeight + 5);
      
      doc.setDrawColor(240, 240, 240);
      doc.setFillColor(248, 248, 250);
      doc.roundedRect(x, y, boxWidth, boxHeight, 2, 2, "FD");

      doc.setFontSize(8);
      doc.setTextColor(110, 110, 110);
      doc.text(item.label.toUpperCase(), x + 4, y + 6);

      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);
      const textVal = String(item.value);
      doc.text(textVal.length > 25 ? textVal.substring(0, 22) + '...' : textVal, x + 4, y + 12.5);
    });
    
    currentY += (row + 1) * (boxHeight + 5) + 6;
  }

  // Tables
  const primaryColor = data.themeColor || [33, 100, 200];

  for (const table of data.tables) {
    if (table.title) {
      if (currentY > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        currentY = 20;
      } else {
        currentY += 4;
      }
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text(table.title, 14, currentY);
      currentY += 4;
    }

    autoTable(doc, {
      startY: currentY,
      head: [table.head],
      body: table.body,
      theme: "striped",
      headStyles: { fillColor: primaryColor as [number, number, number] },
      margin: { left: 14, right: 14, top: 20, bottom: 20 },
      styles: { cellPadding: 4 },
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 12;
  }

  // Footer / Page Numbers
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Lifeflow Tracker Report", 14, doc.internal.pageSize.getHeight() - 10);
    const pageString = `Page ${i} of ${pageCount}`;
    doc.text(pageString, pageWidth - 14 - doc.getTextWidth(pageString), doc.internal.pageSize.getHeight() - 10);
  }

  doc.save(data.fileName);
}

export function createPdfFileName(...parts: Array<string | undefined>) {
  return `${parts
    .filter(Boolean)
    .join("-")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-_]/g, "")
    .toLowerCase()}.pdf`;
}