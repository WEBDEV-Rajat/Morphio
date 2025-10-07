import { FileText, FileImage, FileArchive, File } from "lucide-react";
import img1 from "../../assets/pdf-logo.png";
import img2 from "../../assets/word-logo.png";
import img3 from "../../assets/logo.png";
import img4 from "../../assets/img-logo.png";
import img5 from "../../assets/pptx-logo.png";
import "./DashboardLoader.css";

export default function Loader() {
  return (
    <div className="flex flex-col items-center justify-center h-screen 
  bg-gradient-to-b from-green-200 to-blue-200">
      <div className="flex space-x-12 mb-6">
        <img src={img1} className="w-12 h-12 mt-2 animate-move1"/>
        <img src={img2} className="w-12 h-12 mt-2 animate-move2" />
        <img src={img3} className="w-20 h-20" />
        <img src={img4} className="w-12 h-12 mt-2 animate-move3" />
        <img src={img5} className="w-12 h-12 mt-2 animate-move4" />
        
      </div>

      <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 via-pink-500 to-[#1224ec]
               bg-clip-text text-transparent tracking-wide">
        Morphio
      </h1>
      <p className="mt-2 text bg-gradient-to-r from-red-600 via-pink-500 to-[#1224ec]
               bg-clip-text text-transparent tracking-wide italic">Converting made simple...</p>
    </div>
  );
}
