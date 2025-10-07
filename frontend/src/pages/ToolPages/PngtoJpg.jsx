import React from "react";
import FileConverter from "../../components/FileConverter.jsx";

const PngToJpg = () => {
  return (
    <FileConverter
      title="PNG to JPG Converter"
      uploadAccept=".png"
      apiEndpoint="png-to-jpg"
      outputType="jpg"
      responseType="blob"
    />
  );
};

export default PngToJpg;
