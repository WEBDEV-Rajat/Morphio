import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Loader from "../components/Loaders/DashboardLoader";
import { FileText, File, FileImage, Lock, Minimize2, Image} from "lucide-react";

const tools = [
  { name: "Merge PDF", path: "/merge-pdf", icon: FileText, description: "Combine PDFs in the order you want" },
  { name: "PDF to Word", path: "/pdf-to-word", icon: File, description: "Convert PDF to editable Word" },
  { name: "Word to PDF", path: "/word-to-pdf", icon: FileText, description: "Make DOC and DOCX files easy to read" },
  { name: "PPTX to PDF", path: "/pptx-to-pdf", icon: FileText, description: "Turn presentations into PDFs" },
  { name: "PDF to PPTX", path: "/pdf-to-pptx", icon: File, description: "Convert PDF to PowerPoint slides" },
  { name: "IMG to PDF", path: "/jpg-to-pdf", icon: FileImage, description: "Convert JPG, PNG images to PDF" },
  { name: "Protect PDF", path: "/protect-pdf", icon: Lock, description: "Encrypt PDF with a password" },
  { name: "Compress PDF", path: "/compress", icon: Minimize2, description: "Reduce file size" },
  { name: "JPG to PNG", path: "/jpg-to-png", icon: Image, description: "Convert JPG images to PNG" },
  { name: "PNG to JPG", path: "/png-to-jpg", icon: Image, description: "Convert PNG images to JPG" },
];

const FloatingIcon = ({ icon: Icon, color, delay, position }) => (
  <div 
    className="absolute animate-bounce"
    style={{
      ...position,
      animationDelay: `${delay}s`,
      animationDuration: '3s'
    }}
  >
    <div className={`${color} rounded-lg p-3 shadow-lg`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
  </div>
);

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleToolClick = (toolPath) => {
    navigate(toolPath);
  };

   const scrollToTools = () => {
    const toolsSection = document.getElementById('tools-section');
    if (toolsSection) {
      toolsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
          <div className="space-y-8">
            <h1 className="text-5xl lg:text-6xl font-bold  leading-tight">
              Convert Anything With <span className="bg-gradient-to-r from-red-600 via-pink-500 to-[#1224ec]
               bg-clip-text text-transparent">Ease</span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              All the tools you'll need to be more productive and work smarter with documents.
            </p>
            <div className="flex flex-wrap gap-4">
              <button onClick={scrollToTools} className="px-8 py-4 bg-gradient-to-r from-red-600 via-pink-500 to-[#1224ec]  text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition shadow-lg hover:shadow-xl">
                Explore All PDF Tools
              </button>
            </div>
          </div>

          <div className="relative h-96 lg:h-[500px]">
            <FloatingIcon icon={FileText} color="bg-red-500" delay={0} position={{ top: '5%', left: '2%' }} />
            <FloatingIcon icon={Lock} color="bg-purple-500" delay={0.5} position={{ top: '8%', right: '5%' }} />
            <FloatingIcon icon={FileImage} color="bg-yellow-500" delay={1.5} position={{ bottom: '10%', right: '2%' }} />
            <FloatingIcon icon={File} color="bg-blue-500" delay={2} position={{ bottom: '5%', left: '8%' }} />

            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-30 w-full max-w-md z-10">
              <div className="relative">
                <div className="absolute left-0 top-0 transform -rotate-12 hover:rotate-0 transition-all duration-500">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-2xl p-6 w-40 h-52">
                    <div className="flex flex-col items-center justify-center h-full text-white">
                      <FileText className="w-16 h-16 mb-3" />
                      <div className="text-xs font-bold">PDF</div>
                      <div className="text-[10px] opacity-80 mt-1">Document</div>
                    </div>
                  </div>
                </div>

                <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                  <div className="bg-white rounded-full p-4 shadow-xl animate-pulse">
                    <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>

                <div className="absolute right-0 top-0 transform rotate-12 hover:rotate-0 transition-all duration-500">
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-2xl p-6 w-40 h-52">
                    <div className="flex flex-col items-center justify-center h-full text-white">
                      <File className="w-16 h-16 mb-3" />
                      <div className="text-xs font-bold">DOCX</div>
                      <div className="text-[10px] opacity-80 mt-1">Word File</div>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-0 left-1/4 transform translate-y-20 -rotate-6">
                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-xl p-4 w-32 h-40">
                    <div className="flex flex-col items-center justify-center h-full text-white">
                      <FileImage className="w-12 h-12 mb-2" />
                      <div className="text-xs font-bold">JPG</div>
                      <div className="text-[10px] opacity-80 mt-1">Image</div>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-0 left-1/2 transform translate-y-24 translate-x-2">
                  <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-lg shadow-xl p-4 w-32 h-40">
                    <div className="flex flex-col items-center justify-center h-full text-white">
                      <FileText className="w-12 h-12 mb-2" />
                      <div className="text-xs font-bold">PPTX</div>
                      <div className="text-[10px] opacity-80 mt-1">PowerPoint</div>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-0 right-1/4 transform translate-y-20 rotate-6">
                    <div className="flex flex-col items-center justify-center h-full text-white">
                    </div>
                </div>
              </div>
            </div>

            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full filter blur-3xl opacity-50 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-100 rounded-full filter blur-3xl opacity-50 animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-1/2 left-0 w-36 h-36 bg-green-100 rounded-full filter blur-3xl opacity-40 animate-pulse" style={{ animationDelay: '2s' }}></div>
          </div>
        </div>
      </div>

      <div id="tools-section" className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Every tool you need to work with PDFs in one place
            </h2>
            <p className="text-lg text-gray-600">
              Every tool you need to use PDFs, at your fingertips. All are 100% FREE and easy to use!
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {tools.map((tool, index) => {
              const Icon = tool.icon;
              return (
                <div
                  key={index}
                  onClick={() => handleToolClick(tool.path)}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="bg-white rounded-xl border border-gray-200 p-6 cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-2 group"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all duration-200 ${
                      hoveredIndex === index 
                        ? 'bg-blue-600 text-white scale-110' 
                        : 'bg-blue-50 text-blue-600'
                    }`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2 text-sm">
                      {tool.name}
                    </h3>
                    <p className="text-xs text-gray-500 leading-snug">
                      {tool.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-red-600 via-pink-500 to-[#1224ec] py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h3 className="text-3xl font-bold mb-4">
              Make PDF work for you
            </h3>
            <p className="text-xl mb-8 text-blue-100">
              Unlock the full potential of your documents with our comprehensive PDF toolkit.
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-lg">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>Fast & Reliable</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>100% Free</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>Secure</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;