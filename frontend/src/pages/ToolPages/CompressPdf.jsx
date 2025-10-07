import React, { useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";

const CompressPdf = () => {
  const [file, setFile] = useState(null);
  const [convertedFile, setConvertedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [quality, setQuality] = useState("medium");
  const [error, setError] = useState(null);

  const handleFileSelect = (f) => {
    if (f.type !== "application/pdf") {
      setError("Please upload a valid PDF file");
      return;
    }
    setFile(f);
    setConvertedFile(null);
    setError(null);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleConvert = async () => {
    if (!file) {
      setError("Please upload a PDF");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("quality", quality);

    setLoading(true);
    setProgress(0);
    setError(null);

    try {
      const response = await axios.post(
        "http://localhost:5000/api/compress",
        formData,
        {
          responseType: "blob",
          onUploadProgress: (e) => {
            setProgress(Math.round((e.loaded * 100) / e.total));
          },
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      setConvertedFile(url);

      setTimeout(() => {
        setLoading(false);
        setProgress(100);
      }, 1000);
    } catch (error) {
      console.error("Compression failed:", error);
      const errorMessage =
        error.response?.data?.details || "Compression failed. Please try again.";
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-200 p-6 ">
      <motion.h1
        className="text-3xl font-bold text-gray-800 mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Compress PDF
      </motion.h1>

      {/* Error Message */}
      {error && (
        <motion.div
          className="text-red-600 mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {error}
        </motion.div>
      )}

      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`w-96 h-40 flex items-center justify-center border-2 border-dashed rounded-lg cursor-pointer transition 
          ${
            dragActive
              ? "border-purple-600 bg-purple-50"
              : "border-gray-400 bg-white"
          }`}
      >
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="hidden"
          id="fileInput"
        />
        <label htmlFor="fileInput" className="text-gray-600">
          {file ? `📂 ${file.name}` : "Drag & Drop or Click to Upload PDF"}
        </label>
      </div>

      {/* Quality selector */}
      <div className="mt-4">
        <label className="mr-2 font-medium">Compression Level:</label>
        <select
          value={quality}
          onChange={(e) => setQuality(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="low">Low (max compression, lower quality)</option>
          <option value="medium">Medium (balanced)</option>
          <option value="high">High (better quality, larger file)</option>
        </select>
      </div>

      <motion.button
        onClick={handleConvert}
        className="mt-6 px-6 py-2 bg-purple-600 text-white rounded-lg shadow-lg hover:bg-purple-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        whileTap={{ scale: 0.9 }}
        disabled={loading}
      >
        {loading ? "Compressing..." : "Compress"}
      </motion.button>

      {loading && (
        <div className="w-64 mt-6 bg-gray-300 rounded-full h-4 overflow-hidden">
          <motion.div
            className="h-4 bg-pink-500 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}

      {convertedFile && (
        <div className="mt-6 w-full max-w-2xl text-center">
          <h2 className="text-lg font-semibold mb-4">
            Compression Successful!
          </h2>
          <div className="relative">
            <iframe
              src={`${convertedFile}#view=FitH`}
              className="w-full h-96 border rounded-lg shadow"
              title="Preview"
              onError={() => setError("Failed to preview PDF. Try downloading instead.")}
            />
            {error && (
              <p className="text-red-600 mt-2">Failed to preview. <a href={convertedFile} download="compressed.pdf" className="text-blue-600 underline">Download</a> to view.</p>
            )}
          </div>
          <a
            href={convertedFile}
            download="compressed.pdf"
            className="inline-block mt-4 px-6 py-2 bg-green-600 text-white rounded-lg shadow-lg hover:bg-green-700 transition"
          >
            Download PDF
          </a>
        </div>
      )}
    </div>
  );
};

export default CompressPdf;