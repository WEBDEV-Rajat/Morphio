import express from 'express';
import multer from 'multer';
import pdfPoppler from 'pdf-poppler';
import PptxGenJS from 'pptxgenjs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const router = express.Router();

// Folder paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_FOLDER = path.resolve('Uploads');

// Log folder paths for debugging
console.log('UPLOAD_FOLDER:', UPLOAD_FOLDER);
console.log('Current working directory:', process.cwd());

// Ensure Uploads folder exists
async function ensureFolders() {
  try {
    await fs.mkdir(UPLOAD_FOLDER, { recursive: true });
    console.log(`Ensured Uploads folder exists: ${UPLOAD_FOLDER}`);
  } catch (err) {
    console.error('Error creating Uploads folder:', err);
  }
}

ensureFolders();

// Sanitize filenames to remove special characters
const sanitizeFilename = (filename) => {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_FOLDER);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const sanitizedName = sanitizeFilename(file.originalname);
    cb(null, `${timestamp}_${sanitizedName}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Convert PDF to images using pdf-poppler
async function convertPdfToImages(pdfPath, outputDir, prefix) {
  const options = {
    format: 'png',
    out_dir: outputDir,
    out_prefix: prefix,
    page: null // Convert all pages
  };

  try {
    await pdfPoppler.convert(pdfPath, options);
    console.log(`Successfully converted PDF to images in ${outputDir}`);
    const imageFiles = (await fs.readdir(outputDir))
      .filter(f => f.startsWith(prefix) && f.endsWith('.png'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)[0]);
        const numB = parseInt(b.match(/\d+/)[0]);
        return numA - numB;
      });
    return imageFiles;
  } catch (error) {
    console.error('Error during PDF to image conversion:', error);
    throw error;
  }
}

// Convert images to PPTX using pptxgenjs
async function convertImagesToPptx(imageFiles, outputPath, outputDir) {
  try {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';

    for (const imageFile of imageFiles) {
      const slide = pptx.addSlide();
      const imgPath = path.join(outputDir, imageFile);
      slide.addImage({
        path: imgPath,
        x: 0,
        y: 0,
        w: '100%',
        h: '100%',
        sizing: { type: 'contain', w: '100%', h: '100%' }
      });
      console.log(`Added image to slide: ${imageFile}`);
    }

    await pptx.writeFile({ fileName: outputPath });
    console.log(`PPTX file saved to: ${outputPath}`);
    return true;
  } catch (error) {
    console.error('Error creating PPTX from images:', error);
    throw error;
  }
}

// Main conversion function
async function pdfToPptx(pdfPath, outputPath) {
  try {
    // Verify input PDF exists
    if (!(await fs.access(pdfPath).then(() => true).catch(() => false))) {
      throw new Error(`Input PDF not found: ${pdfPath}`);
    }
    console.log(`Input PDF verified: ${pdfPath}`);

    const outputDir = UPLOAD_FOLDER;
    const prefix = path.basename(pdfPath, path.extname(pdfPath));

    // Convert PDF to images
    const imageFiles = await convertPdfToImages(pdfPath, outputDir, prefix);

    // Convert images to PPTX
    await convertImagesToPptx(imageFiles, outputPath, outputDir);

    // Clean up images
    for (const imageFile of imageFiles) {
      const imgPath = path.join(outputDir, imageFile);
      await fs.unlink(imgPath).catch(err => console.error(`Failed to delete image ${imgPath}:`, err));
    }
    console.log(`Cleaned up temporary images in ${outputDir}`);

    return true;
  } catch (error) {
    console.error('Error in pdfToPptx:', error);
    throw error;
  }
}

// Cleanup old files (older than 24 hours)
async function cleanupOldFiles() {
  try {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    const files = await fs.readdir(UPLOAD_FOLDER);
    for (const file of files) {
      const filePath = path.join(UPLOAD_FOLDER, file);
      const stats = await fs.stat(filePath);
      if (now - stats.mtimeMs > maxAge) {
        console.log(`Preparing to clean up: ${file}, age: ${(now - stats.mtimeMs) / 1000 / 60} minutes`);
        await fs.unlink(filePath);
        console.log(`Cleaned up: ${file}`);
      }
    }
  } catch (error) {
    console.error('Error in cleanup:', error);
  }
}

// Run cleanup every 30 minutes
setInterval(cleanupOldFiles, 30 * 60 * 1000);

// Initial cleanup
cleanupOldFiles();

// Convert endpoint
router.post('/', upload.array('files'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const conversions = [];

    for (const file of req.files) {
      try {
        const inputPath = path.resolve(file.path);
        const fileBaseName = path.parse(file.originalname).name;
        const sanitizedName = sanitizeFilename(fileBaseName);
        const timestamp = Date.now();
        const pptxFilename = `${sanitizedName}_${timestamp}.pptx`;
        const pptxPath = path.join(UPLOAD_FOLDER, pptxFilename);

        console.log(`\n=== Starting conversion for ${file.originalname} ===`);
        console.log(`Input path: ${inputPath}`);
        console.log(`Output path: ${pptxPath}`);

        // Convert PDF to PPTX
        await pdfToPptx(inputPath, pptxPath);

        // Delete uploaded PDF
        await fs.unlink(inputPath).catch((err) => console.error(`Failed to delete ${inputPath}:`, err));

        console.log(`Successfully converted ${file.originalname} to ${pptxFilename}`);
        console.log(`Saved at: ${pptxPath}`);

        conversions.push({
          filename: pptxFilename,
          url: `/Uploads/${pptxFilename}`,
          originalName: `${sanitizedName}.pptx`
        });
      } catch (fileError) {
        console.error(`Conversion failed for ${file.originalname}:`, fileError);
        // Clean up on error
        await fs.unlink(file.path).catch((err) => console.error(`Failed to delete ${file.path}:`, err));
        continue;
      }
    }

    if (conversions.length > 0) {
      const pptxResponses = conversions.map((conv) => ({
        url: conv.url,
        name: conv.filename,
        originalName: conv.originalName
      }));
      console.log(`Sending ${pptxResponses.length} converted PPTXs`);
      console.log('Response:', JSON.stringify(pptxResponses, null, 2));
      res.json(pptxResponses);
    } else {
      res.status(500).json({ error: 'Conversion failed for all files' });
    }
  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({ error: `Conversion failed: ${error.message}` });
  }
});

export default router;