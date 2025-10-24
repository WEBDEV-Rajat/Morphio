import React, { useState } from "react";
import { Download, File, GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import img1 from "../../assets/closed-folder.png";

const MergePdf = ({
  title = "Merge PDFs",
  uploadAccept = "application/pdf",
  apiEndpoint = "merge-pdf",
}) => {
  const [files, setFiles] = useState([]);
  const [mergedUrl, setMergedUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);

  const validateFile = (file) => {
    if (file.type !== "application/pdf") {
      setError(`"${file.name}" is not a valid PDF file`);
      return false;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError(`"${file.name}" exceeds 100MB limit`);
      return false;
    }
    return true;
  };

  const handleFileChange = (e) => {
    if (e.target.files?.length) {
      const newFiles = Array.from(e.target.files);
      const totalFiles = files.length + newFiles.length;

      if (totalFiles > 10) {
        setError("You can upload a maximum of 10 PDFs only!");
        return;
      }

      const validFiles = newFiles.filter(validateFile);
      if (validFiles.length > 0) {
        setFiles((prevFiles) => [...prevFiles, ...validFiles]);
        setMergedUrl(null);
        setError(null);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);

    if (e.dataTransfer.files?.length) {
      const newFiles = Array.from(e.dataTransfer.files);
      const totalFiles = files.length + newFiles.length;

      if (totalFiles > 10) {
        setError("You can upload a maximum of 10 PDFs only!");
        return;
      }

      const validFiles = newFiles.filter(validateFile);
      if (validFiles.length > 0) {
        setFiles((prevFiles) => [...prevFiles, ...validFiles]);
        setMergedUrl(null);
        setError(null);
      }
    }
  };

  const handleConvert = async () => {
    if (files.length < 2) {
      setError("Please upload at least 2 PDFs");
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    setLoading(true);
    setProgress(0);
    setError(null);

    try {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded * 100) / e.total));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const blob = xhr.response;
          const url = window.URL.createObjectURL(
            new Blob([blob], { type: "application/pdf" })
          );
          setMergedUrl(url);
          setProgress(100);
          setLoading(false);
        } else {
          throw new Error(`Server responded with status ${xhr.status}`);
        }
      };

      xhr.onerror = () => {
        console.error("Merge Error: Network error");
        setError("Merging failed. Check console and ensure backend is running.");
        setLoading(false);
      };

      xhr.open("POST", `http://localhost:5000/api/${apiEndpoint}`);
      xhr.responseType = "blob";
      xhr.send(formData);
    } catch (err) {
      console.error("Merge error:", err.message);
      setError(`Merging failed: ${err.message}. Check console for details.`);
      setLoading(false);
    }
  };

  const handleRemoveFile = (indexToRemove) => {
    setFiles((prevFiles) =>
      prevFiles.filter((_, index) => index !== indexToRemove)
    );
    setMergedUrl(null);
    setError(null);
  };

  const moveFile = (fromIndex, toIndex) => {
    const newFiles = [...files];
    const [movedFile] = newFiles.splice(fromIndex, 1);
    newFiles.splice(toIndex, 0, movedFile);
    setFiles(newFiles);
    setMergedUrl(null);
  };

  const moveUp = (index) => {
    if (index > 0) {
      moveFile(index, index - 1);
    }
  };

  const moveDown = (index) => {
    if (index < files.length - 1) {
      moveFile(index, index + 1);
    }
  };

  const handleFileDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleFileDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    moveFile(draggedIndex, index);
    setDraggedIndex(index);
  };

  const handleFileDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleDownload = () => {
    if (mergedUrl) {
      const link = document.createElement('a');
      link.href = mergedUrl;
      link.download = 'merged.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold text-gray-900 mb-2 drop-shadow-sm">
          {title}
        </h1>
        <p className="text-gray-600">Upload multiple PDFs and merge them into one</p>
      </div>

      {error && (
        <div className="w-full max-w-2xl mb-4 p-4 bg-red-50 border border-red-300 rounded-xl text-red-700 text-center">
          {error}
        </div>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`w-full max-w-2xl h-56 flex flex-col items-center justify-center border-3 border-dashed rounded-2xl cursor-pointer transition-all duration-300 shadow-lg
          ${dragActive ? "border-indigo-600 bg-indigo-50 scale-105" : "border-gray-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/30"}`}
      >
        <input
          type="file"
          accept={uploadAccept}
          multiple
          onChange={handleFileChange}
          className="hidden"
          id="fileInput"
        />
        <label htmlFor="fileInput" className="cursor-pointer text-center px-6 py-4 w-full h-full flex flex-col items-center justify-center">
          <div className="text-6xl mb-4">
            <img src={img1} alt="" className="w-20 h-20"/>
          </div>
          <p className="text-lg font-semibold text-gray-700 mb-2">
            {files.length > 0 ? `${files.length} file(s) selected` : "Drag & Drop PDFs here"}
          </p>
          <p className="text-sm text-gray-500">or click to browse (max 10 files)</p>
        </label>
      </div>

      {files.length > 0 && (
        <div className="w-full max-w-2xl mt-6 space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-700">Selected Files:</h3>
            <p className="text-sm text-indigo-600 font-medium">Drag to reorder</p>
          </div>
          {files.map((file, idx) => (
            <div
              key={idx}
              draggable
              onDragStart={(e) => handleFileDragStart(e, idx)}
              onDragOver={(e) => handleFileDragOver(e, idx)}
              onDragEnd={handleFileDragEnd}
              className={`flex items-center justify-between bg-white p-4 rounded-xl shadow-md border-2 hover:shadow-lg transition-all cursor-move
                ${draggedIndex === idx ? 'border-indigo-500 opacity-50' : 'border-gray-200'}`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <GripVertical className="w-5 h-5 text-gray-400 flex-shrink-0 cursor-grab active:cursor-grabbing" />
                <File className="w-6 h-6 text-blue-500 flex-shrink-0"/>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm text-gray-700 truncate">{file.name}</span>
                  <span className="text-xs text-gray-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
                <span className="text-xs text-gray-400 font-semibold bg-gray-100 px-2 py-1 rounded flex-shrink-0">#{idx + 1}</span>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move up"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => moveDown(idx)}
                  disabled={idx === files.length - 1}
                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move down"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleRemoveFile(idx)}
                  className="px-3 py-1 text-red-600 hover:text-white hover:bg-red-600 rounded-lg transition-all text-sm font-medium border border-red-300"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleConvert}
        className="mt-8 px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-lg font-semibold rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:hover:scale-100"
        disabled={loading || files.length < 2}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Merging...
          </span>
        ) : (
          "Merge PDFs"
        )}
      </button>

      {loading && (
        <div className="w-full max-w-2xl mt-6">
          <div className="bg-gray-200 rounded-full h-8 overflow-hidden shadow-inner">
            <div
              className="h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold transition-all duration-300"
              style={{ width: `${progress}%` }}
            >
              {progress}%
            </div>
          </div>
        </div>
      )}

      {mergedUrl && (
        <div className="mt-12 w-full max-w-4xl">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-green-700 mb-2">Merge Successful!</h2>
            <p className="text-gray-600">Your merged PDF is ready to download</p>
          </div>

          <div className="flex flex-col bg-white rounded-2xl shadow-xl p-4 hover:shadow-2xl transition-all">
            <div className="w-full h-96 border-2 border-gray-300 rounded-xl shadow-lg bg-gray-50 overflow-hidden relative">
              <object
                data={mergedUrl}
                type="application/pdf"
                className="w-full h-full"
              >
                <embed
                  src={mergedUrl}
                  type="application/pdf"
                  className="w-full h-full"
                />
                <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
                  <svg className="w-24 h-24 text-indigo-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-800 font-semibold mb-2 text-center">PDF Preview Unavailable</p>
                  <p className="text-gray-600 text-sm mb-4 text-center">Your browser doesn&apos;t support inline PDF viewing</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => window.open(mergedUrl, '_blank')}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md"
                    >
                      Open in New Tab
                    </button>
                    <button
                      onClick={handleDownload}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-md"
                    >
                      Download PDF
                    </button>
                  </div>
                </div>
              </object>
              <div className="absolute top-2 right-2 bg-indigo-600 text-white px-3 py-1 rounded-lg shadow text-xs font-semibold pointer-events-none">
                PDF Preview
              </div>
              <div className="absolute bottom-2 right-2 flex gap-2">
                <button
                  onClick={() => window.open(mergedUrl, '_blank')}
                  className="bg-white/90 backdrop-blur-sm text-indigo-600 px-3 py-1 rounded-lg shadow text-xs font-semibold hover:bg-white transition-all"
                  title="Open in new tab"
                >
                  Open
                </button>
              </div>
            </div>

            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600 mb-3">
                merged.pdf
              </p>
              <button
                onClick={handleDownload}
                className="inline-block px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all text-sm font-semibold cursor-pointer"
              >
                <span className="flex gap-2 font-bold items-center justify-center">
                  <Download className="w-4 h-4"/> Download Merged PDF
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MergePdf;