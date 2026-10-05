"use strict";

// غيّر الرقم ده لما تضيف أو تعدّل قايمة الملفات تحت
const CACHE = "wood-calc-v2";

const FILES = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/wood-stack.png",
];

// أول ما الحارس يتركّب: يحفظ نسخة من كل الملفات
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
  self.skipWaiting();
});

// لما يشتغل: يمسح النسخ القديمة المحفوظة باسم تاني
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// كل طلب ملف: جرّب الشبكة الأول، ولو فشلت استخدم المحفوظ
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req, { cache: "no-cache" })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches
          .match(req)
          .then((cached) => cached || (req.mode === "navigate" ? caches.match("./") : undefined))
      )
  );
});