import React from "react";
import FileConverter from "../../components/FileConverter.jsx";

const PdfToWord = () => {
  return (
    <FileConverter
      title="PDF to Word Converter"
      uploadAccept=".pdf"
      apiEndpoint="pdf-to-word"
      outputType="docx"  
      responseType="json"
    />
  );
};

export default PdfToWord;
