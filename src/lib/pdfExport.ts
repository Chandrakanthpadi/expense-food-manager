interface ExportElementToPdfOptions {
  element: HTMLElement;
  fileName: string;
}

export async function exportElementToPdf({ element, fileName }: ExportElementToPdfOptions) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const backgroundColor = getComputedStyle(document.body).backgroundColor || "#ffffff";

  const canvas = await html2canvas(element, {
    backgroundColor,
    scale: 2,
    useCORS: true,
    logging: false,
    windowWidth: Math.max(element.scrollWidth, element.clientWidth),
  });

  const imageData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const printableWidth = pageWidth - margin * 2;
  const printableHeight = pageHeight - margin * 2;
  const imageHeight = (canvas.height * printableWidth) / canvas.width;

  let remainingHeight = imageHeight;
  let offsetY = margin;

  while (remainingHeight > 0) {
    pdf.addImage(imageData, "PNG", margin, offsetY, printableWidth, imageHeight, undefined, "FAST");
    remainingHeight -= printableHeight;

    if (remainingHeight > 0) {
      pdf.addPage();
      offsetY = margin - (imageHeight - remainingHeight);
    }
  }

  pdf.save(fileName);
}

export function createPdfFileName(...parts: Array<string | undefined>) {
  return `${parts
    .filter(Boolean)
    .join("-")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-_]/g, "")
    .toLowerCase()}.pdf`;
}