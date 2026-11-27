import { toPng } from "html-to-image";
export async function exportPNG(element: HTMLElement, name: string) {
  const data = await toPng(element, { pixelRatio: 2, cacheBust: true });
  const a = document.createElement("a");
  a.href = data;
  a.download = name + ".png";
  a.click();
}
export async function exportPDF(element: HTMLElement, name: string) {
  const data = await toPng(element, {
    pixelRatio: 2,
    backgroundColor: "#ffffff",
  });
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  pdf.addImage(data, "PNG", 0, 0, 210, 297);
  pdf.save(name + ".pdf");
}
