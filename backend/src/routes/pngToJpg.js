import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";

const router = express.Router();

const upload = multer({
  dest: "uploads/",
  fileFilter: (req, file, cb) => {
    console.log("Received file:", file.originalname, "MIME type:", file.mimetype);
    if (file.mimetype === "image/png") {
      cb(null, true);
    } else {
      cb(new Error("Only PNG files are allowed"), false);
    }
  },
  limits: { fileSize: 100 * 1024 * 1024 }, 
});

const uploadsDir = path.resolve("uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

router.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) {
    console.log("No file in request. Fields received:", req.body);
    return res.status(400).send("No file uploaded");
  }

  const inputPath = path.resolve(req.file.path);
  const fileBaseName = path.parse(req.file.originalname).name;
  const outputPath = path.resolve("uploads", `${fileBaseName}.jpg`);

  try {
    if (!fs.existsSync(inputPath)) {
      throw new Error("Input file not found");
    }

    console.log("Converting:", inputPath, "to", outputPath);
    await sharp(inputPath).toFormat("jpeg").toFile(outputPath);

    const data = fs.readFileSync(outputPath);
    res.setHeader("Content-Disposition", `inline; filename="${fileBaseName}.jpg"`);
    res.setHeader("Content-Type", "image/jpeg");
    res.send(data);

    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
  } catch (err) {
    console.error("PNG → JPG conversion error:", err.message);
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    return res.status(500).send(`Conversion failed: ${err.message}`);
  }
});

export default router;