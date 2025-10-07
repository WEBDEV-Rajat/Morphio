import React, { useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";

const MergePdf = ({ title = "Merge PDFs", uploadAccept = "application/pdf", apiEndpoint = "merge-pdf" }) => {
  const [files, setFiles] = useState([]);
  const [mergedUrl, setMergedUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files?.length) {
      setFiles((prevFiles) => [...prevFiles, ...Array.from(e.target.files)]);
      setMergedUrl(null);
      setError(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      setFiles((prevFiles) => [...prevFiles, ...Array.from(e.dataTransfer.files)]);
      setMergedUrl(null);
      setError(null);
    }
  };

  const handleConvert = async () => {
    if (files.length < 2) return alert("Please upload at least 2 PDFs");

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    setLoading(true);
    setProgress(0);

    try {
      const response = await axios.post(
        `http://localhost:5000/api/${apiEndpoint}`,
        formData,
        {
          responseType: "blob",
          onUploadProgress: (e) => {
            setProgress(Math.round((e.loaded * 100) / e.total));
          },
        }
      );

      console.log("Response headers:", response.headers);
      console.log("Response data size:", response.data.size);

      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      setMergedUrl(url);
      setProgress(100);
    } catch (err) {
      console.error("Merge error:", err.response?.data, err.message);
      setError(`Merging failed: ${err.message}. Check console for details.`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFile = (indexToRemove) => {
    setFiles((prevFiles) => prevFiles.filter((_, index) => index !== indexToRemove));
    setMergedUrl(null);
    setError(null);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-gray-100 to-blue-50">
      <motion.h1
        className="text-4xl font-bold text-gray-900 mb-8 shadow-md p-4 rounded-lg bg-white/80 backdrop-blur-sm"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {title}
      </motion.h1>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`w-full max-w-md h-48 flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300
          ${dragActive ? "border-indigo-600 bg-indigo-50" : "border-gray-300 bg-white"}`}
      >
        <input
          type="file"
          accept={uploadAccept}
          multiple
          onChange={handleFileChange}
          className="hidden"
          id="fileInput"
        />
        <label htmlFor="fileInput" className="text-gray-700 text-center px-4 py-2">
          {files.length > 0 ? `📂 ${files.length} file(s) selected` : "Drag & Drop or Click to Upload PDFs"}
        </label>
      </div>

      {files.length > 0 && (
        <div className="w-full max-w-md mt-4 space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-white p-2 rounded-lg shadow-sm border border-gray-200"
            >
              <span className="text-sm text-gray-700 truncate max-w-xs">
                📄 {file.name}
              </span>
              <button
                onClick={() => handleRemoveFile(index)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <motion.button
        onClick={handleConvert}
        className="mt-6 px-8 py-3 bg-indigo-600 text-white rounded-lg shadow-lg hover:bg-indigo-700 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
        whileTap={{ scale: 0.95 }}
        disabled={loading || files.length < 2}
      >
        {loading ? "Merging..." : "Merge PDFs"}
      </motion.button>

      {loading && (
        <div className="w-full max-w-md mt-6 bg-gray-200 rounded-full h-6 overflow-hidden">
          <motion.div
            className="h-6 bg-indigo-600 rounded-full text-center text-white text-sm font-semibold"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          >
            {progress}%
          </motion.div>
        </div>
      )}

      {error && <p className="text-red-500 mt-4">{error}</p>}

      {/* Preview & Download */}
      {mergedUrl && (
        <div className="mt-8 w-full max-w-2xl text-center">
          <h2 className="text-xl font-semibold text-green-700 mb-4">✅ Merged PDF Ready!</h2>
          <div className="grid grid-cols-1 gap-4 w-full">
            <iframe
              src={mergedUrl}
              className="w-full h-96 border rounded-xl shadow-lg bg-white"
              title="Merged PDF Preview"
            />
          </div>
          <a
            href={mergedUrl}
            download="merged.pdf"
            className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition-all"
          >
            Download PDF
          </a>
        </div>
      )}
    </div>
  );
};

export default MergePdf;