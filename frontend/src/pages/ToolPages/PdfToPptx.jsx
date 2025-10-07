import React from "react";
import FileConverter from "../../components/FileConverter.jsx";

const PdfToPptx = () => {
  return (
    <div>
      <FileConverter
        title="PDF to PPTX Converter"
        uploadAccept="application/pdf"
        apiEndpoint="pdf-to-pptx"
        outputType="pptx"
        responseType="json"
      />
    </div>
  );
};

export default PdfToPptx;
