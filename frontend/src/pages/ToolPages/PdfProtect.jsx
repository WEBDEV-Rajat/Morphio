import React, { useState } from "react";
import axios from "axios";

const ProtectPdf = () => {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState("");
  const [protectedUrl, setProtectedUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setProtectedUrl(null);
      setError(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) {
      setFile(e.dataTransfer.files[0]);
      setProtectedUrl(null);
      setError(null);
    }
  };

  const handleConvert = async () => {
    if (!file) return alert("Please upload a PDF file");
    if (!password) return alert("Please enter a password");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("password", password);

    setLoading(true);
    setProgress(0);

    try {
      const response = await axios.post("http://localhost:5000/api/protect-pdf", formData, {
        responseType: "blob",
        onUploadProgress: (e) => {
          setProgress(Math.round((e.loaded * 100) / e.total));
        },
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      setProtectedUrl(url);
      setProgress(100);
    } catch (err) {
      console.error("Protect error:", err.response?.data, err.message);
      setError("Failed to protect PDF. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Protect PDF with Password</h1>

      <div className="w-full max-w-md">
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
            dragOver ? "border-blue-600 bg-blue-50" : "border-gray-300"
          }`}
          onClick={() => document.getElementById("fileInput").click()}
        >
          {file ? (
            <p className="text-gray-700 font-medium">{file.name}</p>
          ) : (
            <p className="text-gray-500">Drag & drop your PDF here or click to upload</p>
          )}
          <input
            id="fileInput"
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mt-4 p-2 border rounded"
        />

        <button
          onClick={handleConvert}
          className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          disabled={loading || !file || !password}
        >
          {loading ? "Protecting..." : "Protect PDF"}
        </button>

        {loading && (
          <div className="w-full mt-4 bg-gray-200 rounded-full h-4">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all duration-300 text-xs text-white text-center"
              style={{ width: `${progress}%` }}
            >
              {progress}%
            </div>
          </div>
        )}


        {protectedUrl && (
          <div className="mt-6 text-center">
            <iframe
              src={protectedUrl}
              title="Protected PDF Preview"
              className="w-full h-64 border rounded shadow"
            ></iframe>
            <a
              href={protectedUrl}
              download="protected.pdf"
              className="mt-4 inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Download Protected PDF
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProtectPdf;
