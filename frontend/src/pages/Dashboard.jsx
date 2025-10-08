import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Loader from "../components/Loaders/DashboardLoader";

const tools = [
  { name: "Merge PDF", path: "/merge-pdf", color: "from-green-400 to-green-600" },
  { name: "PDF → Word(only text-based pdfs)", path: "/pdf-to-word", color: "from-red-400 to-red-600" },
  { name: "Word → PDF", path: "/word-to-pdf", color: "from-green-400 to-green-600" },
  { name: "PPTX → PDF", path: "/pptx-to-pdf", color: "from-green-400 to-green-600" },
  { name: "PDF → PPTX", path: "/pdf-to-pptx", color: "from-red-400 to-red-600" },
  { name: "IMG → PDF", path: "/jpg-to-pdf", color: "from-green-400 to-green-600" },
  { name: "Protect PDF", path: "/protect-pdf", color: "from-green-400 to-green-600" },
  { name: "Compress PDF", path: "/compress", color: "from-green-400 to-green-600" },
  { name: "JPG → PNG", path: "/jpg-to-png", color: "from-green-400 to-green-600" },
  { name: "PNG → JPG", path: "/png-to-jpg", color: "from-green-400 to-green-600" },
];

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-10">
          Welcome to Morphio
        </h1>
        <p className="text-center mb-12">
          Your all-in-one solution for document and image conversion,
          compression, and protection.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {tools.map((tool, index) => (
            <div
              key={index}
              onClick={() => navigate(tool.path)}
              className={`cursor-pointer rounded-xl shadow-lg bg-gradient-to-r ${tool.color} p-6 text-white font-semibold text-lg flex items-center justify-center text-center transform transition hover:scale-105`}
            >
              {tool.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
