import React from "react";
import FileConverter from "../../components/FileConverter.jsx";

const JpgToPdf = () => {
  return (
    <FileConverter
      title="Image to PDF Converter"
      uploadAccept=".jpg,.jpeg,.png"
      apiEndpoint="jpg-to-pdf"
      outputType="pdf" 
      responseType="blob" 
    />
  );
};

export default JpgToPdf;