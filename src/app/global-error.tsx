"use client";

import { AlertTriangle } from "lucide-react";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, fontFamily: "Segoe UI, Tahoma, Arial, sans-serif", background: "#f2f5f9" }}>
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, maxWidth: 420, textAlign: "center", boxShadow: "0 20px 50px -30px rgba(10,34,57,.5)" }}>
            <div style={{ fontSize: 32 }}>⚠️</div>
            <h1 style={{ fontSize: 18, color: "#0a2239", margin: "12px 0 8px" }}>تعذّر تحميل المنصة</h1>
            <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.8, margin: 0 }}>
              حدث خطأ في تحميل التطبيق. أعد المحاولة أو ادخل بالحساب التجريبي مباشرة.
            </p>
            <div style={{ display: "grid", gap: 8, marginTop: 20 }}>
              <button
                type="button"
                onClick={reset}
                style={{ background: "#0a2239", color: "#fff", border: 0, borderRadius: 12, padding: "12px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              >
                إعادة المحاولة
              </button>
              <a
                href="/api/auth/demo"
                style={{ background: "#0f9d8b", color: "#fff", borderRadius: 12, padding: "12px 16px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}
              >
                الدخول بالحساب التجريبي
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
