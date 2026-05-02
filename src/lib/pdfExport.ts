export interface PdfReportData {
  fileName: string;
  title: string;
  subtitle: string;
  themeColor?: [number, number, number];
  summary?: Array<{ label: string; value: string }>;
  calendar?: {
    monthName: string;
    firstDay: number;
    daysInMonth: number;
    spendingByDay: Map<string, number>;
    year: number;
    month: number;
    avgPerDay: number;
  };
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
  const pageHeight = doc.internal.pageSize.getHeight();
  const primaryColor = [30, 30, 30]; 
  const secondaryColor = [110, 110, 110];
  const dividerColor = [220, 220, 220];
  const headerBgColor = [245, 245, 245];

  let currentY = 25;

  // Header Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...primaryColor);
  doc.text(data.title, 15, currentY);

  // Total Spending on Right Side of Header
  if (data.summary) {
    const totalSpent = data.summary.find(s => s.label.toLowerCase().includes("spent"));
    if (totalSpent) {
      doc.setFontSize(14);
      const totalText = totalSpent.value;
      doc.text(totalText, pageWidth - 15 - doc.getTextWidth(totalText), currentY);
      
      doc.setFontSize(7);
      doc.setTextColor(...secondaryColor);
      const labelText = "TOTAL EXPENDITURE";
      doc.text(labelText, pageWidth - 15 - doc.getTextWidth(labelText), currentY - 6);
      doc.setTextColor(...primaryColor);
    }
  }

  currentY += 8;

  // Header Subtitle
  if (data.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...secondaryColor);
    doc.text(data.subtitle.toUpperCase(), 15, currentY);
    currentY += 10;
  }

  // Divider
  doc.setDrawColor(...dividerColor);
  doc.setLineWidth(0.2);
  doc.line(15, currentY, pageWidth - 15, currentY);
  currentY += 12;

  // Spending Calendar Header
  if (data.calendar) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    
    // Month/Year on the left
    const monthTitle = data.calendar.monthName;
    doc.text(monthTitle, 15, currentY);

    // Daily Average on the right
    const avgText = `Daily Avg Rs ${data.calendar.avgPerDay.toFixed(0)}`;
    doc.setFontSize(9.5);
    doc.text(avgText, pageWidth - 15 - doc.getTextWidth(avgText), currentY);
    
    currentY += 8;

    const marginX = 15;
    const gridWidth = pageWidth - marginX * 2;
    const cellWidth = gridWidth / 7;
    const cellHeight = 14;
    const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

    // Day Headers with Background
    doc.setFillColor(...headerBgColor);
    doc.rect(marginX, currentY - 4, gridWidth, 6, "F");
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...secondaryColor);
    dayNames.forEach((name, i) => {
      doc.text(name, marginX + i * cellWidth + cellWidth / 2, currentY, { align: "center" });
    });
    currentY += 2;

    let col = data.calendar.firstDay;
    let row = 0;
    const avg = data.calendar.avgPerDay;

    for (let day = 1; day <= data.calendar.daysInMonth; day++) {
      const x = marginX + col * cellWidth;
      const y = currentY + row * cellHeight;

      const dateKey = `${data.calendar.year}-${String(data.calendar.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const spent = data.calendar.spendingByDay.get(dateKey) || 0;

      // Single Red Alert for Overspending (matching UI)
      if (spent > 0) {
        const ratio = spent / avg;
        if (ratio > 1.0) {
          doc.setFillColor(255, 235, 235); // Light Red (single shade)
        } else {
          doc.setFillColor(255, 255, 255); // Neutral
        }
      } else {
        // Empty day background
        if (col === 0 || col === 6) {
          doc.setFillColor(252, 252, 252);
        } else {
          doc.setFillColor(255, 255, 255);
        }
      }
      doc.rect(x, y, cellWidth, cellHeight, "F");

      doc.setDrawColor(240, 240, 240);
      doc.setLineWidth(0.1);
      doc.rect(x, y, cellWidth, cellHeight);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5); // Increased from 7.5
      doc.setTextColor(60, 60, 60); // Professional dark gray
      doc.text(String(day), x + 1.5, y + 3.5);

      if (spent > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11); // Increased from 9.5
        doc.setTextColor(30, 30, 30); // Darker gray for balance
        doc.text(`${spent.toFixed(0)}`, x + cellWidth / 2, y + cellHeight / 2 + 2, { align: "center" });
      }

      col++;
      if (col === 7) { col = 0; row++; }
    }
    currentY += (row + 1) * cellHeight + 15;
  }

  // Tables
  for (const table of data.tables) {
    if (currentY > pageHeight - 50) {
      doc.addPage();
      currentY = 25;
    }

    if (table.title) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...primaryColor);
      doc.text(table.title.toUpperCase(), 15, currentY);
      currentY += 6;
    }

    const isTransactionHistory = table.title?.toLowerCase().includes("transaction");

    autoTable(doc, {
      startY: currentY,
      head: [table.head],
      body: table.body,
      theme: "plain",
      headStyles: { 
        textColor: [0, 0, 0],
        fontStyle: "bold",
        fontSize: 8.5,
        cellPadding: { top: 5, bottom: 3, left: 2, right: 2 },
      },
      styles: { 
        fontSize: 8,
        textColor: [50, 50, 50],
        cellPadding: { top: 4, bottom: 4, left: 2, right: 2 },
      },
      columnStyles: {
        ...table.head.reduce((acc, head, idx) => {
          if (head.toLowerCase().includes("amount") || head.toLowerCase().includes("rs") || head.toLowerCase().includes("cal")) {
            acc[idx] = { halign: "right" };
          }
          return acc;
        }, {} as any)
      },
      willDrawCell: (cellData) => {
        if (isTransactionHistory && cellData.section === "body") {
          const firstCell = String(cellData.row.raw[0]);
          const isDateRow = firstCell.includes(",") && firstCell === firstCell.toUpperCase();
          
          if (isDateRow) {
            const doc = cellData.doc;
            doc.setFillColor(...headerBgColor);
            
            // Draw background for the whole row once at the first column
            if (cellData.column.index === 0) {
              doc.rect(cellData.settings.margin.left, cellData.cell.y, pageWidth - cellData.settings.margin.left - cellData.settings.margin.right, cellData.cell.height, "F");
            }
            
            // Set font to bold for the header row
            cellData.cell.styles.fontStyle = "bold";
            cellData.cell.styles.textColor = [0, 0, 0];
          }
        }
      },
      didDrawCell: (cellData) => {
        // Default row border for non-header rows
        if (cellData.section === "body" && cellData.column.index === cellData.table.columns.length - 1) {
          const firstCell = String(cellData.row.raw[0]);
          const isDateRow = firstCell.includes(",") && firstCell === firstCell.toUpperCase();
          
          if (!isDateRow || !isTransactionHistory) {
            const doc = cellData.doc;
            doc.setDrawColor(245, 245, 245);
            doc.setLineWidth(0.1);
            doc.line(cellData.settings.margin.left, cellData.cell.y + cellData.cell.height, pageWidth - cellData.settings.margin.right, cellData.cell.y + cellData.cell.height);
          }
        }
      },
      margin: { left: 15, right: 15 },
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }

  // Footer
  const pageCount = (doc.internal as any).getNumberOfPages();
  const generationDate = new Date().toLocaleDateString("en-IN", { 
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
  });

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...secondaryColor);
    doc.text(`REPORT GENERATED BY LIFEFLOW TRACKER ON ${generationDate.toUpperCase()}`, 15, pageHeight - 12);
    doc.text(`PAGE ${i} / ${pageCount}`, pageWidth - 15 - doc.getTextWidth(`PAGE ${i} / ${pageCount}`), pageHeight - 12);
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