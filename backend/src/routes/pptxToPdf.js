import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import util from "util";

const router = express.Router();

// Promisify exec for async usage
const execPromise = util.promisify(exec);

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage: storage });

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
    console.log(`\n=== Starting conversion for ${file.originalname} ===`);
    console.log(`Input path: ${inputPath}`);
    console.log(`Output dir: ${outputDir}`);

    const sofficePath = `"C:\\Program Files\\LibreOffice\\program\\soffice.exe"`; 
    const outputPdf = path.join(outputDir, `${fileBaseName}_${Date.now()}.pdf`); 
    const command = `${sofficePath} --headless --convert-to pdf "${inputPath}" --outdir "${outputDir}"`; 

    try {
      const { stdout, stderr } = await execPromise(command);

      console.log(`Command stdout: ${stdout}`);
      if (stderr) console.error(`Command stderr: ${stderr}`);

      // Check for generated PDF
      const pdfFiles = fs.readdirSync(outputDir).filter((f) => f.endsWith(".pdf"));
      console.log(`Found PDF files:`, pdfFiles);
      const latestPdf = pdfFiles.length > 0 ? path.join(outputDir, pdfFiles[0]) : null;

      if (latestPdf && fs.existsSync(latestPdf)) {
        const data = fs.readFileSync(latestPdf);
        await fs.promises.unlink(inputPath).catch((err) => console.error(`Failed to delete ${inputPath}:`, err));
        await fs.promises.unlink(latestPdf).catch((err) => console.error(`Failed to delete ${latestPdf}:`, err));
        console.log(`Successfully converted ${file.originalname} to ${path.basename(latestPdf)}`);
        conversions.push({ data, filename: path.basename(latestPdf) });
      } else {
        console.error(`No PDF found in ${outputDir} for ${file.originalname}`);
        await fs.promises.unlink(inputPath).catch((err) => console.error(`Failed to delete ${inputPath}:`, err));
        throw new Error("Converted PDF not found");
      }
    } catch (err) {
      console.error(`Conversion failed for ${file.originalname}:`, err.message);
      await fs.promises.unlink(inputPath).catch((err) => console.error(`Failed to delete ${inputPath}:`, err));
      continue; // Skip to next file on error
    }
  }

  if (conversions.length > 0) {
    const pdfResponses = conversions.map((conv) => ({
      url: `data:application/pdf;base64,${Buffer.from(conv.data).toString("base64")}`,
      name: conv.filename,
    }));
    res.json(pdfResponses);
  } else {
    res.status(500).send("Conversion failed for all files");
  }
});

export default router;