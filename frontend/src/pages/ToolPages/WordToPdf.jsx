import React from "react";
import FileConverter from "../../components/FileConverter.jsx";

const WordToPdf = () => {
  return (
    <FileConverter
      title="Word to PDF Converter"
      uploadAccept=".doc,.docx"
      apiEndpoint="word-to-pdf"
      outputType="pdf"
      responseType="json"
    />
  );
};

export default WordToPdf;
