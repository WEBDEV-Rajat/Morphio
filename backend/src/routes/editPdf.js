// backend/src/routes/editPdf.js
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS = path.join(__dirname, "../../uploads");

if (!fs.existsSync(UPLOADS)) {
  fs.mkdirSync(UPLOADS, { recursive: true });
}

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
  limits: { fileSize: 100 * 1024 * 1024 },
});

// Upload PDF and get info
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const pdfBytes = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pageCount = pdfDoc.getPageCount();

    res.json({
      filename: req.file.filename,
      originalName: req.file.originalname,
      pageCount,
      size: req.file.size,
      path: req.file.path,
    });
  } catch (error) {
    console.error("Upload error:", error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: "Failed to upload PDF", details: error.message });
  }
});

// Get PDF info
router.get("/info/:filename", async (req, res) => {
  try {
    const filePath = path.join(UPLOADS, req.params.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    res.json({
      pageCount: pdfDoc.getPageCount(),
      filename: req.params.filename,
    });
  } catch (error) {
    console.error("Get info error:", error);
    res.status(500).json({ error: "Failed to get PDF info", details: error.message });
  }
});

// Delete page from PDF
router.post("/delete-page", async (req, res) => {
  try {
    const { filename, pageIndex } = req.body;
    
    if (!filename || pageIndex === undefined) {
      return res.status(400).json({ error: "Missing filename or pageIndex" });
    }

    const filePath = path.join(UPLOADS, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    if (pageIndex < 0 || pageIndex >= pdfDoc.getPageCount()) {
      return res.status(400).json({ error: "Invalid page index" });
    }

    if (pdfDoc.getPageCount() <= 1) {
      return res.status(400).json({ error: "Cannot delete the last page" });
    }

    pdfDoc.removePage(pageIndex);
    const modifiedPdfBytes = await pdfDoc.save();
    fs.writeFileSync(filePath, modifiedPdfBytes);

    res.json({
      message: "Page deleted successfully",
      pageCount: pdfDoc.getPageCount(),
    });
  } catch (error) {
    console.error("Delete page error:", error);
    res.status(500).json({ error: "Failed to delete page", details: error.message });
  }
});

// Rotate page
router.post("/rotate-page", async (req, res) => {
  try {
    const { filename, pageIndex, degrees } = req.body;
    
    if (!filename || pageIndex === undefined || !degrees) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const filePath = path.join(UPLOADS, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    if (pageIndex < 0 || pageIndex >= pdfDoc.getPageCount()) {
      return res.status(400).json({ error: "Invalid page index" });
    }

    const page = pdfDoc.getPage(pageIndex);
    const currentRotation = page.getRotation().angle;
    page.setRotation({ type: "degrees", angle: (currentRotation + degrees) % 360 });

    const modifiedPdfBytes = await pdfDoc.save();
    fs.writeFileSync(filePath, modifiedPdfBytes);

    res.json({ message: "Page rotated successfully" });
  } catch (error) {
    console.error("Rotate page error:", error);
    res.status(500).json({ error: "Failed to rotate page", details: error.message });
  }
});

// Add text to page
router.post("/add-text", async (req, res) => {
  try {
    const { filename, pageIndex, text, x, y, size, color } = req.body;
    
    if (!filename || pageIndex === undefined || !text) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const filePath = path.join(UPLOADS, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    if (pageIndex < 0 || pageIndex >= pdfDoc.getPageCount()) {
      return res.status(400).json({ error: "Invalid page index" });
    }

    const page = pdfDoc.getPage(pageIndex);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    const textColor = color || { r: 0, g: 0, b: 0 };
    const textSize = size || 12;
    const textX = x || 50;
    const textY = y || page.getHeight() - 100;

    page.drawText(text, {
      x: textX,
      y: textY,
      size: textSize,
      font,
      color: rgb(textColor.r, textColor.g, textColor.b),
    });

    const modifiedPdfBytes = await pdfDoc.save();
    fs.writeFileSync(filePath, modifiedPdfBytes);

    res.json({ message: "Text added successfully" });
  } catch (error) {
    console.error("Add text error:", error);
    res.status(500).json({ error: "Failed to add text", details: error.message });
  }
});

// Extract pages (create new PDF from selected pages)
router.post("/extract-pages", async (req, res) => {
  try {
    const { filename, pageIndices } = req.body;
    
    if (!filename || !pageIndices || !Array.isArray(pageIndices)) {
      return res.status(400).json({ error: "Missing filename or pageIndices array" });
    }

    const filePath = path.join(UPLOADS, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const newPdfDoc = await PDFDocument.create();

    for (const index of pageIndices) {
      if (index >= 0 && index < pdfDoc.getPageCount()) {
        const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [index]);
        newPdfDoc.addPage(copiedPage);
      }
    }

    const outputFilename = `${Date.now()}-extracted.pdf`;
    const outputPath = path.join(UPLOADS, outputFilename);
    const newPdfBytes = await newPdfDoc.save();
    fs.writeFileSync(outputPath, newPdfBytes);

    res.json({
      message: "Pages extracted successfully",
      filename: outputFilename,
      pageCount: newPdfDoc.getPageCount(),
    });
  } catch (error) {
    console.error("Extract pages error:", error);
    res.status(500).json({ error: "Failed to extract pages", details: error.message });
  }
});

// Reorder pages
router.post("/reorder-pages", async (req, res) => {
  try {
    const { filename, newOrder } = req.body;
    
    if (!filename || !newOrder || !Array.isArray(newOrder)) {
      return res.status(400).json({ error: "Missing filename or newOrder array" });
    }

    const filePath = path.join(UPLOADS, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const newPdfDoc = await PDFDocument.create();

    for (const index of newOrder) {
      if (index >= 0 && index < pdfDoc.getPageCount()) {
        const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [index]);
        newPdfDoc.addPage(copiedPage);
      }
    }

    const modifiedPdfBytes = await newPdfDoc.save();
    fs.writeFileSync(filePath, modifiedPdfBytes);

    res.json({
      message: "Pages reordered successfully",
      pageCount: newPdfDoc.getPageCount(),
    });
  } catch (error) {
    console.error("Reorder pages error:", error);
    res.status(500).json({ error: "Failed to reorder pages", details: error.message });
  }
});

// Download PDF
router.get("/download/:filename", (req, res) => {
  try {
    const filePath = path.join(UPLOADS, req.params.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    res.download(filePath, "edited-document.pdf", (err) => {
      if (err) {
        console.error("Download error:", err);
        res.status(500).json({ error: "Failed to download file" });
      }
    });
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ error: "Failed to download file", details: error.message });
  }
});

// Delete file
router.delete("/delete/:filename", (req, res) => {
  try {
    const filePath = path.join(UPLOADS, req.params.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    fs.unlinkSync(filePath);
    res.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Delete file error:", error);
    res.status(500).json({ error: "Failed to delete file", details: error.message });
  }
});

export default router;