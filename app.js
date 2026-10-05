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

const clientProjectInput = $("client-project");
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
const printWasteValue = $("print-waste-value");
const printPriceValue = $("print-price-value");
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
        clientProject: clientProjectInput.value,
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
    clientProjectInput.value = data.clientProject ?? "";
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
  const formattedPrice = totalPrice.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
  totalPriceEl.textContent = formattedPrice;
  printWasteValue.textContent = waste + "%";
  printPriceValue.textContent =
    (price ? price.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "0") +
    " ج.م";

  updateReportContent({
    count,
    netVolume,
    grossVolume,
    waste,
    price,
    totalPrice,
  });
  save();
}

function formatReportNumber(value) {
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function updateReportContent(totals) {
  const reportText = {
    "report-client": clientProjectInput.value.trim() || "—",
    "report-count": totals.count,
    "report-net-volume": totals.netVolume.toFixed(3),
    "report-waste": totals.waste + "%",
    "report-gross-volume": totals.grossVolume.toFixed(3),
    "report-unit-price": formatReportNumber(totals.price),
    "report-total-price": formatReportNumber(totals.totalPrice),
    "report-cost-net": totals.netVolume.toFixed(3),
    "report-cost-waste": totals.waste + "%",
    "report-cost-gross": totals.grossVolume.toFixed(3),
    "report-cost-unit-price": formatReportNumber(totals.price),
    "report-cost-total": formatReportNumber(totals.totalPrice),
  };

  Object.entries(reportText).forEach(([id, value]) => {
    $(id).textContent = value;
  });

  const rows = pieces.map((piece, index) => {
    const row = document.createElement("tr");
    const dimensions = [
      toCm(piece.length, piece.lengthUnit),
      toCm(piece.width, piece.widthUnit),
      toCm(piece.thickness, piece.thicknessUnit),
    ];
    const values = [
      index + 1,
      piece.name || "—",
      ...dimensions.map((dimension) =>
        dimension.toLocaleString("en-US", { maximumFractionDigits: 2 })
      ),
      piece.quantity,
      piece.volume.toFixed(3),
    ];

    values.forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });
    return row;
  });

  $("report-pieces-body").replaceChildren(...rows);
}

function prepareReport() {
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const timePart = [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
  ].join("");

  $("report-number").textContent = "WC-" + datePart + "-" + timePart;
  $("report-date").textContent = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  $("report-client").textContent = clientProjectInput.value.trim() || "—";
}

async function createReportPage(pagePieces, pageNumber, pageCount, includeTotals, woodImageB64, totals) {
  const width = 1240;
  const height = 1754;
  const reportClient = clientProjectInput.value.trim() || "—";
  const { price, waste, netVolume, grossVolume, totalPrice, count } = totals;
  const escapeXml = (value) =>
    String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&apos;",
    })[character]);
  const svg = [];
  const rect = (x, y, w, h, fill, radius = 0, stroke = "") => {
    svg.push(
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}"` +
        (stroke ? ` stroke="${stroke}" stroke-width="2"` : "") + "/>"
    );
  };
  const line = (x1, y1, x2, y2, stroke, strokeWidth = 2) => {
    svg.push(
      `<path d="M${x1} ${y1} L${x2} ${y2}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/>`
    );
  };
  
  // Using direction: ltr ensures anchor placement is 100% standard across browsers.
  // start = left-aligned (extends right)
  // end = right-aligned (extends left)
  // middle = centered
  const text = (value, x, y, fontSize, options = {}) => {
    const anchor = options.anchor || "middle";
    const fill = options.fill || "#0b57d0";
    const weight = options.weight || 700;
    svg.push(
      `<text x="${x}" y="${y}" text-anchor="${anchor}" direction="ltr" ` +
        `unicode-bidi="embed" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}" ` +
        `font-weight="${weight}" fill="${fill}">${escapeXml(value)}</text>`
    );
  };
  
  const drawIcon = (kind, x, y) => {
    const color = kind === "layers" ? "#ffffff" : "#0b57d0";
    if (kind === "cube") {
      const h = 16;
      svg.push(
        `<path d="M${x} ${y - h} l${h} ${h / 2} l-${h} ${h / 2} ` +
          `l-${h} -${h / 2} Z M${x - h} ${y} v${h} l${h} ${h / 2} ` +
          `l${h} -${h / 2} v-${h} M${x} ${y} v${h * 1.5}" ` +
          `fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round"/>`
      );
    } else if (kind === "waste") {
      svg.push(`<circle cx="${x}" cy="${y}" r="16" fill="${color}"/>`);
      text("%", x, y + 6, 18, { fill: "#ffffff", anchor: "middle" });
    } else if (kind === "coins") {
      svg.push(
        `<ellipse cx="${x}" cy="${y - 8}" rx="12" ry="5" fill="none" stroke="${color}" stroke-width="2.5"/>` +
          `<path d="M${x - 12} ${y - 8} v12 c0 7 24 7 24 0 v-12 M${x - 12} ${y - 2} c0 7 24 7 24 0 M${x - 12} ${y + 4} c0 7 24 7 24 0"` +
          ` fill="none" stroke="${color}" stroke-width="2.5"/>`
      );
    } else if (kind === "money") {
      svg.push(
        `<path d="M${x} ${y - 14} C${x - 4} ${y - 6},${x - 14} ${y - 2},${x - 14} ${y + 8} ` +
          `C${x - 14} ${y + 22},${x + 14} ${y + 22},${x + 14} ${y + 8} ` +
          `C${x + 14} ${y - 2},${x + 4} ${y - 6},${x} ${y - 14} Z" ` +
          `fill="none" stroke="${color}" stroke-width="2.5"/>` +
          `<path d="M${x-4} ${y} h8 M${x-4} ${y+7} h8 M${x} ${y-3} v13" stroke="${color}" stroke-width="2"/>`
      );
    } else if (kind === "doc") {
      svg.push(
        `<path d="M${x - 10} ${y - 12} h12 l6 6 v14 a2 2 0 0 1 -2 2 h-16 a2 2 0 0 1 -2 -2 v-18 a2 2 0 0 1 2 -2 Z" fill="none" stroke="${color}" stroke-width="2.5"/>` +
        `<path d="M${x + 2} ${y - 12} v6 h6 M${x - 5} ${y + 2} h10 M${x - 5} ${y + 7} h10" fill="none" stroke="${color}" stroke-width="2.5"/>`
      );
    } else if (kind === "calendar") {
      svg.push(
        `<rect x="${x - 12}" y="${y - 10}" width="24" height="22" rx="2" fill="none" stroke="${color}" stroke-width="2.5"/>` +
        `<path d="M${x - 7} ${y - 14} v8 M${x + 7} ${y - 14} v8 M${x - 12} ${y} h24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>`
      );
    } else if (kind === "user") {
      svg.push(
        `<circle cx="${x}" cy="${y - 6}" r="6" fill="${color}"/>` +
        `<path d="M${x - 12} ${y + 12} c0 -6 6 -10 12 -10 s12 4 12 10" fill="${color}"/>`
      );
    } else if (kind === "layers") {
      svg.push(
        `<path d="M${x} ${y - 8} l12 5 l-12 5 l-12 -5 Z" fill="none" stroke="#ffffff" stroke-width="2.5"/>` +
        `<path d="M${x - 12} ${y + 3} l12 5 l12 -5 M${x - 12} ${y + 8} l12 5 l12 -5" fill="none" stroke="#ffffff" stroke-width="2.5"/>`
      );
    }
  };

  svg.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" fill="#ffffff"/>`
  );

  // 1) Header
  text("كشف تكعيب الخشب", width / 2, 120, 56, { fill: "#0b57d0", weight: 800, anchor: "middle" });
  line(40, 155, 1200, 155, "#bfdcff", 2);

  // 2) Metadata Box
  const metaY = 185;
  rect(40, metaY, 1160, 100, "#f0f6fd", 16);
  const metadata = [
    ["رقم الكشف:", $("report-number").textContent, "doc"],
    ["التاريخ:", $("report-date").textContent, "calendar"],
    ["العميل / المشروع:", reportClient, "user"],
  ];
  const metaWidth = 1160 / 3;
  metadata.forEach(([label, value, icon], index) => {
    const center = 1200 - metaWidth * (index + 0.5);
    if (index > 0) {
      line(1200 - metaWidth * index, metaY + 20, 1200 - metaWidth * index, metaY + 80, "#bfdcff", 2);
    }
    // Icon on the right, text on the left
    drawIcon(icon, center + 70, metaY + 40);
    text(label, center + 45, metaY + 47, 20, { anchor: "end", fill: "#0b57d0" }); // end means extends left from x
    text(value, center, metaY + 80, 24, { anchor: "middle", fill: "#0b57d0", weight: 800 });
  });

  // 3) Metrics Cards (6 in a row)
  const metrics = [
    ["عدد القطع", String(count), "cube"],
    ["إجمالي التكعيب", netVolume.toFixed(3) + " م³", "cube"],
    ["نسبة الهالك", waste + "%", "waste"],
    ["التكعيب بعد الهالك", grossVolume.toFixed(3) + " م³", "cube"],
    ["سعر المتر", formatReportNumber(price) + " ج.م", "coins"],
    ["الإجمالي", formatReportNumber(totalPrice) + " ج.م", "money"],
  ];
  const metricY = 300;
  const metricHeight = 180;
  const metricGap = 16;
  const metricWidth = (1160 - (metrics.length - 1) * metricGap) / metrics.length;
  metrics.forEach(([label, value, kind], index) => {
    const x = 40 + (metrics.length - index - 1) * (metricWidth + metricGap);
    const center = x + metricWidth / 2;
    rect(x, metricY, metricWidth, metricHeight, "#f0f6fd", 16);
    drawIcon(kind, center, metricY + 50);
    text(label, center, metricY + 105, 18, { fill: "#0b57d0", anchor: "middle" });
    text(value, center, metricY + 150, 24, { fill: "#0b57d0", weight: 800, anchor: "middle" });
  });

  // 4) Section "بيانات الأخشاب"
  const sectionY = 510;
  rect(40, sectionY, 1160, 64, "#0b57d0", 16);
  // Icon on right, text on left of icon
  drawIcon("layers", 1160 - 40, sectionY + 32);
  text("بيانات الأخشاب", 1160 - 70, sectionY + 42, 26, { fill: "#ffffff", anchor: "end" });

  // 5) Table
  const tableTop = sectionY + 64 - 10;
  const headerHeight = 60;
  const rowHeight = 56;
  const columns = [
    { label: "م", width: 60 },
    { label: "اسم القطعة", width: 220 },
    { label: "الطول (سم)", width: 150 },
    { label: "العرض (سم)", width: 150 },
    { label: "السمك (سم)", width: 150 },
    { label: "العدد", width: 130 },
    { label: "التكعيب (م³)", width: 300 },
  ];
  
  rect(40, tableTop + 10, 1160, headerHeight, "#f0f6fd", 0, "#bfdcff");
  let offsetRight = 1200;
  const layoutColumns = columns.map((column) => {
    const result = { ...column, center: offsetRight - column.width / 2 };
    offsetRight -= column.width;
    return result;
  });
  layoutColumns.forEach((column) => {
    text(column.label, column.center, tableTop + 10 + 38, 18, { fill: "#0b57d0", anchor: "middle" });
  });

  pagePieces.forEach((piece, rowIndex) => {
    const rowTop = tableTop + 10 + headerHeight + rowIndex * rowHeight;
    rect(40, rowTop, 1160, rowHeight, rowIndex % 2 === 0 ? "#ffffff" : "#f8fbff", 0, "#bfdcff");
    const rowValues = [
      String((pageNumber - 1) * 8 + rowIndex + 1),
      piece.name || "—",
      toCm(piece.length, piece.lengthUnit).toLocaleString("en-US", { maximumFractionDigits: 2 }),
      toCm(piece.width, piece.widthUnit).toLocaleString("en-US", { maximumFractionDigits: 2 }),
      toCm(piece.thickness, piece.thicknessUnit).toLocaleString("en-US", { maximumFractionDigits: 2 }),
      String(piece.quantity),
      piece.volume.toFixed(3),
    ];
    rowValues.forEach((value, columnIndex) => {
      text(value, layoutColumns[columnIndex].center, rowTop + 36, 20, { fill: "#0b57d0", weight: 700, anchor: "middle" });
    });
  });

  // 6) Summary & Wood Image
  if (includeTotals) {
    const tableBottom = tableTop + 10 + headerHeight + pagePieces.length * rowHeight;
    // dynamic summaryTop so it doesn't leave huge gaps
    const summaryTop = tableBottom + 40; 
    
    // Wood Image on the left
    if (woodImageB64) {
      // 400x392 original. Let's make it slightly smaller to fit elegantly.
      svg.push(`<image href="${woodImageB64}" x="40" y="${summaryTop + 20}" width="340" height="330" />`);
    }

    // Cost Box on the right
    const costX = 520;
    const costW = 680;
    rect(costX, summaryTop, costW, 360, "#ffffff", 16, "#bfdcff");
    
    // Cost Header
    svg.push(
      `<path d="M${costX} ${summaryTop + 60} v-44 a16 16 0 0 1 16 -16 h${costW - 32} a16 16 0 0 1 16 16 v44 Z" fill="#0b57d0"/>`
    );
    // Draw icon inside cost header (on the right)
    // Icon at costX + costW - 40
    svg.push(
      `<ellipse cx="${costX + costW - 40}" cy="${summaryTop + 23}" rx="12" ry="5" fill="none" stroke="#ffffff" stroke-width="2"/>` +
      `<path d="M${costX + costW - 52} ${summaryTop + 23} v12 c0 7 24 7 24 0 v-12 M${costX + costW - 52} ${summaryTop + 29} c0 7 24 7 24 0 M${costX + costW - 52} ${summaryTop + 35} c0 7 24 7 24 0" fill="none" stroke="#ffffff" stroke-width="2"/>`
    );
    // Text on the left of icon (anchor="end")
    text("ملخص التكلفة", costX + costW - 70, summaryTop + 40, 26, { fill: "#ffffff", anchor: "end" });

    const costRows = [
      ["التكعيب الأصلي:", netVolume.toFixed(3) + " م³"],
      ["الهالك:", waste + "%"],
      ["التكعيب المحسوب:", grossVolume.toFixed(3) + " م³"],
      ["سعر المتر:", formatReportNumber(price) + " ج.م"],
    ];
    costRows.forEach(([label, value], index) => {
      const rowY = summaryTop + 115 + index * 50;
      // Label on the right (anchor end)
      text(label, costX + costW - 30, rowY, 20, { anchor: "end", fill: "#0b57d0" });
      // Value on the left (anchor start)
      text(value, costX + 30, rowY, 22, { anchor: "start", fill: "#0b57d0", weight: 800 });
      if (index < costRows.length - 1) line(costX + 30, rowY + 18, costX + costW - 30, rowY + 18, "#eef5fc", 2);
    });
    
    // Total Pill
    rect(costX + 20, summaryTop + 280, costW - 40, 60, "#0b57d0", 12);
    // money bag icon for total (on the right)
    svg.push(
      `<path d="M${costX + costW - 50} ${summaryTop + 296} C${costX + costW - 46} ${summaryTop + 304},${costX + costW - 58} ${summaryTop + 308},${costX + costW - 58} ${summaryTop + 318} C${costX + costW - 58} ${summaryTop + 332},${costX + costW - 26} ${summaryTop + 332},${costX + costW - 26} ${summaryTop + 318} C${costX + costW - 26} ${summaryTop + 308},${costX + costW - 38} ${summaryTop + 304},${costX + costW - 42} ${summaryTop + 296} Z" fill="none" stroke="#ffffff" stroke-width="2.5"/>` +
      `<path d="M${costX + costW - 47} ${summaryTop + 310} h10 M${costX + costW - 47} ${summaryTop + 318} h10 M${costX + costW - 42} ${summaryTop + 307} v14" stroke="#ffffff" stroke-width="2"/>`
    );
    // Label on the left of icon (anchor end)
    text("إجمالي تكلفة الخشب:", costX + costW - 75, summaryTop + 319, 22, { fill: "#ffffff", anchor: "end" });
    // Value on the left (anchor start)
    text(formatReportNumber(totalPrice) + " ج.م", costX + 40, summaryTop + 321, 26, { fill: "#ffffff", anchor: "start", weight: 800 });
  }

  // Pagination
  text("الصفحة " + pageNumber + " من " + pageCount, 620, 1715, 16, { fill: "#82bbf5", weight: 400, anchor: "middle" });
  svg.push("</svg>");

  const svgBlob = new Blob([svg.join("")], { type: "image/svg+xml;charset=utf-8" });
  const imageUrl = URL.createObjectURL(svgBlob);
  try {
    const image = new Image();
    image.src = imageUrl;
    await image.decode();

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("تعذر إنشاء صورة تقرير PDF");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const encodedImage = canvas.toDataURL("image/jpeg", 0.94).split(",")[1];
    const imageBinary = atob(encodedImage);
    const imageBytes = new Uint8Array(imageBinary.length);
    for (let index = 0; index < imageBinary.length; index += 1) {
      imageBytes[index] = imageBinary.charCodeAt(index);
    }
    return imageBytes;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

async function createReportPdf() {
  const piecesPerPage = 8;
  const pageCount = Math.ceil(pieces.length / piecesPerPage) || 1;
  const images = [];

  let woodStackBase64 = "";
  try {
    const res = await fetch("icons/wood-stack.png");
    const blob = await res.blob();
    woodStackBase64 = await new Promise(r => {
      const reader = new FileReader();
      reader.onloadend = () => r(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error("Could not load wood stack image", e);
  }

  const price = parseNumber(priceInput.value, false) || 0;
  const waste = parseNumber(wasteInput.value, true) || 0;
  const netVolume = pieces.reduce((sum, piece) => sum + piece.volume, 0);
  const grossVolume = netVolume * (1 + waste / 100);
  const totalPrice = grossVolume * price;
  const count = pieces.reduce((sum, piece) => sum + piece.quantity, 0);
  const totals = { price, waste, netVolume, grossVolume, totalPrice, count };

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const pagePieces = pieces.slice(
      pageIndex * piecesPerPage,
      (pageIndex + 1) * piecesPerPage
    );
    images.push(
      await createReportPage(
        pagePieces,
        pageIndex + 1,
        pageCount,
        pageIndex === pageCount - 1,
        woodStackBase64,
        totals
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

  prepareReport();
  let file;
  try {
    const now = new Date();
    const fileDate = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
    file = new File(
      [await createReportPdf()],
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
clientProjectInput.addEventListener("input", () => {
  $("report-client").textContent = clientProjectInput.value.trim() || "—";
  save();
});
printButton.addEventListener("click", () => {
  prepareReport();
  window.print();
});
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