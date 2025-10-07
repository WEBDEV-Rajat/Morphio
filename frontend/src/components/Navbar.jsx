import React, { useState, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import img1 from "../../src/assets/logo.png";
import img2 from "../../src/assets/compress-pdf-logo.png";
import img3 from "../../src/assets/merge-pdf-logo.png";
import img4 from "../../src/assets/protect-pdf-logo.png"; 
import img5 from "../../src/assets/word-logo.png";
import img6 from "../../src/assets/pptx-logo.png";
import img7 from "../../src/assets/img-logo.png";
import { ChevronDown } from "lucide-react";


function Navbar() {
  const [openTools, setOpenTools] = useState(false);
  const navRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setOpenTools(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNavClick = () => {
    setOpenTools(false);
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-200" ref={navRef}>
      <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <img src={img1} className="w-12 h-12" alt="Morphio Logo" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-red-600 via-pink-500 to-[#1224ec]
               bg-clip-text text-transparent cursor-pointer">
              <NavLink to="/">Morphio</NavLink>
            </h1>
          </div>

          <ul className="flex gap-6 text-gray-700 font-medium items-center">
            <li className="relative">
              <button
                onClick={() => setOpenTools(!openTools)}
                className="flex items-center gap-2 px-4 py-2 rounded-md hover:bg-blue-50 transition-colors text-blue-600 font-semibold"
              >
                Tools
                <div className={`w-4 h-4 transition-transform ${openTools ? 'rotate-180' : ''} ${openTools ? 'translate-x-2 translate-y-1' : '-translate-y-0.5'}`}>
                  <ChevronDown size={24}/>
                </div>
              </button>

              {openTools && (
                <div className="absolute top-full -translate-x-[20%] mt-5 w-[90vw] max-w-[900px] bg-white shadow-2xl rounded-lg border border-gray-200 py-8 px-8">
                  <div className="grid grid-cols-4 gap-8">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4 tracking-wide">Compress</h3>
                      <NavLink 
                        to="/compress" 
                        onClick={handleNavClick} 
                        className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 transition-colors group w-full text-left"
                      >
                        <img src={img2} className="w-8 h-8 rounded-2xl" />
                        <span className="text-gray-800 font-medium">Compress PDF</span>
                      </NavLink>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4 tracking-wide">Organize</h3>
                      <NavLink 
                        to="/merge-pdf" 
                        onClick={handleNavClick} 
                        className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 transition-colors group w-full text-left"
                      >
                        <img src={img3} className="w-8 h-8 rounded-2xl" />
                        <span className="text-gray-800 font-medium">Merge PDF</span>
                      </NavLink>
                      <NavLink 
                        to="/protect-pdf" 
                        onClick={handleNavClick} 
                        className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 transition-colors group w-full text-left mt-1"
                      >
                        <img src={img4} className="w-8 h-8 rounded-2xl" />
                        <span className="text-gray-800 font-medium">Protect PDF</span>
                      </NavLink>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4 tracking-wide">Convert from PDF</h3>
                      <div className="space-y-1">
                        <NavLink 
                          to="/pdf-to-word" 
                          onClick={handleNavClick} 
                          className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 transition-colors group w-full text-left"
                        >
                          <img src={img5} className="w-8 h-8 rounded-2xl" />
                          <span className="text-gray-800 font-medium">PDF to Word</span>
                        </NavLink>
                        <NavLink 
                          to="/pdf-to-pptx" 
                          onClick={handleNavClick} 
                          className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 transition-colors group w-full text-left"
                        >
                          <img src={img6} className="w-8 h-8 rounded-2xl" />
                          <span className="text-gray-800 font-medium">PDF to PPT</span>
                        </NavLink>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4 tracking-wide">Convert to PDF</h3>
                      <div className="space-y-1">
                        <NavLink 
                          to="/word-to-pdf" 
                          onClick={handleNavClick} 
                          className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 transition-colors group w-full text-left"
                        >
                          <img src={img5} className="w-8 h-8 rounded-2xl" />
                          <span className="text-gray-800 font-medium">Word to PDF</span>
                        </NavLink>
                        <NavLink 
                          to="/pptx-to-pdf" 
                          onClick={handleNavClick} 
                          className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 transition-colors group w-full text-left"
                        >
                          <img src={img6} className="w-8 h-8 rounded-2xl" />
                          <span className="text-gray-800 font-medium">PPT to PDF</span>
                        </NavLink>
                        <NavLink 
                          to="/jpg-to-pdf" 
                          onClick={handleNavClick} 
                          className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 transition-colors group w-full text-left"
                        >
                          <img src={img7} className="w-8 h-8 rounded-2xl" />
                          <span className="text-gray-800 font-medium">JPG to PDF</span>
                        </NavLink>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4 tracking-wide">Image Conversion</h3>
                    <div className="flex gap-4">
                      <NavLink 
                        to="/jpg-to-png" 
                        onClick={handleNavClick} 
                        className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        <img src={img7} className="w-8 h-8 rounded-2xl" />
                        <span className="text-gray-800 font-medium">JPG to PNG</span>
                      </NavLink>
                      <NavLink 
                        to="/png-to-jpg" 
                        onClick={handleNavClick} 
                        className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        <img src={img7} className="w-8 h-8 rounded-2xl" />
                        <span className="text-gray-800 font-medium">PNG to JPG</span>
                      </NavLink>
                    </div>
                  </div>
                </div>
              )}
            </li>
            <li>
              <NavLink to="/compress" className="hover:text-gray-900 transition-colors">Compress</NavLink>
            </li>
            <li>
              <NavLink to="/merge-pdf" className="hover:text-gray-900 transition-colors">Merge</NavLink>
            </li>
          </ul>
        </div>

        {/* <div className="flex items-center gap-6 text-gray-700 font-medium">
          <NavLink to="/ai-pdf" className="hover:text-gray-900 transition-colors">AI PDF</NavLink>
        </div> */}
      </div>
    </nav>
  );
}

export default Navbar;