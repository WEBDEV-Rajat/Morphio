import React from "react";
import FileConverter from "../../components/FileConverter.jsx";

const JpgToPng = () => {
  return (
    <FileConverter
      title="JPG to PNG Converter"
      uploadAccept=".jpg,.jpeg"
      apiEndpoint="jpg-to-png"
      outputType="png"
      responseType="blob"
    />
  );
};

export default JpgToPng;
