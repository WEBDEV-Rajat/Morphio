import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import util from "util";

const router = express.Router();

const execPromise = util.promisify(exec);

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage: storage });

router.use("/uploads", express.static(path.resolve("uploads")));

router.post("/", upload.array("files"), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).send("No files uploaded");
  }

  const outputDir = path.resolve("uploads");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const conversions = [];

  for (const file of req.files) {
    const inputPath = path.resolve(file.path);
    const fileBaseName = path.parse(file.originalname).name;
    const outputPdf = path.join(outputDir, `${fileBaseName}_${Date.now()}.pdf`);
    console.log(`\n=== Starting conversion for ${file.originalname} ===`);
    console.log(`Input path: ${inputPath}`);
    console.log(`Output path: ${outputPdf}`);

    const sofficePath = `"C:\\Program Files\\LibreOffice\\program\\soffice.exe"`;
    const command = `${sofficePath} --headless --convert-to pdf:writer_pdf_Export --outdir "${outputDir}" "${inputPath}"`;

    try {
      const { stdout, stderr } = await execPromise(command);

      console.log(`Command stdout: ${stdout}`);
      if (stderr) {
        console.error(`Command stderr: ${stderr}`);
        throw new Error(`Conversion failed: ${stderr}`);
      }

      const pdfFiles = fs.readdirSync(outputDir).filter((f) => f.endsWith(".pdf") && f.includes(fileBaseName));
      const latestPdf = pdfFiles.length > 0 ? path.join(outputDir, pdfFiles[0]) : null;

      if (latestPdf && fs.existsSync(latestPdf)) {
        conversions.push({
          url: `/uploads/${path.basename(latestPdf)}`,
          name: path.basename(latestPdf),
        });
        console.log(`Successfully converted ${file.originalname} to ${path.basename(latestPdf)}`);
      } else {
        console.error(`No PDF found in ${outputDir} for ${file.originalname}`);
        throw new Error("Converted PDF not found");
      }
    } catch (err) {
      console.error(`Conversion failed for ${file.originalname}:`, err.message);
    } finally {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (fs.existsSync(inputPath)) {
        await fs.promises.unlink(inputPath).catch((err) => console.error(`Failed to delete ${inputPath}:`, err));
      } else {
        console.log(`File ${inputPath} does not exist, skipping deletion`);
      }
    }
  }

  if (conversions.length > 0) {
    res.json(conversions);
  } else {
    res.status(500).send("Conversion failed for all files");
  }
});

export default router;