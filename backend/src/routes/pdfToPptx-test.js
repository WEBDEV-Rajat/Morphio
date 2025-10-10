import express from 'express';
import multer from 'multer';
import PptxGenJS from 'pptxgenjs';
import fs from 'fs/promises';
import path from 'path';
import PDFParser from 'pdf2json';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import util from 'util';

const execPromise = util.promisify(exec);
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

// Group text runs into paragraphs based on proximity
function groupTextRuns(texts, yThreshold = 1.5, fontThreshold = 2) {
  if (!texts || texts.length === 0) return [];

  // Sort texts by y-coordinate, then x-coordinate
  texts.sort((a, b) => a.y - b.y || a.x - b.x);

  const paragraphs = [];
  let currentParagraph = { texts: [], xMin: Infinity, yMin: Infinity, fontSize: null };

  for (const text of texts) {
    if (!text.text.trim()) continue;

    if (!currentParagraph.texts.length) {
      // Start new paragraph
      currentParagraph.texts.push(text.text);
      currentParagraph.xMin = text.x;
      currentParagraph.yMin = text.y;
      currentParagraph.fontSize = text.fontSize;
    } else {
      // Check if text belongs to current paragraph
      const yDiff = Math.abs(text.y - currentParagraph.yMin);
      const fontDiff = Math.abs(text.fontSize - currentParagraph.fontSize);
      const isSameLine = yDiff < yThreshold && fontDiff < fontThreshold;

      if (isSameLine) {
        // Append to current paragraph
        currentParagraph.texts.push(text.text);
        currentParagraph.xMin = Math.min(currentParagraph.xMin, text.x);
        currentParagraph.yMin = Math.min(currentParagraph.yMin, text.y);
      } else {
        // Finalize current paragraph and start new one
        paragraphs.push({
          text: currentParagraph.texts.join(' '),
          x: currentParagraph.xMin,
          y: currentParagraph.yMin,
          fontSize: currentParagraph.fontSize
        });
        currentParagraph = {
          texts: [text.text],
          xMin: text.x,
          yMin: text.y,
          fontSize: text.fontSize
        };
      }
    }
  }

  // Push the last paragraph
  if (currentParagraph.texts.length) {
    paragraphs.push({
      text: currentParagraph.texts.join(' '),
      x: currentParagraph.xMin,
      y: currentParagraph.yMin,
      fontSize: currentParagraph.fontSize
    });
  }

  return paragraphs;
}

// Parse PDF for text and coordinates
async function parsePdfText(pdfPath) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    const pageData = [];

    pdfParser.on('pdfParser_dataError', errData => {
      console.error('PDF parsing error:', errData.parserError);
      reject(errData.parserError);
    });

    pdfParser.on('pdfParser_dataReady', pdfData => {
      for (const page of pdfData.Pages) {
        const texts = [];
        for (const text of page.Texts) {
          const decodedText = decodeURIComponent(text.R[0].T);
          const x = text.x;
          const y = text.y;
          const fontSize = text.R[0].TS ? text.R[0].TS[1] : 12;
          texts.push({ text: decodedText, x, y, fontSize });
        }
        pageData.push(groupTextRuns(texts));
      }
      console.log(`Parsed ${pageData.length} pages with ${pageData.reduce((sum, p) => sum + p.length, 0)} text blocks`);
      resolve(pageData);
    });

    pdfParser.loadPDF(pdfPath);
  });
}

// Convert PDF to PPTX (editable text + fallback images)
async function pdfToPptx(pdfPath, outputPath) {
  try {
    const tempDir = path.join(UPLOAD_FOLDER, 'temp_images');
    await fs.mkdir(tempDir, { recursive: true });

    // Parse PDF text
    let pageTexts;
    try {
      pageTexts = await parsePdfText(pdfPath);
    } catch (parseError) {
      console.warn('Text parsing failed, falling back to images:', parseError);
      pageTexts = [];
    }

    // Use Ghostscript to convert PDF pages to PNG as a fallback
    let imageFiles = [];
    try {
      let gsCommand = 'gswin64c'; // Change to 'gswin32c' for 32-bit
      const gsPath = 'C:\\Program Files\\gs\\gs10.06.0\\bin\\gswin64c.exe'; // Adjust to your Ghostscript path

      try {
        await execPromise(`${gsCommand} -h`);
      } catch {
        console.warn('Ghostscript command not found in PATH, using full path');
        gsCommand = gsPath;
      }

      const gsOutput = path.join(tempDir, 'page-%03d.png');
      const command = `"${gsCommand}" -sDEVICE=png16m -dTextAlphaBits=4 -dGraphicsAlphaBits=4 -r200 -dNOPAUSE -dBATCH -sOutputFile="${gsOutput}" "${pdfPath}"`;
      console.log(`Running Ghostscript: ${command}`);

      await execPromise(command);
      console.log(`Converted PDF to images in ${tempDir}`);
      imageFiles = (await fs.readdir(tempDir)).filter(f => f.endsWith('.png')).sort();
    } catch (gsError) {
      console.error('Ghostscript error:', gsError);
    }

    // Create PPTX
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';

    // PDF page dimensions (in points, assuming standard letter size 8.5x11 inches)
    const pdfPageWidth = 8.5 * 72; // 612 points
    const pdfPageHeight = 11 * 72; // 792 points
    const pptxWidth = 10; // PPTX slide width in inches (16:9 default)
    const pptxHeight = 5.625; // PPTX slide height in inches

    // Scaling factors to map PDF coordinates to PPTX
    const xScale = pptxWidth / pdfPageWidth;
    const yScale = pptxHeight / pdfPageHeight;

    for (let i = 0; i < Math.max(pageTexts.length, imageFiles.length); i++) {
      const slide = pptx.addSlide();
      const texts = pageTexts[i] || [];
      let hasText = false;

      // Add editable text boxes if text is available
      if (texts.length > 0) {
        for (const { text, x, y, fontSize } of texts) {
          if (text.trim()) {
            hasText = true;
            slide.addText(text, {
              x: x * xScale,
              y: y * yScale,
              w: '90%',
              h: (fontSize * yScale * 0.2) + 0.2, // Increased height for better readability
              fontSize: Math.round(fontSize * 0.75), // Adjust font size
              color: '000000',
              align: 'left',
              valign: 'top',
              autoFit: true // Enable text auto-fitting
            });
            console.log(`Added text block to slide ${i + 1}: "${text.slice(0, 50)}..." at x:${(x * xScale).toFixed(2)}, y:${(y * yScale).toFixed(2)}`);
          }
        }
      }

      // Fallback to image if no text or parsing failed
      if (!hasText && imageFiles[i]) {
        const imagePath = path.join(tempDir, imageFiles[i]);
        slide.addImage({
          path: imagePath,
          x: 0,
          y: 0,
          w: '100%',
          h: '100%',
          sizing: { type: 'contain', w: '100%', h: '100%' }
        });
        console.log(`Added image fallback for slide ${i + 1}: ${imageFiles[i]}`);
      } else if (!hasText) {
        slide.addText('No content extracted for this page', {
          x: 0.5,
          y: 2.5,
          w: '90%',
          h: 1,
          fontSize: 18,
          color: 'FF0000',
          align: 'center'
        });
        console.log(`No content for slide ${i + 1}, added placeholder text`);
      }
    }

    // Save PPTX
    await pptx.writeFile({ fileName: outputPath });
    console.log(`PPTX file saved to: ${outputPath}`);

    // Clean up temporary images
    await fs.rm(tempDir, { recursive: true, force: true });
    console.log(`Cleaned up temporary images in ${tempDir}`);

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

    // Cleanup Uploads folder
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

// Initial cleanup on startup
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