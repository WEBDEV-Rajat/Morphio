// backend/src/server.js
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import wordToPdfRoutes from "./routes/wordToPdf.js";
import pptxToPdfRoutes from "./routes/pptxToPdf.js";
import jpgToPdfRoutes from "./routes/jpgToPdf.js";
import pdfToWordRoutes from "./routes/pdfToWord.js";
import compressPdfRoutes from "./routes/compressPdf.js";
import jpgToPngRoutes from "./routes/jpgToPng.js";
import pngToJpgRoutes from "./routes/pngToJpg.js";
import mergePdfRoutes from "./routes/mergePdf.js";
import protectPdfRoutes from "./routes/pdfProtect.js";
import pdfToPptxRoutes from "./routes/pdfToPptx.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use("/api/convert/word-to-pdf", wordToPdfRoutes);
app.use("/api/convert/pptx-to-pdf", pptxToPdfRoutes);
app.use("/api/convert/jpg-to-pdf", jpgToPdfRoutes);
app.use("/api/convert/pdf-to-word", pdfToWordRoutes);
app.use("/api/compress", compressPdfRoutes);
app.use("/api/convert/jpg-to-png", jpgToPngRoutes);
app.use("/api/convert/png-to-jpg", pngToJpgRoutes);
app.use("/api/convert/pdf-to-pptx", pdfToPptxRoutes);
app.use("/api/merge-pdf", mergePdfRoutes);
app.use("/api/protect-pdf", protectPdfRoutes);

app.get("/", (req, res) => {
  res.send(" File Conversion API is running...");
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});