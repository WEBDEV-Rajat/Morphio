// PDFEditor.js
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Upload,
  Download,
  RotateCw,
  Trash2,
  Type,
  FileText,
  Plus,
  ZoomIn,
  ZoomOut,
  Save,
  X,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Hand,
  PenTool,
  Square,
  Minus,
  Eraser,
  Undo,
  Redo,
  Trash,
  Bold,
  AlignRight,
  Strikethrough,
  Underline,
} from "lucide-react";

const PDFEditor = () => {
  /* ---------- STATE ---------- */
  const [file, setFile] = useState(null);
  const [filename, setFilename] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pageCount, setPageCount] = useState(0);
  const [selectedPage, setSelectedPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [scale, setScale] = useState(1.2);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [pageThumbnails, setPageThumbnails] = useState([]);
  const [pageOrder, setPageOrder] = useState([]);

  // text tool
  const [textMode, setTextMode] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [textSize, setTextSize] = useState(14);
  const [textColor, setTextColor] = useState("#000000");
  const [tempTexts, setTempTexts] = useState([]);
  const [currentTextBox, setCurrentTextBox] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMessage, setDragMessage] = useState(false);

  // drawing tools
  const [drawMode, setDrawMode] = useState("hand");
  const [penColor, setPenColor] = useState("#000000");
  const [penWidth, setPenWidth] = useState(2);
  const [rectStroke, setRectStroke] = useState("#000000");
  const [rectStrokeWidth, setRectStrokeWidth] = useState(2);
  const [eraserWidth, setEraserWidth] = useState(10);
  const [fontFamily, setFontFamily] = useState("Arial");
const [opacity, setOpacity] = useState(100);
const [isBold, setIsBold] = useState(false);
const [isStrikethrough, setIsStrikethrough] = useState(false);
const [isUnderline, setIsUnderline] = useState(false);

  // drawings + history
  const [drawings, setDrawings] = useState([]);
  const [history, setHistory] = useState([[]]);
  const [historyIdx, setHistoryIdx] = useState(0);

  // refs
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const panOffset = useRef({ x: 0, y: 0 });
  const lastPan = useRef(null);
  const draggedIdx = useRef(null);

  /* --------------------------------------------------------------- */
  /*  PDF.js loading                                                   */
  /* --------------------------------------------------------------- */
  useEffect(() => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    s.async = true;
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      setPdfLoaded(true);
    };
    document.body.appendChild(s);
    return () => document.body.removeChild(s);
  }, []);

  /* --------------------------------------------------------------- */
  /*  File → URL → PDF object                                          */
  /* --------------------------------------------------------------- */
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  useEffect(() => {
    if (pdfUrl && pdfLoaded && window.pdfjsLib) loadPDF();
  }, [pdfUrl, pdfLoaded]);

  const loadPDF = async () => {
    try {
      const task = window.pdfjsLib.getDocument(pdfUrl);
      const pdf = await task.promise;
      setPdfDoc(pdf);
      setPageCount(pdf.numPages);
      generateThumbnails(pdf);
      setPageOrder(Array.from({ length: pdf.numPages }, (_, i) => i));
    } catch (e) {
      console.error(e);
    }
  };

  const generateThumbnails = async (pdf) => {
    const thumbs = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const vp = page.getViewport({ scale: 0.2 });
      const c = document.createElement("canvas");
      c.height = vp.height;
      c.width = vp.width;
      const ctx = c.getContext("2d");
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      thumbs.push(c.toDataURL());
    }
    setPageThumbnails(thumbs);
  };

  /* --------------------------------------------------------------- */
  /*  Render page + drawings + temp text                               */
  /* --------------------------------------------------------------- */
  const renderPDF = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;
    const realIdx = pageOrder[selectedPage];
    const page = await pdfDoc.getPage(realIdx + 1);
    const viewport = page.getViewport({ scale });
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;

    ctx.save();
    ctx.translate(panOffset.current.x, panOffset.current.y);

    // persistent drawings
    drawings.forEach((d) => {
      if (d.pageIndex !== selectedPage) return;
      if (d.type === "path") drawPath(ctx, d);
      else if (d.type === "rect") drawRect(ctx, d);
      else if (d.type === "line") drawLine(ctx, d);
    });

   // inside renderPDF, replace the temp-text drawing block with:
tempTexts.forEach((t) => {
  if (t.pageIndex !== selectedPage) return;

  // box
  ctx.globalAlpha = opacity / 100;
  ctx.fillRect(t.x, t.y - t.size * scale, t.width, t.height);
  ctx.globalAlpha = 1;

  // text
  ctx.fillStyle = t.color;
  let font = `${isBold ? "bold " : ""}${t.size * scale}px ${fontFamily}`;
  ctx.font = font;

  // underline / strikethrough
  const textY = t.y - 5;
  const metrics = ctx.measureText(t.text);
  const textX = t.x + 5;

  ctx.fillText(t.text, textX, textY);

  if (isUnderline) {
    ctx.beginPath();
    ctx.moveTo(textX, textY + 2);
    ctx.lineTo(textX + metrics.width, textY + 2);
    ctx.strokeStyle = t.color;
    ctx.lineWidth = 1.5 * scale;
    ctx.stroke();
  }
  if (isStrikethrough) {
    const midY = textY - (t.size * scale) / 3;
    ctx.beginPath();
    ctx.moveTo(textX, midY);
    ctx.lineTo(textX + metrics.width, midY);
    ctx.strokeStyle = t.color;
    ctx.lineWidth = 1.5 * scale;
    ctx.stroke();
  }
});

    // text-box preview
    if (isDragging && dragStart && textMode) {
      const x = Math.min(dragStart.x, dragStart.x + panOffset.current.x);
      const y = Math.min(dragStart.y, dragStart.y + panOffset.current.y);
      const w = Math.abs(panOffset.current.x);
      const h = Math.abs(panOffset.current.y);
      ctx.fillStyle = "rgba(59,130,246,0.3)";
      ctx.fillRect(x, y, w, h);
    }

    ctx.restore();
  }, [
    pdfDoc,
    pageOrder,
    selectedPage,
    scale,
    drawings,
    tempTexts,
    isDragging,
    dragStart,
    textMode,
  ]);

  useEffect(() => {
    renderPDF();
  }, [renderPDF]);

  /* --------------------------------------------------------------- */
  /*  Drawing helpers                                                  */
  /* --------------------------------------------------------------- */
  const drawPath = (ctx, p) => {
    ctx.strokeStyle = p.color;
    ctx.lineWidth = p.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    p.points.forEach((pt, i) =>
      i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)
    );
    ctx.stroke();
  };
  const drawRect = (ctx, r) => {
    ctx.fillStyle = r.fill;
    ctx.fillRect(r.x, r.y, r.width, r.height);
    if (r.strokeWidth > 0) {
      ctx.strokeStyle = r.stroke;
      ctx.lineWidth = r.strokeWidth;
      ctx.strokeRect(r.x, r.y, r.width, r.height);
    }
  };
  const drawLine = (ctx, l) => {
    ctx.strokeStyle = l.color;
    ctx.lineWidth = l.width;
    ctx.beginPath();
    ctx.moveTo(l.x1, l.y1);
    ctx.lineTo(l.x2, l.y2);
    ctx.stroke();
  };

  /* --------------------------------------------------------------- */
  /*  History                                                          */
  /* --------------------------------------------------------------- */
  const pushHistory = (newDraw) => {
    const next = history.slice(0, historyIdx + 1);
    next.push(newDraw);
    setHistory(next);
    setHistoryIdx(next.length - 1);
  };
  const undo = () => {
    if (historyIdx > 0) {
      setHistoryIdx(historyIdx - 1);
      setDrawings(history[historyIdx - 1]);
    }
  };
  const redo = () => {
    if (historyIdx < history.length - 1) {
      setHistoryIdx(historyIdx + 1);
      setDrawings(history[historyIdx + 1]);
    }
  };
  const clearPage = () => {
    const filtered = drawings.filter((d) => d.pageIndex !== selectedPage);
    pushHistory(filtered);
    setDrawings(filtered);
  };

  /* --------------------------------------------------------------- */
  /*  Mouse helpers                                                    */
  /* --------------------------------------------------------------- */
  const getMouse = (e) => {
    const c = canvasRef.current;
    const r = c.getBoundingClientRect();
    return {
      x: e.clientX - r.left - panOffset.current.x,
      y: e.clientY - r.top - panOffset.current.y,
    };
  };

  const handleMouseDown = (e) => {
    const pos = getMouse(e);
    if (drawMode === "hand") {
      lastPan.current = { x: e.clientX, y: e.clientY };
      return;
    }
    if (drawMode === "text") {
      setDragStart(pos);
      setIsDragging(true);
      setDragMessage(false);
      return;
    }

    const id = Date.now().toString();
    if (drawMode === "pen") {
      setDrawings((p) => [
        ...p,
        {
          id,
          type: "path",
          points: [pos],
          color: penColor,
          width: penWidth,
          pageIndex: selectedPage,
        },
      ]);
    }
    if (drawMode === "rect") {
      setDrawings((p) => [
        ...p,
        {
          id,
          type: "rect",
          x: pos.x,
          y: pos.y,
          width: 0,
          height: 0,
          stroke: rectStroke,
          strokeWidth: rectStrokeWidth,
          pageIndex: selectedPage,
        },
      ]);
    }
    if (drawMode === "line") {
      setDrawings((p) => [
        ...p,
        {
          id,
          type: "line",
          x1: pos.x,
          y1: pos.y,
          x2: pos.x,
          y2: pos.y,
          color: penColor,
          width: penWidth,
          pageIndex: selectedPage,
        },
      ]);
    }
    setDragStart(pos);
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging && drawMode === "hand" && lastPan.current) {
      const dx = e.clientX - lastPan.current.x;
      const dy = e.clientY - lastPan.current.y;
      panOffset.current.x += dx;
      panOffset.current.y += dy;
      lastPan.current = { x: e.clientX, y: e.clientY };
      renderPDF();
      return;
    }
    if (!isDragging) return;

    const pos = getMouse(e);
    const last = drawings[drawings.length - 1];

    if (drawMode === "pen" && last?.type === "path") {
      last.points.push(pos);
      setDrawings((p) => [...p]);
    }
    if (drawMode === "rect" && last?.type === "rect") {
      last.width = pos.x - last.x;
      last.height = pos.y - last.y;
      setDrawings((p) => [...p]);
    }
    if (drawMode === "line" && last?.type === "line") {
      last.x2 = pos.x;
      last.y2 = pos.y;
      setDrawings((p) => [...p]);
    }
    if (drawMode === "eraser") {
      const r = eraserWidth / 2;
      const filtered = drawings.filter((d) => {
        if (d.pageIndex !== selectedPage) return true;
        if (d.type === "path")
          return !d.points.some((pt) => distance(pt, pos) < r);
        if (d.type === "rect")
          return !(
            pos.x > d.x - r &&
            pos.x < d.x + d.width + r &&
            pos.y > d.y - r &&
            pos.y < d.y + d.height + r
          );
        if (d.type === "line")
          return !lineCircle(
            pos,
            { x: d.x1, y: d.y1 },
            { x: d.x2, y: d.y2 },
            r
          );
        return true;
      });
      setDrawings(filtered);
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) {
      lastPan.current = null;
      return;
    }

    if (drawMode === "text" && dragStart) {
      const x = Math.min(dragStart.x, dragStart.x + panOffset.current.x);
      const y = Math.min(dragStart.y, dragStart.y + panOffset.current.y);
      const w = Math.abs(panOffset.current.x);
      const h = Math.abs(panOffset.current.y);
      const id = Date.now().toString();

      setTempTexts((p) => [
        ...p,
        {
          id,
          text: textInput || "Text",
          x,
          y,
          width: w,
          height: h,
          size: textSize,
          color: textColor,
          pageIndex: selectedPage,
        },
      ]);
      setCurrentTextBox({ x, y, width: w, height: h });
    }

    if (["pen", "rect", "line", "eraser"].includes(drawMode)) {
      pushHistory(drawings);
    }

    setIsDragging(false);
    setDragStart(null);
  };

  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const lineCircle = (c, a, b, r) => {
    const ac = { x: c.x - a.x, y: c.y - a.y };
    const ab = { x: b.x - a.x, y: b.y - a.y };
    const ab2 = ab.x * ab.x + ab.y * ab.y;
    const proj = (ac.x * ab.x + ac.y * ab.y) / ab2;
    const t = Math.max(0, Math.min(1, proj));
    const h = { x: a.x + ab.x * t, y: a.y + ab.y * t };
    return distance(h, c) <= r;
  };

  /* --------------------------------------------------------------- */
  /*  File upload                                                      */
  /* --------------------------------------------------------------- */
  const handleFileUpload = async (e) => {
    const f = e.target.files[0];
    if (!f || f.type !== "application/pdf") return alert("Select a PDF");
    setLoading(true);
    const fd = new FormData();
    fd.append("file", f, f.name);
    try {
      const res = await fetch("http://localhost:5000/api/edit-pdf/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (res.ok) {
        setFile(f);
        setFilename(data.filename);
        setPageCount(data.pageCount);
        setSelectedPage(0);
      } else alert(data.error);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------------------------------------------- */
  /*  Page actions (rotate / delete / reorder)                         */
  /* --------------------------------------------------------------- */
  const handleRotatePage = async () => {
    setLoading(true);
    try {
      await fetch("http://localhost:5000/api/edit-pdf/rotate-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename,
          pageIndex: pageOrder[selectedPage],
          degrees: 90,
        }),
      });
      const blob = await (
        await fetch(`http://localhost:5000/uploads/${filename}`)
      ).blob();
      const newF = new File([blob], filename, { type: "application/pdf" });
      setFile(newF);
      setPdfUrl(URL.createObjectURL(newF));
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePage = async () => {
    if (pageCount <= 1) return alert("Cannot delete the last page");
    if (!confirm("Delete this page?")) return;
    setLoading(true);
    try {
      await fetch("http://localhost:5000/api/edit-pdf/delete-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, pageIndex: pageOrder[selectedPage] }),
      });
      const blob = await (
        await fetch(`http://localhost:5000/uploads/${filename}`)
      ).blob();
      const newF = new File([blob], filename, { type: "application/pdf" });
      setFile(newF);
      setPdfUrl(URL.createObjectURL(newF));
      setPageCount((c) => c - 1);
      setPageOrder((p) => p.filter((_, i) => i !== selectedPage));
      if (selectedPage >= pageCount - 1) setSelectedPage(pageCount - 2);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- PAGE REORDERING (fixed) ---------- */
  const startDrag = (e, idx) => {
    draggedIdx.current = idx;
    e.dataTransfer.setData("text/plain", idx);
  };
  const allowDrop = (e) => e.preventDefault();
  const dropPage = async (e, targetIdx) => {
    e.preventDefault();
    if (draggedIdx.current === null) return;
    const src = draggedIdx.current;
    if (src === targetIdx) return;

    const newOrder = [...pageOrder];
    const [moved] = newOrder.splice(src, 1);
    newOrder.splice(targetIdx, 0, moved);
    setPageOrder(newOrder);
    setSelectedPage(targetIdx);
    draggedIdx.current = null;

    await reorderBackend(newOrder);
  };

  const moveUp = async (idx) => {
    if (idx === 0) return;
    const newOrder = [...pageOrder];
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    setPageOrder(newOrder);
    setSelectedPage(idx - 1);
    await reorderBackend(newOrder);
  };
  const moveDown = async (idx) => {
    if (idx === pageOrder.length - 1) return;
    const newOrder = [...pageOrder];
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    setPageOrder(newOrder);
    setSelectedPage(idx + 1);
    await reorderBackend(newOrder);
  };
  const reorderBackend = async (order) => {
    setLoading(true);
    try {
      await fetch("http://localhost:5000/api/edit-pdf/reorder-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, pageOrder: order }),
      });
      const blob = await (
        await fetch(`http://localhost:5000/uploads/${filename}`)
      ).blob();
      const newF = new File([blob], filename, { type: "application/pdf" });
      setFile(newF);
      setPdfUrl(URL.createObjectURL(newF));
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------------------------------------------- */
  /*  Add text to PDF (backend)                                        */
  /* --------------------------------------------------------------- */
  const handleAddText = async () => {
    if (!currentTextBox || !textInput) return alert("Create a box & type text");
    setLoading(true);
    const canvas = canvasRef.current;
    const pdfY = canvas.height - currentTextBox.y;
    const r = parseInt(textColor.slice(1, 3), 16) / 255;
    const g = parseInt(textColor.slice(3, 5), 16) / 255;
    const b = parseInt(textColor.slice(5, 7), 16) / 255;

    try {
      await fetch("http://localhost:5000/api/edit-pdf/add-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename,
          pageIndex: pageOrder[selectedPage],
          text: textInput,
          x: currentTextBox.x / scale,
          y: pdfY / scale,
          size: textSize,
          color: { r, g, b },
          width: currentTextBox.width / scale,
          height: currentTextBox.height / scale,
        }),
      });
      const blob = await (
        await fetch(`http://localhost:5000/uploads/${filename}`)
      ).blob();
      const newF = new File([blob], filename, { type: "application/pdf" });
      setFile(newF);
      setPdfUrl(URL.createObjectURL(newF));
      setTempTexts([]);
      setCurrentTextBox(null);
      setTextMode(false);
      setTextInput("");
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------------------------------------------- */
  /*  Tool button helper                                               */
  /* --------------------------------------------------------------- */
  const toolBtn = (mode, Icon, title) => (
    <button
      onClick={() => {
        setDrawMode(mode);
        setTextMode(mode === "text");
        if (mode !== "text") {
          setTempTexts([]);
          setCurrentTextBox(null);
          setDragMessage(false);
        }
      }}
      className={`p-2 rounded-lg transition-colors ${
        drawMode === mode
          ? "bg-blue-600 text-white"
          : "bg-white hover:bg-gray-100"
      }`}
      title={title}
    >
      <Icon className="w-5 h-5" />
    </button>
  );

  /* --------------------------------------------------------------- */
  /*  JSX                                                             */
  /* --------------------------------------------------------------- */
  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <style>
        {`.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none;}`}
      </style>

      {/* ---------- Sidebar ---------- */}
      {filename && (
        <div
          className={`bg-white border-r border-slate-200 shadow-lg transition-[width] duration-300 ${
            sidebarOpen ? "w-72" : "w-12"
          } flex flex-col`}
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            {sidebarOpen && (
              <h2 className="font-semibold text-slate-800 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Pages ({pageOrder.length})
              </h2>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700"
            >
              {sidebarOpen ? <X className="w-4 h-4" /> : ">"}
            </button>
          </div>

          {sidebarOpen && (
            <>
              <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
                <p className="text-xs text-blue-700 font-medium flex items-center">
                  <GripVertical className="w-3 h-3 mr-1" />
                  Drag to reorder
                </p>
              </div>

              <div
                className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide"
                onDragOver={allowDrop}
              >
                {pageOrder.map((_, idx) => (
                  <div
                    key={idx}
                    draggable
                    onDragStart={(e) => startDrag(e, idx)}
                    onDragOver={allowDrop}
                    onDrop={(e) => dropPage(e, idx)}
                    onClick={() => setSelectedPage(idx)}
                    className={`cursor-pointer rounded-lg border-2 p-3 relative group transition-all ${
                      selectedPage === idx
                        ? "border-blue-500 bg-blue-50 shadow-lg"
                        : "border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="w-4 h-4 text-gray-400 mt-1 cursor-grab" />
                      <div className="flex-1">
                        <div className="aspect-[8.5/11] overflow-hidden rounded-lg bg-gray-50">
                          <img
                            src={pageThumbnails[pageOrder[idx]]}
                            alt={`Page ${idx + 1}`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <p className="text-center text-sm font-medium text-slate-700 mt-2">
                          Page {idx + 1}
                        </p>
                      </div>
                    </div>

                    {/* delete */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePage();
                      }}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    {/* up / down */}
                    <div className="absolute bottom-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveUp(idx);
                        }}
                        disabled={idx === 0}
                        className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 disabled:opacity-30"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveDown(idx);
                        }}
                        disabled={idx === pageOrder.length - 1}
                        className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 disabled:opacity-30"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ---------- Main area ---------- */}
      <div className="flex-1 flex flex-col">
        {/* Top toolbar – always visible */}
        <div className="bg-white border-b border-slate-200 shadow-sm">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-slate-800">PDF Editor</h1>
                {file && <p className="text-sm text-slate-500">{file.name}</p>}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {!filename ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload PDF</span>
                </button>
              ) : (
                <>
                  {/* DOWNLOAD – always visible */}
                  <button
                    onClick={() =>
                      window.open(
                        `http://localhost:5000/api/edit-pdf/download/${filename}`,
                        "_blank"
                      )
                    }
                    className="flex items-center space-x-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Second row – tools, zoom, page actions */}
          {filename && (
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center space-x-3 overflow-x-auto scrollbar-hide">
              {/* Tool palette */}
              <div className="flex items-center space-x-1 bg-white rounded-lg p-1 shadow-sm flex-shrink-0">
                {toolBtn("hand", Hand, "Pan")}
                {toolBtn("text", Type, "Add Text")}
                {toolBtn("pen", PenTool, "Pen")}
                {toolBtn("rect", Square, "Rectangle")}
                {toolBtn("line", Minus, "Line")}
                {toolBtn("eraser", Eraser, "Eraser")}
              </div>

              {/* Undo / Redo / Clear */}
              <div className="flex items-center space-x-1 flex-shrink-0">
                <button
                  onClick={undo}
                  disabled={historyIdx === 0}
                  className="p-2 rounded hover:bg-gray-100 disabled:opacity-40"
                  title="Undo"
                >
                  <Undo className="w-5 h-5" />
                </button>
                <button
                  onClick={redo}
                  disabled={historyIdx === history.length - 1}
                  className="p-2 rounded hover:bg-gray-100 disabled:opacity-40"
                  title="Redo"
                >
                  <Redo className="w-5 h-5" />
                </button>
                <button
                  onClick={clearPage}
                  className="p-2 rounded hover:bg-gray-100 text-red-600"
                  title="Clear page"
                >
                  <Trash className="w-5 h-5" />
                </button>
              </div>

              {/* Page actions */}
              <button
                onClick={handleRotatePage}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 flex-shrink-0"
              >
                <RotateCw className="w-4 h-4" />
                <span className="text-sm font-medium">Rotate</span>
              </button>
              <button
                onClick={handleDeletePage}
                disabled={loading || pageCount <= 1}
                className="flex items-center space-x-2 px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm font-medium">Delete Page</span>
              </button>

              {/* Navigation */}
              <div className="flex items-center space-x-2 bg-white border border-slate-300 rounded-lg p-2 shadow-sm flex-shrink-0">
                <button
                  onClick={() => setSelectedPage((p) => Math.max(0, p - 1))}
                  disabled={selectedPage === 0}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Previous
                </button>
                <input
                  type="number"
                  value={selectedPage + 1}
                  onChange={(e) => {
                    const v = parseInt(e.target.value) - 1;
                    if (v >= 0 && v < pageCount) setSelectedPage(v);
                  }}
                  className="w-16 text-center border border-slate-300 rounded-md px-2 py-1"
                  min="1"
                  max={pageCount}
                />
                <span className="text-sm font-medium text-slate-600">
                  of {pageCount}
                </span>
                <button
                  onClick={() =>
                    setSelectedPage((p) => Math.min(pageCount - 1, p + 1))
                  }
                  disabled={selectedPage === pageCount - 1}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>

              {/* ZOOM – always visible */}
              <div className="flex items-center space-x-2 flex-shrink-0 ml-auto">
                <button
                  onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
                  className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-slate-600 min-w-16 text-center bg-white px-3 py-2 border border-slate-300 rounded-lg">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={() => setScale((s) => Math.min(2.5, s + 0.2))}
                  className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Pen / Line */}
        {(drawMode === "pen" || drawMode === "line") && (
          <div className="flex mx-auto my-4 space-x-2 bg-gray-200 p-2 rounded-2xl">
            <input
              type="color"
              value={penColor}
              onChange={(e) => setPenColor(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer"
            />
            <input
              type="range"
              min="1"
              max="20"
              value={penWidth}
              onChange={(e) => setPenWidth(+e.target.value)}
              className="w-40"
            />
            <span className="text-sm w-8 text-center">{penWidth}</span>
          </div>
        )}

        {/* Rectangle */}
        {drawMode === "rect" && (
          <div className="flex mx-auto my-4 space-x-2 bg-gray-200 p-2 rounded-2xl">
            <span className="text-sm">Stroke</span>
            <input
              type="color"
              value={rectStroke}
              onChange={(e) => setRectStroke(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer"
            />
            <input
              type="range"
              min="0"
              max="10"
              value={rectStrokeWidth}
              onChange={(e) => setRectStrokeWidth(+e.target.value)}
              className="w-20"
            />
          </div>
        )}

        {/* Eraser */}
        {drawMode === "eraser" && (
          <div className="flex mx-auto my-4 space-x-2 bg-gray-200 p-2 rounded-2xl">
            <span className="text-sm">Size</span>
            <input
              type="range"
              min="5"
              max="50"
              value={eraserWidth}
              onChange={(e) => setEraserWidth(+e.target.value)}
              className="w-24"
            />
            <span className="text-sm">{eraserWidth}</span>
          </div>
        )}

        {/* Canvas */}
        <div className="flex-1 overflow-auto bg-slate-100 p-6 scrollbar-hide">
          {!filename ? (
            <div className="flex items-center justify-center h-full">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-2xl p-20 cursor-pointer hover:border-blue-500 hover:bg-blue-50/50"
              >
                <Upload className="w-20 h-20 text-slate-400 mx-auto mb-6" />
                <p className="text-2xl font-semibold text-slate-700 mb-2 text-center">
                  Upload PDF Document
                </p>
                <p className="text-slate-500 text-center">
                  Click here or drag and drop your PDF file
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center min-h-full">
              <div className="bg-white rounded-lg shadow-xl inline-block p-5 relative">
                {pdfUrl && pdfLoaded ? (
                  <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    className={`border border-slate-300 mt-5 ${
                      drawMode === "hand"
                        ? "cursor-grab active:cursor-grabbing"
                        : drawMode === "text"
                        ? "cursor-crosshair"
                        : "cursor-default"
                    }`}
                    style={{
                      display: "block",
                      maxWidth: "100%",
                      height: "auto",
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                )}
                {dragMessage && drawMode === "text" && (
                  <div className="absolute top-4 left-4 bg-blue-100 text-blue-800 p-3 rounded-lg shadow-md">
                    Drag on the PDF to create a text box
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Text-tool panel */}
        {textMode && filename && (
          <div className="bg-white border-t border-slate-200 p-4 shadow-lg">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-start space-x-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Text Content
                  </label>
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Enter text…"
                  />
                </div>
                <div className="w-32">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Size
                  </label>
                  <input
                    type="number"
                    value={textSize}
                    onChange={(e) => setTextSize(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    min="8"
                    max="72"
                  />
                </div>
                <div className="w-32">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Text Color
                  </label>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-full h-10 border border-slate-300 rounded-lg cursor-pointer"
                  />
                </div>
                <div className="flex items-end space-x-2">
                  <button
                    onClick={handleAddText}
                    disabled={!textInput || !currentTextBox}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save</span>
                  </button>
                  <button
                    onClick={() => {
                      setTextMode(false);
                      setTempTexts([]);
                      setCurrentTextBox(null);
                      setDragMessage(false);
                    }}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileUpload}
        className="hidden"
      />

      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 shadow-2xl">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
            <p className="text-slate-700 mt-4 font-medium">Processing…</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFEditor;
