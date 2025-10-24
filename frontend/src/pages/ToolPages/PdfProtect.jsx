import React, { useState } from "react";
import { Download, File, Lock, Eye, EyeOff } from "lucide-react";

const ProtectPdf = () => {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [protectedUrl, setProtectedUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];

      if (selectedFile.type !== "application/pdf") {
        setError("Please upload a valid PDF file");
        return;
      }

      if (selectedFile.size > 100 * 1024 * 1024) {
        setError("File size exceeds 100 MB limit!");
        return;
      }

      setFile(selectedFile);
      setProtectedUrl(null);
      setError(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      const droppedFile = e.dataTransfer.files[0];

      if (droppedFile.type !== "application/pdf") {
        setError("Please upload a valid PDF file");
        return;
      }

      if (droppedFile.size > 100 * 1024 * 1024) {
        setError("File size exceeds 100 MB limit!");
        return;
      }

      setFile(droppedFile);
      setProtectedUrl(null);
      setError(null);
    }
  };

  const handleConvert = async () => {
    if (!file) {
      setError("Please upload a PDF file first");
      return;
    }
    if (!password) {
      setError("Please enter a password");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }
    
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (!hasLowercase || !hasUppercase || !hasNumber) {
      setError("Password must contain uppercase, lowercase, and numbers");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("password", password);

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
          setProtectedUrl(url);
          setProgress(100);
          setLoading(false);
        } else {
          throw new Error(`Server responded with status ${xhr.status}`);
        }
      };

      xhr.onerror = () => {
        console.error("Protection Error: Network error");
        setError("Failed to protect PDF. Check console and ensure backend is running.");
        setLoading(false);
      };

      xhr.open("POST", "http://localhost:5000/api/protect-pdf");
      xhr.responseType = "blob";
      xhr.send(formData);
    } catch (err) {
      console.error("Protect error:", err.message);
      setError("Failed to protect PDF. Check console for details.");
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (protectedUrl) {
      const link = document.createElement('a');
      link.href = protectedUrl;
      link.download = file.name.replace('.pdf', '_protected.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getPasswordStrength = (pass) => {
    if (!pass) return { strength: 0, label: "", color: "", criteria: [] };
    
    const criteria = {
      length: pass.length >= 8,
      lowercase: /[a-z]/.test(pass),
      uppercase: /[A-Z]/.test(pass),
      number: /[0-9]/.test(pass),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pass)
    };
    
    const metCriteria = Object.values(criteria).filter(Boolean).length;
    const criteriaMet = [];
    
    if (criteria.length) criteriaMet.push("8+ characters");
    if (criteria.lowercase) criteriaMet.push("lowercase");
    if (criteria.uppercase) criteriaMet.push("uppercase");
    if (criteria.number) criteriaMet.push("number");
    if (criteria.special) criteriaMet.push("special char");
    
    if (metCriteria <= 2) {
      return { strength: 25, label: "Weak", color: "bg-red-500", criteria: criteriaMet };
    } else if (metCriteria === 3) {
      return { strength: 50, label: "Fair", color: "bg-yellow-500", criteria: criteriaMet };
    } else if (metCriteria === 4) {
      return { strength: 75, label: "Good", color: "bg-blue-500", criteria: criteriaMet };
    } else {
      return { strength: 100, label: "Strong", color: "bg-green-500", criteria: criteriaMet };
    }
  };

  const passwordStrength = getPasswordStrength(password);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
          <Lock className="w-8 h-8 text-indigo-600" />
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-2 drop-shadow-sm">
          Protect PDF
        </h1>
        <p className="text-gray-600">Secure your PDF with a password</p>
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
          accept=".pdf"
          onChange={handleFileChange}
          className="hidden"
          id="fileInput"
        />
        <label htmlFor="fileInput" className="cursor-pointer text-center px-6 py-4 w-full h-full flex flex-col items-center justify-center">
          <div className="text-6xl mb-4">
            <svg className={`w-20 h-20 ${dragActive ? 'text-indigo-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-gray-700 mb-2">
            {file ? `📂 ${file.name}` : "Drag & Drop your PDF here"}
          </p>
          <p className="text-sm text-gray-500">or click to browse</p>
        </label>
      </div>

      {file && (
        <div className="w-full max-w-2xl mt-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Selected File:</h3>
          <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-2xl"><File className="w-6 h-6 text-blue-500"/></span>
              <span className="text-sm text-gray-700 truncate">{file.name}</span>
              <span className="text-xs text-gray-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setProtectedUrl(null);
                setError(null);
              }}
              className="ml-4 px-3 py-1 text-red-600 hover:text-white hover:bg-red-600 rounded-lg transition-all text-sm font-medium border border-red-300"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {file && (
        <div className="w-full max-w-2xl mt-6 bg-white p-6 rounded-xl shadow-lg space-y-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Set Password Protection</h3>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password (min. 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-2 border-gray-300 p-3 pr-12 rounded-lg text-gray-700 focus:border-indigo-600 focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {password && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Password Strength:</span>
                  <span className={`font-semibold ${passwordStrength.strength >= 75 ? 'text-green-600' : passwordStrength.strength >= 50 ? 'text-blue-600' : passwordStrength.strength >= 25 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                    style={{ width: `${passwordStrength.strength}%` }}
                  />
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className={`text-xs px-2 py-1 rounded ${password.length >= 8 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {password.length >= 8 ? '✓' : '○'} 8+ chars
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${/[a-z]/.test(password) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {/[a-z]/.test(password) ? '✓' : '○'} lowercase
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${/[A-Z]/.test(password) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {/[A-Z]/.test(password) ? '✓' : '○'} uppercase
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${/[0-9]/.test(password) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {/[0-9]/.test(password) ? '✓' : '○'} number
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {/[!@#$%^&*(),.?":{}|<>]/.test(password) ? '✓' : '○'} special
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border-2 border-gray-300 p-3 pr-12 rounded-lg text-gray-700 focus:border-indigo-600 focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {confirmPassword && (
              <p className={`text-xs ${password === confirmPassword ? 'text-green-600' : 'text-red-600'}`}>
                {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
              </p>
            )}
          </div>
        </div>
      )}

      <button
        onClick={handleConvert}
        className="mt-8 px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-lg font-semibold rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:hover:scale-100"
        disabled={loading || !file || !password || !confirmPassword}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Protecting...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Protect PDF
          </span>
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

      {protectedUrl && (
        <div className="mt-12 w-full max-w-4xl">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-green-700 mb-2">Protection Successful!</h2>
            <p className="text-gray-600">Your PDF is now password protected</p>
          </div>

          <div className="flex flex-col bg-white rounded-2xl shadow-xl p-4 hover:shadow-2xl transition-all">
            <div className="w-full h-96 border-2 border-gray-300 rounded-xl shadow-lg bg-gray-50 overflow-hidden relative">
              <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-green-50 to-emerald-50">
                <Lock className="w-24 h-24 text-green-600 mb-4" />
                <p className="text-gray-800 font-semibold mb-2 text-center">PDF Protected Successfully</p>
                <p className="text-gray-600 text-sm mb-4 text-center">Your PDF is now secured with a password</p>
              </div>
              <div className="absolute top-2 right-2 bg-green-600 text-white px-3 py-1 rounded-lg shadow text-xs font-semibold pointer-events-none">
                Protected
              </div>
            </div>

            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600 mb-3">
                {file?.name.replace('.pdf', '_protected.pdf')}
              </p>
              <button
                onClick={handleDownload}
                className="inline-block px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all text-sm font-semibold cursor-pointer"
              >
                <span className="flex gap-2 font-bold items-center justify-center">
                  <Download className="w-4 h-4"/> Download Protected PDF
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProtectPdf;