import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import api from "../lib/api";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min?url";

GlobalWorkerOptions.workerSrc = workerSrc;

const LabelPrintView = () => {
  const { id } = useParams();
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const renderPdf = async (buffer: ArrayBuffer) => {
      const pdf = await getDocument({ data: buffer }).promise;
      if (cancelled) return;

      const container = containerRef.current;
      if (!container) return;
      container.innerHTML = "";

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        const viewport = page.getViewport({ scale: 1.4 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) continue;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.display = "block";
        canvas.style.margin = "0 auto 16px";

        container.appendChild(canvas);
        await page.render({ canvasContext: context, viewport, canvas }).promise;
      }
    };

    const load = async () => {
      if (!id) {
        setError("رقم الطلب غير صحيح");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const search = new URLSearchParams(location.search);
        const vendorOrderId = search.get("vendor_order_id");
        const response = await api.get(`/orders/${id}/label/print`, {
          responseType: "arraybuffer",
          params: vendorOrderId ? { vendor_order_id: vendorOrderId } : undefined,
        });
        if (cancelled) return;

        await renderPdf(response.data as ArrayBuffer);
        if (cancelled) return;

        setLoading(false);
        setTimeout(() => window.print(), 300);
      } catch (err) {
        if (cancelled) return;
        setError("تعذر تحميل البوليصة للطباعة");
        setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fff",
        color: "#111",
        padding: "24px 12px",
      }}
    >
      <div
        style={{
          maxWidth: 980,
          margin: "0 auto",
        }}
      >
        {loading && <div style={{ textAlign: "center" }}>جاري تحميل البوليصة...</div>}
        {!loading && error && (
          <div style={{ textAlign: "center", color: "#b91c1c" }}>{error}</div>
        )}
        <div ref={containerRef} />
      </div>
    </div>
  );
};

export default LabelPrintView;
