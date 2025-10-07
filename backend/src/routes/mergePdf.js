import express from "express";
import multer from "multer";
import PDFMerger from "pdf-merger-js";
import fs from "fs";
import path from "path";

const router = express.Router();
const upload = multer({ dest: "uploads/" });


router.post("/", upload.array("files", 10), async (req, res) => {
  try {
    if (!req.files || req.files.length < 2) {
      return res.status(400).send("Please upload at least 2 PDF files");
    }

    console.log("Received files:", req.files.map((f) => f.originalname));
    const merger = new PDFMerger();

    for (const file of req.files) {
      const filePath = path.resolve(file.path);
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${file.originalname}`);
      }
      await merger.add(filePath); 
      console.log(`Added file: ${file.originalname}`);
    }

    const mergedBuffer = await merger.saveAsBuffer();
    console.log("Merged buffer size:", mergedBuffer.length);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=merged.pdf",
    });

    res.send(mergedBuffer);

    req.files.forEach((file) => {
      const filePath = path.resolve(file.path);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
  } catch (err) {
    console.error("Error merging PDFs:", err.message, err.stack);
    res.status(500).send(`Error merging PDFs: ${err.message}`);
  }
});

export default router;