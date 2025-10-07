import React from "react";
import FileConverter from "../../components/FileConverter.jsx";

const PptxToPdf = () => {
  return (
    <FileConverter
      title="PPTX to PDF Converter"
      uploadAccept=".pptx"
      apiEndpoint="pptx-to-pdf"
      outputType="pdf"  
    />
  );
};

export default PptxToPdf;