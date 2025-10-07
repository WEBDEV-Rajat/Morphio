//preview not working for pdf
//image conversion working 

import React, { useState } from "react";

const FileConverter = ({ 
  title, 
  uploadAccept, 
  apiEndpoint, 
  outputType,
  responseType = "json"
}) => {
  const [files, setFiles] = useState([]);
  const [convertedFiles, setConvertedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (selectedFiles) => {
    const newFiles = [...files, ...Array.from(selectedFiles)];
    setFiles(newFiles);
    setConvertedFiles([]);
    setProgress(0);
  };

  const handleFileChange = (e) => {
    if (e.target.files?.length) handleFileSelect(e.target.files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.length) handleFileSelect(e.dataTransfer.files);
  };

  const handleConvert = async () => {
    if (!files.length) return alert("Please upload files first");

    setLoading(true);
    setProgress(0);
    setConvertedFiles([]);

    const formData = new FormData();
    
    // For single file APIs (like jpg-to-png), use "file" field
    if (files.length === 1 && responseType === "blob") {
      formData.append("file", files[0]);
    } else {
      // For multi-file APIs, use "files" field
      files.forEach((file) => formData.append("files", file));
    }

    try {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded * 100) / e.total));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          if (responseType === "blob") {
            // Handle blob response (images)
            const blob = xhr.response;
            const url = URL.createObjectURL(blob);
            const fileName = files[0].name.replace(/\.[^/.]+$/, "") + getOutputExtension(outputType);
            
            setConvertedFiles([{
              name: fileName,
              url: url,
              outputType,
              isBlob: true
            }]);
          } else {
            // Handle JSON response (PDFs with URLs)
            const response = JSON.parse(xhr.responseText);
            console.log("API Response:", response);

            const converted = response.map((fileObj) => {
              const fullUrl = `http://localhost:5000${fileObj.url}`;
              console.log("File:", fileObj.name, "URL:", fullUrl);
              
              return {
                name: fileObj.name,
                url: fullUrl,
                outputType,
                isBlob: false
              };
            });

            setConvertedFiles(converted);
          }
          
          setLoading(false);
          setProgress(100);
        } else {
          throw new Error(`Server responded with status ${xhr.status}`);
        }
      };

      xhr.onerror = () => {
        console.error("Conversion Error: Network error");
        alert("Conversion failed. Check console and ensure backend is running.");
        setLoading(false);
      };

      xhr.open("POST", `http://localhost:5000/api/convert/${apiEndpoint}`);
      
      if (responseType === "blob") {
        xhr.responseType = "blob";
      }
      
      xhr.send(formData);
    } catch (err) {
      console.error("Conversion Error:", err.message);
      alert("Conversion failed. Check console for details and ensure backend is running.");
      setLoading(false);
    }
  };

  const getOutputExtension = (type) => {
    const extensions = {
      pdf: ".pdf",
      png: ".png",
      jpg: ".jpg",
      jpeg: ".jpeg",
      image: ".png"
    };
    return extensions[type] || ".file";
  };

  const getPreviewComponent = (file, idx) => {
    const { outputType, url, name } = file;
    
    if (outputType === "pdf") {
      return (
        <div className="w-full h-96 border-2 border-gray-300 rounded-xl shadow-lg bg-gray-50 overflow-hidden relative">
          <iframe
            src={`${url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
            className="w-full h-full border-0"
            title={`PDF Preview ${idx}`}
            style={{ minHeight: '384px' }}
            onLoad={() => console.log(`PDF loaded: ${name}`)}
          />
          <div className="absolute top-2 right-2 bg-indigo-600 text-white px-3 py-1 rounded-lg shadow text-xs font-semibold pointer-events-none">
            PDF Preview
          </div>
        </div>
      );
    } else if (outputType === "png" || outputType === "jpg" || outputType === "jpeg" || outputType === "image") {
      return (
        <img
          src={url}
          alt="Preview"
          className="w-full h-96 border-2 border-gray-300 rounded-xl shadow-lg bg-white object-contain"
          onError={(e) => console.error("Image load error:", e)}
        />
      );
    } else {
      return (
        <div className="w-full h-96 flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-lg border-2 border-gray-300">
          <div className="text-center">
            <div className="text-6xl mb-4">📄</div>
            <p className="text-gray-600">Preview not available for {outputType}</p>
          </div>
        </div>
      );
    }
  };

  const handleDownload = async (file) => {
    try {
      if (file.isBlob) {
        // Direct blob download
        const link = document.createElement('a');
        link.href = file.url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Fetch and download for URL-based files
        const response = await fetch(file.url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }
    } catch (error) {
      console.error("Download error:", error);
      window.open(file.url, '_blank');
    }
  };

  const getGridColumns = (count) => {
    if (count <= 1) return "grid-cols-1";
    if (count <= 4) return "grid-cols-2";
    return "grid-cols-3";
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold text-gray-900 mb-2 drop-shadow-sm">
          {title}
        </h1>
        <p className="text-gray-600">Upload your files and convert them instantly</p>
      </div>

      {/* Drag & Drop */}
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
          onChange={handleFileChange}
          className="hidden"
          id="fileInput"
          multiple={responseType !== "blob"}
        />
        <label htmlFor="fileInput" className="cursor-pointer text-center px-6 py-4 w-full h-full flex flex-col items-center justify-center">
          <div className="text-6xl mb-4">
            {dragActive ? "📂" : "📁"}
          </div>
          <p className="text-lg font-semibold text-gray-700 mb-2">
            {files.length ? `${files.length} file(s) selected` : "Drag & Drop files here"}
          </p>
          <p className="text-sm text-gray-500">or click to browse</p>
        </label>
      </div>

      {/* Selected Files */}
      {files.length > 0 && (
        <div className="w-full max-w-2xl mt-6 space-y-2">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Selected Files:</h3>
          {files.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between bg-white p-4 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-2xl">📄</span>
                <span className="text-sm text-gray-700 truncate">{file.name}</span>
                <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(2)} KB)</span>
              </div>
              <button
                onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                className="ml-4 px-3 py-1 text-red-600 hover:text-white hover:bg-red-600 rounded-lg transition-all text-sm font-medium border border-red-300"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Convert Button */}
      <button
        onClick={handleConvert}
        className="mt-8 px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-lg font-semibold rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:hover:scale-100"
        disabled={loading || !files.length}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Converting...
          </span>
        ) : (
          "🚀 Convert Files"
        )}
      </button>

      {/* Progress Bar */}
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

      {/* Preview & Download */}
      {convertedFiles.length > 0 && (
        <div className="mt-12 w-full max-w-6xl">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-green-700 mb-2">✅ Conversion Successful!</h2>
            <p className="text-gray-600">Your files are ready to download</p>
          </div>

          <div className={`grid ${getGridColumns(convertedFiles.length)} gap-6`}>
            {convertedFiles.map((f, idx) => (
              <div key={idx} className="flex flex-col bg-white rounded-2xl shadow-xl p-4 hover:shadow-2xl transition-all">
                {getPreviewComponent(f, idx)}
                
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600 mb-3 truncate px-2" title={f.name}>{f.name}</p>
                  <button
                    onClick={() => handleDownload(f)}
                    className="inline-block px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all text-sm font-semibold cursor-pointer"
                  >
                    ⬇️ Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileConverter;