
// export-pdf.js  — PDF 导出逻辑（基于 jsPDF + QRCode）
window.exportCapsulePDF = async function ({ owner, hash, yaml, validatorURL }) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const margin = 56;
  const width = doc.internal.pageSize.getWidth();
  const contentWidth = width - margin*2;

  const title = "Fireseed Capsule — 人生说明书";
  const now = new Date().toISOString().replace('T',' ').replace('Z',' UTC');
  const small = 10, normal = 12, h1 = 18, h2 = 14;

  // 封面
  doc.setFont('helvetica','bold'); doc.setFontSize(h1);
  doc.text(title, margin, 80);
  doc.setFont('helvetica','normal'); doc.setFontSize(normal);
  doc.text(`署名/Owner：${owner || 'anonymous'}`, margin, 110);
  doc.text(`生成时间：${now}`, margin, 130);
  doc.text(`校验哈希（SHA-256）：`, margin, 150);
  doc.setFont('courier','normal'); doc.setFontSize(10);
  doc.text(hash || '—', margin, 165);

  // 二维码（指向验证器）
  const qrData = validatorURL || 'https://system-null.github.io/fireseed-trilogy/tools/validator.html';
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, qrData, { width: 120, errorCorrectionLevel: 'M' });
  const qrImg = qrCanvas.toDataURL('image/png');
  doc.addImage(qrImg, 'PNG', width - margin - 120, 90, 120, 120);
  doc.setFont('helvetica','italic'); doc.setFontSize(small);
  doc.text('验证器 / Validator', width - margin - 120, 225);

  // 预留签名区
  doc.setFont('helvetica','normal'); doc.setFontSize(normal);
  doc.text('签名区 / Signature:', margin, 205);
  doc.line(margin+85, 205, margin+350, 205);
  doc.setFontSize(small);
  doc.text('（可手写签名；若使用数字签名，请将签名文件与此 PDF 一并保存）', margin, 220);

  // 第二页：摘要 + YAML 片段
  doc.addPage();
  doc.setFont('helvetica','bold'); doc.setFontSize(h2);
  doc.text('机器可读封装（YAML 片段）', margin, 70);
  const yamlSnippet = (yaml||'').slice(0, 8000); // 防止超长
  const wrapped = doc.splitTextToSize(yamlSnippet, contentWidth);
  doc.setFont('courier','normal'); doc.setFontSize(9.5);
  doc.text(wrapped, margin, 95);

  // 完成
  const fileName = `fireseed_capsule_${(owner||'anonymous').replace(/\s+/g,'_')}.pdf`;
  doc.save(fileName);
};
