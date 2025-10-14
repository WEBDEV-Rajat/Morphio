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
  limits: { fileSize: 100 * 1024 * 1024 }
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
    const timestamp = Date.now();
    
    console.log(`\n=== Starting conversion for ${file.originalname} ===`);
    console.log(`Input path: ${inputPath}`);
    console.log(`Output dir: ${outputDir}`);

    const sofficePath = `"C:\\Program Files\\LibreOffice\\program\\soffice.exe"`;
    
    const expectedPdfName = `${path.parse(file.filename).name}.pdf`;
    const expectedPdfPath = path.join(outputDir, expectedPdfName);
    const finalPdfName = `${fileBaseName}_${timestamp}.pdf`;
    const finalPdfPath = path.join(outputDir, finalPdfName);
    
    const command = `${sofficePath} --headless --convert-to pdf "${inputPath}" --outdir "${outputDir}"`;

    try {
      if (fs.existsSync(expectedPdfPath)) {
        await fs.promises.unlink(expectedPdfPath);
      }

      const { stdout, stderr } = await execPromise(command);

      console.log(`Command stdout: ${stdout}`);
      if (stderr) console.error(`Command stderr: ${stderr}`);

      await new Promise(resolve => setTimeout(resolve, 100));

      if (fs.existsSync(expectedPdfPath)) {
        fs.renameSync(expectedPdfPath, finalPdfPath);
        
        await fs.promises.unlink(inputPath).catch((err) => 
          console.error(`Failed to delete ${inputPath}:`, err)
        );
        
        console.log(`Successfully converted ${file.originalname} to ${finalPdfName}`);
        console.log(`Saved at: ${finalPdfPath}`);
        
        conversions.push({ 
          filename: finalPdfName,
          url: `/uploads/${finalPdfName}`
        });
      } else {
        console.error(`Expected PDF not found: ${expectedPdfPath}`);
        console.log(`Available files in ${outputDir}:`, fs.readdirSync(outputDir));
        
        await fs.promises.unlink(inputPath).catch((err) => 
          console.error(`Failed to delete ${inputPath}:`, err)
        );
        throw new Error("Converted PDF not found");
      }
    } catch (err) {
      console.error(`Conversion failed for ${file.originalname}:`, err.message);
      await fs.promises.unlink(inputPath).catch((err) => 
        console.error(`Failed to delete ${inputPath}:`, err)
      );
      continue; 
    }
  }

  if (conversions.length > 0) {
    const pdfResponses = conversions.map((conv) => ({
      url: conv.url,
      name: conv.filename,
    }));
    console.log(`Sending ${pdfResponses.length} converted PDFs`);
    res.json(pdfResponses);
  } else {
    res.status(500).send("Conversion failed for all files");
  }
});

export default router;