import React from "react";
import { Routes, Route } from "react-router-dom";
import Dashboard from "../pages/Dashboard.jsx";
import WordToPdf from "../pages/ToolPages/WordToPdf.jsx";
import PptxToPdf from "../pages/ToolPages/PptxToPdf.jsx";
import JpgToPdf from "../pages/ToolPages/JpgToPdf.jsx";
import PdfToWord from "../pages/ToolPages/PdfToWord.jsx";
import PdfToPptx from "../pages/ToolPages/PdfToPptx.jsx";
import CompressPdf from "../pages/ToolPages/CompressPdf.jsx";
import PngtoJpg from "../pages/ToolPages/PngtoJpg.jsx";
import JpgToPng from "../pages/ToolPages/JpgToPng.jsx";
import MergePdf from "../pages/ToolPages/MergePdf.jsx";
import PdfProtect from "../pages/ToolPages/PdfProtect.jsx";
import EditPdf from "../pages/ToolPages/EditPdf.jsx";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/merge-pdf" element={<MergePdf/>} />
      <Route path="/word-to-pdf" element={<WordToPdf/>} />
      <Route path="/pptx-to-pdf" element={<PptxToPdf/>} />
      <Route path="/jpg-to-pdf" element={<JpgToPdf/>} />
       <Route path="/pdf-to-word" element={<PdfToWord/>} />
       <Route path="/pdf-to-pptx" element={<PdfToPptx/>} />
      <Route path="/compress" element={<CompressPdf/>} /> 
      <Route path="/jpg-to-png" element={<JpgToPng/>} />
      <Route path="/png-to-jpg" element={<PngtoJpg/>} />
      <Route path="/protect-pdf" element={<PdfProtect/>} />
      <Route path="/pdf-to-pptx" element={<PdfToPptx/>} />
      <Route path="/edit-pdf" element={<EditPdf/>}/>
    </Routes> 
  );
}

export default AppRoutes;
