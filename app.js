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

/* ===== 6) ربط الأزرار ===== */
addButton.addEventListener("click", addPiece);
clearButton.addEventListener("click", clearAll);
printButton.addEventListener("click", () => window.print());
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