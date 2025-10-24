import React, { useState, useRef, useEffect } from "react";
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
} from "lucide-react";

const PDFEditor = () => {
  const [file, setFile] = useState(null);
  const [filename, setFilename] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pageCount, setPageCount] = useState(0);
  const [selectedPage, setSelectedPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [textMode, setTextMode] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [textPosition, setTextPosition] = useState(null);
  const [textSize, setTextSize] = useState(14);
  const [textColor, setTextColor] = useState("#000000");
  const [boxColor, setBoxColor] = useState("#000000");
  const [tempTexts, setTempTexts] = useState([]);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [scale, setScale] = useState(1.2);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageThumbnails, setPageThumbnails] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [currentTextBox, setCurrentTextBox] = useState(null);
  const [editingTextId, setEditingTextId] = useState(null);
  const [dragMessage, setDragMessage] = useState(false);
  const [pageOrder, setPageOrder] = useState([]);
  const [draggedPageIndex, setDraggedPageIndex] = useState(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const sidebarRef = useRef(null);
  const scrollAnimationRef = useRef(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.async = true;
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        setPdfLoaded(true);
      }
    };
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  useEffect(() => {
    if (pdfUrl && pdfLoaded && window.pdfjsLib) {
      loadPDF();
    }
  }, [pdfUrl, pdfLoaded]);

  useEffect(() => {
    if (pdfDoc) {
      renderPDF();
      setPageOrder([...Array(pdfDoc.numPages).keys()]);
    }
  }, [pdfDoc, selectedPage, scale, tempTexts]);

  const loadPDF = async () => {
    try {
      const loadingTask = window.pdfjsLib.getDocument(pdfUrl);
      const pdf = await loadingTask.promise;
      setPdfDoc(pdf);
      setPageCount(pdf.numPages);
      generateThumbnails(pdf);
    } catch (error) {
      console.error("Error loading PDF:", error);
    }
  };

  const generateThumbnails = async (pdf) => {
    const thumbnails = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 0.2 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      thumbnails.push(canvas.toDataURL());
    }
    setPageThumbnails(thumbnails);
  };

  const renderPDF = async () => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      const page = await pdfDoc.getPage(pageOrder[selectedPage] + 1);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      context.save();
      tempTexts.forEach((text) => {
        if (text.pageIndex === selectedPage) {
          context.fillStyle = text.boxColor;
          context.fillRect(
            text.x,
            text.y - text.size * scale,
            text.width,
            text.height
          );
          context.fillStyle = text.color;
          context.font = `${text.size * scale}px Arial`;
          context.fillText(text.text, text.x + 5, text.y - 5);

          if (editingTextId === text.id) {
            context.strokeStyle = "#3B82F6";
            context.lineWidth = 2;
            context.strokeRect(
              text.x,
              text.y - text.size * scale,
              text.width,
              text.height
            );
          }
        }
      });

      if (isDragging && dragStart && textPosition) {
        context.fillStyle = "rgba(59, 130, 246, 0.3)";
        context.fillRect(
          Math.min(dragStart.x, textPosition.x),
          Math.min(dragStart.y, textPosition.y),
          Math.abs(textPosition.x - dragStart.x),
          Math.abs(textPosition.y - dragStart.y)
        );
      }

      context.restore();
    } catch (error) {
      console.error("Error rendering PDF:", error);
    }
  };

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (selectedFile.type !== "application/pdf") {
      alert("Please select a PDF file");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("file", selectedFile, selectedFile.name);

    try {
      const response = await fetch(
        "http://localhost:5000/api/edit-pdf/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();
      if (response.ok) {
        setFile(selectedFile);
        setFilename(data.filename);
        setPageCount(data.pageCount);
        setSelectedPage(0);
      } else {
        alert("Error uploading file: " + data.error);
      }
    } catch (error) {
      alert("Error uploading file: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePage = async () => {
    if (!filename || pageCount <= 1) {
      alert("Cannot delete the last page");
      return;
    }

    if (!confirm("Are you sure you want to delete this page?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        "http://localhost:5000/api/edit-pdf/delete-page",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename, pageIndex: pageOrder[selectedPage] }),
        }
      );

      const data = await response.json();
      if (response.ok) {
        const fileResponse = await fetch(
          `http://localhost:5000/uploads/${filename}`
        );
        const blob = await fileResponse.blob();
        const newFile = new File([blob], filename, { type: "application/pdf" });

        setFile(newFile);
        setPageCount(data.pageCount);
        setPageOrder((prev) =>
          prev.filter((_, i) => i !== selectedPage)
        );
        if (selectedPage >= data.pageCount) {
          setSelectedPage(data.pageCount - 1);
        }
        const url = URL.createObjectURL(newFile);
        setPdfUrl(url);
      }
    } catch (error) {
      alert("Error deleting page: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePageFromSidebar = async (index) => {
    if (!filename || pageCount <= 1) {
      alert("Cannot delete the last page");
      return;
    }

    if (!confirm("Are you sure you want to delete this page?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        "http://localhost:5000/api/edit-pdf/delete-page",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename, pageIndex: pageOrder[index] }),
        }
      );

      const data = await response.json();
      if (response.ok) {
        const fileResponse = await fetch(
          `http://localhost:5000/uploads/${filename}`
        );
        const blob = await fileResponse.blob();
        const newFile = new File([blob], filename, { type: "application/pdf" });

        setFile(newFile);
        setPageCount(data.pageCount);
        setPageOrder((prev) => prev.filter((_, i) => i !== index));
        if (selectedPage >= data.pageCount) {
          setSelectedPage(data.pageCount - 1);
        } else if (selectedPage > index) {
          setSelectedPage((prev) => prev - 1);
        }
        const url = URL.createObjectURL(newFile);
        setPdfUrl(url);
      }
    } catch (error) {
      alert("Error deleting page: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRotatePage = async () => {
    if (!filename) return;

    setLoading(true);
    try {
      const response = await fetch(
        "http://localhost:5000/api/edit-pdf/rotate-page",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename,
            pageIndex: pageOrder[selectedPage],
            degrees: 90,
          }),
        }
      );

      if (response.ok) {
        const fileResponse = await fetch(
          `http://localhost:5000/uploads/${filename}`
        );
        const blob = await fileResponse.blob();
        const newFile = new File([blob], filename, { type: "application/pdf" });
        setFile(newFile);
        const url = URL.createObjectURL(newFile);
        setPdfUrl(url);
      }
    } catch (error) {
      alert("Error rotating page: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddText = async () => {
    if (!filename || !currentTextBox || !textInput) {
      alert("Please create a text box and enter text");
      return;
    }

    setLoading(true);
    try {
      const canvas = canvasRef.current;
      const pdfY = canvas.height - currentTextBox.y;

      const r = parseInt(textColor.slice(1, 3), 16) / 255;
      const g = parseInt(textColor.slice(3, 5), 16) / 255;
      const b = parseInt(textColor.slice(5, 7), 16) / 255;
      const br = parseInt(boxColor.slice(1, 3), 16) / 255;
      const bg = parseInt(boxColor.slice(3, 5), 16) / 255;
      const bb = parseInt(boxColor.slice(5, 7), 16) / 255;

      const response = await fetch(
        "http://localhost:5000/api/edit-pdf/add-text",
        {
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
            boxColor: { r: br, g: bg, b: bb },
            width: currentTextBox.width / scale,
            height: currentTextBox.height / scale,
          }),
        }
      );

      if (response.ok) {
        const fileResponse = await fetch(
          `http://localhost:5000/uploads/${filename}`
        );
        const blob = await fileResponse.blob();
        const newFile = new File([blob], filename, { type: "application/pdf" });
        setFile(newFile);
        const url = URL.createObjectURL(newFile);
        setPdfUrl(url);

        setTempTexts([]);
        setTextInput("");
        setCurrentTextBox(null);
        setTextMode(false);
      }
    } catch (error) {
      alert("Error adding text: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePageDragStart = (e, index) => {
    setDraggedPageIndex(index);
    e.dataTransfer.setData("text/plain", index);
  };

  const handlePageDragOver = (e, index) => {
    e.preventDefault();
    if (draggedPageIndex !== index) {
      const newPageOrder = [...pageOrder];
      const [draggedPage] = newPageOrder.splice(draggedPageIndex, 1);
      newPageOrder.splice(index, 0, draggedPage);
      setPageOrder(newPageOrder);
      setDraggedPageIndex(index);
    }

    // Auto-scroll logic
    if (sidebarRef.current) {
      const sidebar = sidebarRef.current;
      const rect = sidebar.getBoundingClientRect();
      const scrollThreshold = 30; // Pixels from edge to start scrolling
      const scrollSpeed = 15; // Pixels per frame
      const mouseY = e.clientY;

      // Debugging logs (remove in production)
      console.log(`Mouse Y: ${mouseY}, Sidebar Top: ${rect.top}, Bottom: ${rect.bottom}, ScrollTop: ${sidebar.scrollTop}`);

      const scrollUp = mouseY < rect.top + scrollThreshold;
      const scrollDown = mouseY > rect.bottom - scrollThreshold;

      if ((scrollUp || scrollDown) && !scrollAnimationRef.current) {
        const scroll = () => {
          if (!sidebarRef.current) {
            scrollAnimationRef.current = null;
            return;
          }
          if (scrollUp && sidebar.scrollTop > 0) {
            sidebar.scrollTop -= scrollSpeed;
            console.log("Scrolling up", sidebar.scrollTop);
          } else if (scrollDown && sidebar.scrollTop < sidebar.scrollHeight - sidebar.clientHeight) {
            sidebar.scrollTop += scrollSpeed;
            console.log("Scrolling down", sidebar.scrollTop);
          }
          scrollAnimationRef.current = requestAnimationFrame(scroll);
        };

        scrollAnimationRef.current = requestAnimationFrame(scroll);
      }
    }
  };

  const handlePageDragEnter = (e) => {
    e.preventDefault();
  };

  const handlePageDragLeave = () => {
    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current);
      scrollAnimationRef.current = null;
      console.log("Drag left sidebar, stopped scrolling");
    }
  };

  const handlePageDragEnd = async () => {
    setDraggedPageIndex(null);
    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current);
      scrollAnimationRef.current = null;
      console.log("Drag ended, stopped scrolling");
    }
    if (!filename) return;

    setLoading(true);
    try {
      const response = await fetch(
        "http://localhost:5000/api/edit-pdf/reorder-pages",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename, pageOrder }),
        }
      );

      if (response.ok) {
        const fileResponse = await fetch(
          `http://localhost:5000/uploads/${filename}`
        );
        const blob = await fileResponse.blob();
        const newFile = new File([blob], filename, { type: "application/pdf" });
        setFile(newFile);
        const url = URL.createObjectURL(newFile);
        setPdfUrl(url);
      }
    } catch (error) {
      alert("Error reordering pages: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const movePageUp = async (index) => {
    if (index === 0) return;
    const newPageOrder = [...pageOrder];
    [newPageOrder[index - 1], newPageOrder[index]] = [
      newPageOrder[index],
      newPageOrder[index - 1],
    ];
    setPageOrder(newPageOrder);
    if (selectedPage === index) {
      setSelectedPage(index - 1);
    } else if (selectedPage === index - 1) {
      setSelectedPage(index);
    }

    setLoading(true);
    try {
      const response = await fetch(
        "http://localhost:5000/api/edit-pdf/reorder-pages",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename, pageOrder: newPageOrder }),
        }
      );

      if (response.ok) {
        const fileResponse = await fetch(
          `http://localhost:5000/uploads/${filename}`
        );
        const blob = await fileResponse.blob();
        const newFile = new File([blob], filename, { type: "application/pdf" });
        setFile(newFile);
        const url = URL.createObjectURL(newFile);
        setPdfUrl(url);
      }
    } catch (error) {
      alert("Error reordering pages: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const movePageDown = async (index) => {
    if (index === pageOrder.length - 1) return;
    const newPageOrder = [...pageOrder];
    [newPageOrder[index], newPageOrder[index + 1]] = [
      newPageOrder[index + 1],
      newPageOrder[index],
    ];
    setPageOrder(newPageOrder);
    if (selectedPage === index) {
      setSelectedPage(index + 1);
    } else if (selectedPage === index + 1) {
      setSelectedPage(index);
    }

    setLoading(true);
    try {
      const response = await fetch(
        "http://localhost:5000/api/edit-pdf/reorder-pages",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename, pageOrder: newPageOrder }),
        }
      );

      if (response.ok) {
        const fileResponse = await fetch(
          `http://localhost:5000/uploads/${filename}`
        );
        const blob = await fileResponse.blob();
        const newFile = new File([blob], filename, { type: "application/pdf" });
        setFile(newFile);
        const url = URL.createObjectURL(newFile);
        setPdfUrl(url);
      }
    } catch (error) {
      alert("Error reordering pages: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCanvasMouseDown = (e) => {
    if (!textMode || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setDragStart({ x, y });
    setIsDragging(true);
    setDragMessage(false);
  };

  const handleCanvasMouseMove = (e) => {
    if (!isDragging || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setTextPosition({ x, y });
  };

  const handleCanvasMouseUp = () => {
    if (!isDragging || !dragStart || !textPosition) return;

    const width = Math.abs(textPosition.x - dragStart.x);
    const height = Math.abs(textPosition.y - dragStart.y);
    const x = Math.min(dragStart.x, textPosition.x);
    const y = Math.min(dragStart.y, textPosition.y);

    const id = Date.now().toString();
    setTempTexts([
      ...tempTexts,
      {
        id,
        text: textInput || "Text",
        x,
        y,
        width,
        height,
        size: textSize,
        color: textColor,
        boxColor: boxColor,
        pageIndex: selectedPage,
      },
    ]);

    setCurrentTextBox({ x, y, width, height });
    setIsDragging(false);
    setDragStart(null);
    setTextPosition(null);
  };

  const handleTextBoxClick = (text) => {
    setEditingTextId(text.id);
    setTextInput(text.text);
    setTextSize(text.size);
    setTextColor(text.color);
    setBoxColor(text.boxColor);
    setCurrentTextBox({
      x: text.x,
      y: text.y,
      width: text.width,
      height: text.height,
    });
  };

  const handleDownload = () => {
    if (!filename) return;
    window.open(
      `http://localhost:5000/api/edit-pdf/download/${filename}`,
      "_blank"
    );
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <style>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
            .scrollbar-hide {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>

      {filename && (
        <div
          className={`bg-white border-r border-slate-200 shadow-lg transition-all duration-300 ${
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
              className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
              title={sidebarOpen ? "Collapse" : "Expand"}
            >
              {sidebarOpen ? <X className="w-4 h-4" /> : ">"}
            </button>
          </div>
          {sidebarOpen && (
            <>
              <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
                <p className="text-xs text-blue-700 font-medium flex items-center">
                  <GripVertical className="w-3 h-3 mr-1" />
                  Drag to reorder pages
                </p>
              </div>
              <div
                ref={sidebarRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide"
                onDragEnter={handlePageDragEnter}
                onDragLeave={handlePageDragLeave}
              >
                {pageOrder.map((pageNum, index) => (
                  <div
                    key={`${pageNum}-${index}`}
                    draggable
                    onDragStart={(e) => handlePageDragStart(e, index)}
                    onDragOver={(e) => handlePageDragOver(e, index)}
                    onDragEnd={handlePageDragEnd}
                    onClick={() => setSelectedPage(index)}
                    className={`cursor-pointer rounded-lg border-2 transition-all p-3 relative group ${
                      selectedPage === index
                        ? "border-blue-500 bg-blue-50 shadow-lg"
                        : "border-slate-200 hover:border-blue-300"
                    } ${draggedPageIndex === index ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1 cursor-grab active:cursor-grabbing" />
                      <div className="flex-1">
                        <img
                          src={pageThumbnails[pageNum]}
                          alt={`Page ${index + 1}`}
                          className="w-full rounded-lg"
                        />
                        <p className="text-center text-sm font-medium text-slate-700 mt-2">
                          Page {index + 1}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePageFromSidebar(index);
                      }}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"
                      title="Delete page"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          movePageUp(index);
                        }}
                        disabled={index === 0}
                        className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed shadow-md"
                        title="Move up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          movePageDown(index);
                        }}
                        disabled={index === pageOrder.length - 1}
                        className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed shadow-md"
                        title="Move down"
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

      <div className="flex-1 flex flex-col">
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
                  className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload PDF</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setFile(null);
                      setFilename("");
                      setPdfUrl(null);
                      setPdfDoc(null);
                      setPageThumbnails([]);
                      setPageOrder([]);
                    }}
                    className="flex items-center space-x-2 px-4 py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center space-x-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {filename && (
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center space-x-3">
              <button
                onClick={handleRotatePage}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                <RotateCw className="w-4 h-4" />
                <span className="text-sm font-medium">Rotate</span>
              </button>
              <button
                onClick={() => {
                  setTextMode(!textMode);
                  setTextPosition(null);
                  setTempTexts([]);
                  setDragMessage(true);
                }}
                className={`flex items-center space-x-2 px-4 py-2 border rounded-lg transition-colors ${
                  textMode
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white border-slate-300 hover:bg-slate-100"
                }`}
              >
                <Type className="w-4 h-4" />
                <span className="text-sm font-medium">Add Text</span>
              </button>
              <button
                onClick={handleDeletePage}
                disabled={loading || pageCount <= 1}
                className="flex items-center space-x-2 px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm font-medium">Delete Page</span>
              </button>
              <div className="flex-1" />
              <div className="flex items-center space-x-3 bg-white border border-slate-300 rounded-lg p-2 shadow-sm">
                <button
                  onClick={() => setSelectedPage((p) => Math.max(0, p - 1))}
                  disabled={selectedPage === 0}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  ◄
                </button>
                <input
                  type="number"
                  value={selectedPage + 1}
                  onChange={(e) => {
                    const page = parseInt(e.target.value) - 1;
                    if (page >= 0 && page < pageCount) {
                      setSelectedPage(page);
                    }
                  }}
                  className="w-16 text-center border border-slate-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500"
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
                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  ►
                </button>
              </div>
              <button
                onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
                className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-slate-600 min-w-20 text-center bg-white px-3 py-2 border border-slate-300 rounded-lg">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setScale((s) => Math.min(2.5, s + 0.2))}
                className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto bg-slate-100 p-6 scrollbar-hide">
          {!filename ? (
            <div className="flex items-center justify-center h-full">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-2xl p-20 cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all"
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
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onClick={(e) => {
                      if (!textMode) {
                        tempTexts.forEach((text) => {
                          if (
                            text.pageIndex === selectedPage &&
                            e.clientX -
                              canvasRef.current.getBoundingClientRect().left >=
                              text.x &&
                            e.clientX -
                              canvasRef.current.getBoundingClientRect().left <=
                              text.x + text.width &&
                            e.clientY -
                              canvasRef.current.getBoundingClientRect().top >=
                              text.y - text.size * scale &&
                            e.clientY -
                              canvasRef.current.getBoundingClientRect().top <=
                              text.y - text.size * scale + text.height
                          ) {
                            handleTextBoxClick(text);
                          }
                        });
                      }
                    }}
                    className={`border border-slate-300 ${
                      textMode ? "cursor-crosshair" : "cursor-default"
                    }`}
                    style={{
                      display: "block",
                      maxWidth: "100%",
                      height: "auto",
                    }}
                  />
                ) : (
                  <div
                    className="flex items-center justify-center"
                    style={{ width: "800px", height: "600px" }}
                  >
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                )}
                {dragMessage && textMode && (
                  <div className="absolute top-4 left-4 bg-blue-100 text-blue-800 p-3 rounded-lg shadow-md">
                    📍 Drag on the PDF to create a text box
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

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
                    onChange={(e) => {
                      setTextInput(e.target.value);
                      if (editingTextId) {
                        setTempTexts(
                          tempTexts.map((text) =>
                            text.id === editingTextId
                              ? { ...text, text: e.target.value }
                              : text
                          )
                        );
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="2"
                    placeholder="Enter text to add..."
                  />
                </div>
                <div className="w-32">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Text Size
                  </label>
                  <input
                    type="number"
                    value={textSize}
                    onChange={(e) => {
                      setTextSize(parseInt(e.target.value));
                      if (editingTextId) {
                        setTempTexts(
                          tempTexts.map((text) =>
                            text.id === editingTextId
                              ? { ...text, size: parseInt(e.target.value) }
                              : text
                          )
                        );
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                    onChange={(e) => {
                      setTextColor(e.target.value);
                      if (editingTextId) {
                        setTempTexts(
                          tempTexts.map((text) =>
                            text.id === editingTextId
                              ? { ...text, color: e.target.value }
                              : text
                          )
                        );
                      }
                    }}
                    className="w-full h-10 border border-slate-300 rounded-lg cursor-pointer"
                  />
                </div>
                <div className="w-32">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Box Color
                  </label>
                  <input
                    type="color"
                    value={boxColor}
                    onChange={(e) => {
                      setBoxColor(e.target.value);
                      if (editingTextId) {
                        setTempTexts(
                          tempTexts.map((text) =>
                            text.id === editingTextId
                              ? { ...text, boxColor: e.target.value }
                              : text
                          )
                        );
                      }
                    }}
                    className="w-full h-10 border border-slate-300 rounded-lg cursor-pointer"
                  />
                </div>
                <div className="flex items-end space-x-2">
                  <button
                    onClick={handleAddText}
                    disabled={!textInput || !currentTextBox}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save</span>
                  </button>
                  <button
                    onClick={() => {
                      setTextMode(false);
                      setTextInput("");
                      setTextPosition(null);
                      setTempTexts([]);
                      setCurrentTextBox(null);
                      setEditingTextId(null);
                      setDragMessage(false);
                    }}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              {currentTextBox && (
                <div className="mt-4 flex space-x-4">
                  <div className="w-32">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Box Width
                    </label>
                    <input
                      type="number"
                      value={currentTextBox.width}
                      onChange={(e) => {
                        const width = parseInt(e.target.value);
                        setCurrentTextBox({ ...currentTextBox, width });
                        if (editingTextId) {
                          setTempTexts(
                            tempTexts.map((text) =>
                              text.id === editingTextId
                                ? { ...text, width }
                                : text
                            )
                          );
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="50"
                    />
                  </div>
                  <div className="w-32">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Box Height
                    </label>
                    <input
                      type="number"
                      value={currentTextBox.height}
                      onChange={(e) => {
                        const height = parseInt(e.target.value);
                        setCurrentTextBox({ ...currentTextBox, height });
                        if (editingTextId) {
                          setTempTexts(
                            tempTexts.map((text) =>
                              text.id === editingTextId
                                ? { ...text, height }
                                : text
                            )
                          );
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="20"
                    />
                  </div>
                </div>
              )}
              {dragMessage && !currentTextBox && (
                <p className="text-sm text-blue-600 mt-2">
                  📍 Drag on the PDF to create a text box
                </p>
              )}
              {currentTextBox && (
                <p className="text-sm text-green-600 mt-2">
                  ✓ Text box created - Enter text and adjust settings
                </p>
              )}
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
            <p className="text-slate-700 mt-4 font-medium">Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFEditor;