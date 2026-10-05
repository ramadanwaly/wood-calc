"use strict";

/* ===== 1) الوحدات ===== */
const UNIT_LABEL = { cm: "سم", mm: "مم", in: "بوصة" };

// بيحوّل أي قياس إلى سنتيمتر
function toCm(value, unit) {
  if (unit === "mm") return value / 10;
  if (unit === "in") return value * 2.54;
  return value;
}

/* ===== 2) قراءة الأرقام (بتفهم الأرقام العربية) ===== */
// commaIsDecimal = true  : الفاصلة معناها كسر عشري (1,5 = 1.5)
// commaIsDecimal = false : الفاصلة معناها فاصل آلاف (30,000 = 30000)
function parseNumber(text, commaIsDecimal) {
  let s = String(text).trim();
  s = s.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  s = s.replace(/٫/g, ".");
  s = s.replace(/[,،]/g, commaIsDecimal ? "." : "");
  s = s.replace(/\s/g, "");
  if (!/^(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
  return Number(s);
}

/* ===== 3) عناصر الصفحة ===== */
const $ = (id) => document.getElementById(id);

const nameInput = $("name");
const lengthInput = $("length");
const lengthUnit = $("length-unit");
const widthInput = $("width");
const widthUnit = $("width-unit");
const thicknessInput = $("thickness");
const thicknessUnit = $("thickness-unit");
const quantityInput = $("quantity");
const addButton = $("add-button");

const piecesBody = $("pieces-body");
const totalCountEl = $("total-count");
const netVolumeEl = $("net-volume");
const wasteInput = $("waste");
const priceInput = $("price");
const grossVolumeEl = $("gross-volume");
const totalPriceEl = $("total-price");
const clearButton = $("clear-button");
const printButton = $("print-button");
const whatsappButton = $("whatsapp-button");

/* ===== 4) قائمة القطع ===== */
let pieces = [];

/* ===== الحفظ في ذاكرة المتصفح ===== */
const STORAGE_KEY = "wood-calc-v1";
const VALID_UNITS = ["cm", "mm", "in"];

function setUnit(select, value) {
  if (VALID_UNITS.includes(value)) select.value = value;
}

function save() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        pieces,
        waste: wasteInput.value,
        price: priceInput.value,
        units: {
          length: lengthUnit.value,
          width: widthUnit.value,
          thickness: thicknessUnit.value,
        },
      })
    );
  } catch (e) {
    // لو الحفظ مش متاح، التطبيق يكمّل شغل عادي من غير حفظ
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);

    if (Array.isArray(data.pieces)) {
      pieces = data.pieces.filter(
        (p) => p && typeof p.volume === "number" && typeof p.quantity === "number"
      );
    }
    wasteInput.value = data.waste ?? "0";
    priceInput.value = data.price ?? "";
    if (data.units) {
      setUnit(lengthUnit, data.units.length);
      setUnit(widthUnit, data.units.width);
      setUnit(thicknessUnit, data.units.thickness);
    }
  } catch (e) {
    // لو البيانات المحفوظة تالفة، نبدأ من الأول
  }
}

function addPiece() {
  const length = parseNumber(lengthInput.value, true);
  const width = parseNumber(widthInput.value, true);
  const thickness = parseNumber(thicknessInput.value, true);
  const quantity = parseNumber(quantityInput.value, true);

  if (!(length > 0) || !(width > 0) || !(thickness > 0)) {
    alert("اكتب الطول والعرض والتخانة بأرقام أكبر من صفر");
    return;
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    alert("العدد لازم يكون رقم صحيح 1 أو أكتر");
    return;
  }

  // الحجم بالمتر المكعب = (سم × سم × سم) ÷ 1,000,000 × العدد
  const volume =
    (toCm(length, lengthUnit.value) *
      toCm(width, widthUnit.value) *
      toCm(thickness, thicknessUnit.value) *
      quantity) /
    1000000;

  pieces.push({
    name: nameInput.value.trim(),
    length, lengthUnit: lengthUnit.value,
    width, widthUnit: widthUnit.value,
    thickness, thicknessUnit: thicknessUnit.value,
    quantity,
    volume,
  });

  // نفضّي الخانات للقطعة الجاية (والوحدات بتفضل زي ما هي)
  nameInput.value = "";
  lengthInput.value = "";
  widthInput.value = "";
  thicknessInput.value = "";
  quantityInput.value = "1";
  lengthInput.focus();

  render();
}

function deletePiece(index) {
  pieces.splice(index, 1);
  render();
}

function clearAll() {
  if (pieces.length === 0) return;
  if (confirm("تمسح كشف القطع كله؟")) {
    pieces = [];
    render();
  }
}

/* ===== 5) رسم الجدول والإجماليات ===== */
function makeCell(text) {
  const td = document.createElement("td");
  td.textContent = text; // textContent آمن: بيعرض النص زي ما هو
  return td;
}

function render() {
  piecesBody.innerHTML = "";

  pieces.forEach((p, index) => {
    const tr = document.createElement("tr");

    const size =
      p.length + " " + UNIT_LABEL[p.lengthUnit] + " × " +
      p.width + " " + UNIT_LABEL[p.widthUnit] + " × " +
      p.thickness + " " + UNIT_LABEL[p.thicknessUnit];

    tr.appendChild(makeCell(p.name || "-"));
    tr.appendChild(makeCell(size));
    tr.appendChild(makeCell(p.quantity));
    tr.appendChild(makeCell(p.volume.toFixed(5)));

    const deleteCell = document.createElement("td");
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "delete-button";
    deleteBtn.textContent = "حذف";
    deleteBtn.addEventListener("click", () => deletePiece(index));
    deleteCell.appendChild(deleteBtn);
    tr.appendChild(deleteCell);

    piecesBody.appendChild(tr);
  });

  updateTotals();
}

function updateTotals() {
  const count = pieces.reduce((sum, p) => sum + p.quantity, 0);
  const netVolume = pieces.reduce((sum, p) => sum + p.volume, 0);

  const waste = parseNumber(wasteInput.value, true) || 0;
  const price = parseNumber(priceInput.value, false) || 0;

  const grossVolume = netVolume * (1 + waste / 100);
  const totalPrice = grossVolume * price;

  totalCountEl.textContent = count;
  netVolumeEl.textContent = netVolume.toFixed(4);
  grossVolumeEl.textContent = grossVolume.toFixed(4);
    totalPriceEl.textContent = totalPrice.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });

  save();
}

function createReportPage(pagePieces, pageNumber, pageCount, includeTotals) {
  const canvas = document.createElement("canvas");
  canvas.width = 1240;
  canvas.height = 1754;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("تعذر إنشاء صورة تقرير PDF");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.direction = "rtl";
  context.textAlign = "center";
  context.fillStyle = "#1e293b";
  context.font = "bold 42px Arial, sans-serif";
  context.fillText("كشف تكعيب الخشب", canvas.width / 2, 105);
  context.font = "24px Arial, sans-serif";
  context.fillText(new Date().toLocaleDateString("ar-EG"), canvas.width / 2, 155);

  const columns = [
    { label: "اسم القطعة", right: 1170, width: 245 },
    { label: "المقاس", right: 925, width: 455 },
    { label: "العدد", right: 470, width: 150 },
    { label: "الحجم (م³)", right: 320, width: 250 },
  ];
  const tableTop = 215;
  const headerHeight = 58;
  const rowHeight = 66;

  context.fillStyle = "#1d4ed8";
  context.fillRect(70, tableTop, 1100, headerHeight);
  context.fillStyle = "#ffffff";
  context.font = "bold 25px Arial, sans-serif";
  columns.forEach((column) => {
    context.fillText(
      column.label,
      column.right - column.width / 2,
      tableTop + 38,
      column.width - 12
    );
  });

  pagePieces.forEach((piece, index) => {
    const rowTop = tableTop + headerHeight + index * rowHeight;
    const baseline = rowTop + 42;
    const dimensions =
      piece.length + " " + UNIT_LABEL[piece.lengthUnit] + " × " +
      piece.width + " " + UNIT_LABEL[piece.widthUnit] + " × " +
      piece.thickness + " " + UNIT_LABEL[piece.thicknessUnit];
    const values = [
      piece.name || "-",
      dimensions,
      String(piece.quantity),
      piece.volume.toFixed(5),
    ];

    context.fillStyle = index % 2 === 0 ? "#f1f5f9" : "#ffffff";
    context.fillRect(70, rowTop, 1100, rowHeight);
    context.fillStyle = "#1e293b";
    context.font = "22px Arial, sans-serif";
    columns.forEach((column, columnIndex) => {
      context.fillText(
        values[columnIndex],
        column.right - column.width / 2,
        baseline,
        column.width - 16
      );
    });
    context.strokeStyle = "#cbd5e1";
    context.beginPath();
    context.moveTo(70, rowTop + rowHeight);
    context.lineTo(1170, rowTop + rowHeight);
    context.stroke();
  });

  if (includeTotals) {
    const totalsTop = 1320;
    context.fillStyle = "#1e293b";
    context.font = "bold 28px Arial, sans-serif";
    context.textAlign = "right";
    context.fillText("الإجماليات", 1160, totalsTop);
    context.font = "24px Arial, sans-serif";

    const totals = [
      "عدد القطع: " + totalCountEl.textContent,
      "التكعيب الصافي: " + netVolumeEl.textContent + " م³",
      "نسبة الهالك: " + (wasteInput.value || "0") + "%",
      "التكعيب بعد الهالك: " + grossVolumeEl.textContent + " م³",
      "سعر المتر المكعب: " + (priceInput.value || "0") + " ج.م",
      "السعر الإجمالي: " + totalPriceEl.textContent + " ج.م",
    ];

    totals.forEach((line, index) => {
      context.fillText(line, 1160, totalsTop + 52 + index * 48);
    });
  }

  context.textAlign = "center";
  context.font = "18px Arial, sans-serif";
  context.fillStyle = "#64748b";
  context.fillText("الصفحة " + pageNumber + " من " + pageCount, 620, 1695);

  const encodedImage = canvas.toDataURL("image/jpeg", 0.92).split(",")[1];
  const imageBinary = atob(encodedImage);
  const imageBytes = new Uint8Array(imageBinary.length);
  for (let index = 0; index < imageBinary.length; index += 1) {
    imageBytes[index] = imageBinary.charCodeAt(index);
  }
  return imageBytes;
}

function createReportPdf() {
  const piecesPerPage = 14;
  const pageCount = Math.ceil(pieces.length / piecesPerPage);
  const images = [];

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const pagePieces = pieces.slice(
      pageIndex * piecesPerPage,
      (pageIndex + 1) * piecesPerPage
    );
    images.push(
      createReportPage(
        pagePieces,
        pageIndex + 1,
        pageCount,
        pageIndex === pageCount - 1
      )
    );
  }

  const encoder = new TextEncoder();
  const chunks = [];
  const offsets = [0];
  let byteLength = 0;
  const append = (chunk) => {
    chunks.push(chunk);
    byteLength += chunk.byteLength;
  };
  const appendText = (text) => append(encoder.encode(text));
  const addObject = (id, content) => {
    offsets[id] = byteLength;
    appendText(id + " 0 obj\n");
    content.forEach(append);
    appendText("\nendobj\n");
  };

  appendText("%PDF-1.4\n");
  addObject(1, [encoder.encode("<< /Type /Catalog /Pages 2 0 R >>")]);
  const pageIds = images.map((_, index) => 3 + index * 3);
  addObject(2, [
    encoder.encode(
      "<< /Type /Pages /Kids [" +
        pageIds.map((id) => id + " 0 R").join(" ") +
        "] /Count " + pageIds.length + " >>"
    ),
  ]);

  images.forEach((imageBytes, index) => {
    const pageId = pageIds[index];
    const contentId = pageId + 1;
    const imageId = pageId + 2;
    addObject(pageId, [
      encoder.encode(
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] " +
          "/Resources << /XObject << /Im0 " + imageId + " 0 R >> >> " +
          "/Contents " + contentId + " 0 R >>"
      ),
    ]);
    const stream = encoder.encode(
      "q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ\n"
    );
    addObject(contentId, [
      encoder.encode("<< /Length " + stream.byteLength + " >>\nstream\n"),
      stream,
      encoder.encode("endstream"),
    ]);
    addObject(imageId, [
      encoder.encode(
        "<< /Type /XObject /Subtype /Image /Width 1240 /Height 1754 " +
          "/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode " +
          "/Length " + imageBytes.byteLength + " >>\nstream\n"
      ),
      imageBytes,
      encoder.encode("\nendstream"),
    ]);
  });

  const crossReferenceOffset = byteLength;
  appendText("xref\n0 " + (offsets.length) + "\n");
  appendText("0000000000 65535 f \n");
  for (let id = 1; id < offsets.length; id += 1) {
    appendText(String(offsets[id]).padStart(10, "0") + " 00000 n \n");
  }
  appendText(
    "trailer\n<< /Size " + offsets.length + " /Root 1 0 R >>\n" +
      "startxref\n" + crossReferenceOffset + "\n%%EOF"
  );

  return new Blob(chunks, { type: "application/pdf" });
}

async function sharePdfOnWhatsApp() {
  if (pieces.length === 0) {
    alert("أضف قطعة واحدة على الأقل قبل إرسال الكشف");
    return;
  }

  let file;
  try {
    const now = new Date();
    const fileDate = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
    file = new File(
      [createReportPdf()],
      "wood-calc-" + fileDate + ".pdf",
      { type: "application/pdf" }
    );
  } catch {
    alert("تعذر إنشاء ملف PDF. جرّب استخدام خيار الطباعة وحفظ الكشف كملف PDF.");
    return;
  }

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "كشف تكعيب الخشب" });
    } catch (error) {
      if (error.name !== "AbortError") {
        alert("تعذرت مشاركة ملف PDF. يمكنك تنزيله وإرفاقه يدويًا.");
      }
    }
    return;
  }

  const downloadLink = document.createElement("a");
  downloadLink.href = URL.createObjectURL(file);
  downloadLink.download = file.name;
  downloadLink.click();
  setTimeout(() => URL.revokeObjectURL(downloadLink.href), 1000);
  alert("تم تنزيل ملف PDF. أرفقه في محادثة WhatsApp لإرساله.");
}

/* ===== 6) ربط الأزرار ===== */
addButton.addEventListener("click", addPiece);
clearButton.addEventListener("click", clearAll);
printButton.addEventListener("click", () => window.print());
whatsappButton.addEventListener("click", sharePdfOnWhatsApp);
wasteInput.addEventListener("input", updateTotals);
priceInput.addEventListener("input", updateTotals);

[lengthUnit, widthUnit, thicknessUnit].forEach((el) =>
  el.addEventListener("change", save)
);

load();
render();
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}