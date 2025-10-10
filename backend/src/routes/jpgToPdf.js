import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import PDFKit from "pdfkit";
import sizeOf from "image-size";

const router = express.Router();

const upload = multer({
  dest: "uploads/",
  fileFilter: (req, file, cb) => {
    console.log("Received file:", file.originalname, "MIME type:", file.mimetype, "Field name:", file.fieldname);
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, 
}).array("files", 10);

const uploadsDir = path.resolve("uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

router.post("/", (req, res) => {
  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      console.error("Multer error:", err.message, "Code:", err.code, "Field:", err.field);
      return res.status(400).send(`Upload failed: ${err.message}`);
    } else if (err) {
      console.error("General error:", err.message);
      return res.status(500).send(`Server error: ${err.message}`);
    }

    if (!req.files || req.files.length === 0) {
      console.log("No files in request. Fields received:", req.body);
      return res.status(400).send("No files uploaded");
    }

    const outputPath = path.resolve("uploads", "converted.pdf");
    const tempOutputPath = path.resolve("uploads", "temp_converted.pdf");

    try {
      const doc = new PDFKit({ size: [612, 792] }); 
      const writeStream = fs.createWriteStream(outputPath);
      const tempWriteStream = fs.createWriteStream(tempOutputPath);
      doc.pipe(writeStream);
      doc.pipe(tempWriteStream);

      for (const file of req.files) {
        const inputPath = path.resolve(file.path);
        if (!fs.existsSync(inputPath)) {
          console.error(`Input file not found: ${file.originalname}`);
          continue; 
        }

        const imageBuffer = fs.readFileSync(inputPath);
        console.log(`Read ${file.originalname}, Buffer length: ${imageBuffer.length}`);

        const dimensions = sizeOf(imageBuffer);
        if (!dimensions.width || !dimensions.height) {
          console.warn(`Invalid dimensions for ${file.originalname}, skipping...`);
          continue;
        }
        console.log(`Image ${file.originalname}: ${dimensions.width}x${dimensions.height}`);

        const maxWidth = 500;
        const maxHeight = 700;
        let fitWidth = dimensions.width;
        let fitHeight = dimensions.height;
        if (fitWidth > maxWidth || fitHeight > maxHeight) {
          const aspectRatio = dimensions.width / dimensions.height;
          if (fitWidth > maxWidth) {
            fitWidth = maxWidth;
            fitHeight = fitWidth / aspectRatio;
          }
          if (fitHeight > maxHeight) {
            fitHeight = maxHeight;
            fitWidth = fitHeight * aspectRatio;
          }
        }
        console.log(`Fit dimensions for ${file.originalname}: ${Math.round(fitWidth)}x${Math.round(fitHeight)}`);

        doc.addPage();
        doc.image(imageBuffer, {
          fit: [Math.round(fitWidth), Math.round(fitHeight)],
          align: "center",
          valign: "center",
        });
        console.log(`Added image ${file.originalname} to page`);
      }

      doc.end();

      await new Promise((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });

      const data = fs.readFileSync(outputPath);
      if (data.length === 0) {
        throw new Error("Generated PDF is empty");
      }
      console.log("PDF generated, size:", data.length);

      res.setHeader("Content-Disposition", `inline; filename="converted.pdf"`);
      res.setHeader("Content-Type", "application/pdf");
      res.send(data);

      req.files.forEach((file) => {
        const filePath = path.resolve(file.path);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
    } catch (err) {
      console.error("Image → PDF conversion error:", err.message, err.stack);

      req.files.forEach((file) => {
        const filePath = path.resolve(file.path);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);

      return res.status(500).send(`Conversion failed: ${err.message}`);
    }
  });
});

export default router;