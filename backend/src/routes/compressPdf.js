import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import util from "util";

const execPromise = util.promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS = path.join(__dirname, "uploads");

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

router.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const inputPath = req.file.path;
  const quality = req.body.quality || "medium";
  const outputPath = path.join(UPLOADS, `${Date.now()}-compressed.pdf`);

  const qualitySettings = {
    low: {
      setting: "/screen",
      dpi: 72,
      quality: 60, 
    },
    medium: {
      setting: "/ebook",
      dpi: 150,
      quality: 75,
    },
    high: {
      setting: "/prepress",
      dpi: 300,
      quality: 90,
    },
  };
  const { setting, dpi, quality: jpegQuality } = qualitySettings[quality] || qualitySettings.medium;

  const command = `
    gswin64c -sDEVICE=pdfwrite \
    -dCompatibilityLevel=1.4 \
    -dPDFSETTINGS=${setting} \
    -dColorImageDownsampleType=/Bicubic \
    -dColorImageResolution=${dpi} \
    -dGrayImageDownsampleType=/Bicubic \
    -dGrayImageResolution=${dpi} \
    -dMonoImageDownsampleType=/Subsample \
    -dMonoImageResolution=${dpi} \
    -dColorImageDownsampleThreshold=1.0 \
    -dGrayImageDownsampleThreshold=1.0 \
    -dMonoImageDownsampleThreshold=1.0 \
    -dColorImageFilter=/DCTEncode \
    -dJPEGQ=${jpegQuality} \
    -dNOPAUSE -dQUIET -dBATCH \
    -sOutputFile="${outputPath}" "${inputPath}"
  `.replace(/\s+/g, " ").trim();

  try {
    await execPromise("gswin64c --version");
    await execPromise(command);

    if (!fs.existsSync(outputPath)) {
      throw new Error("Compressed file was not created");
    }

    const pdfBuffer = fs.readFileSync(outputPath);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=compressed.pdf");
    res.send(pdfBuffer);

    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
  } catch (error) {
    console.error("Compression failed:", error);
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    res.status(500).json({ error: "Compression failed", details: error.message });
  }
});

export default router;