import express from 'express';
import multer from 'multer';
import pdfPoppler from 'pdf-poppler';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Document, Packer, Paragraph, ImageRun } from 'docx';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_FOLDER = path.resolve('Uploads');

console.log('UPLOAD_FOLDER:', UPLOAD_FOLDER);
console.log('Current working directory:', process.cwd());

async function ensureFolders() {
  try {
    await fs.mkdir(UPLOAD_FOLDER, { recursive: true });
    console.log(`Ensured Uploads folder exists: ${UPLOAD_FOLDER}`);
  } catch (err) {
    console.error('Error creating Uploads folder:', err);
  }
}

ensureFolders();

const sanitizeFilename = (filename) => {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
};

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

async function convertPdfToImages(pdfPath, outputDir, prefix) {
  const options = {
    format: 'png',
    out_dir: outputDir,
    out_prefix: prefix,
    page: null 
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

async function convertImagesToWord(imageFiles, outputPath, outputDir) {
  try {
    const paragraphs = [];

    for (const imageFile of imageFiles) {
      const imgPath = path.join(outputDir, imageFile);
      const imageBuffer = await fs.readFile(imgPath);

      paragraphs.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: imageBuffer,
              transformation: {
                width: 600,  
                height: 776  
              }
            })
          ],
          spacing: { after: 0 }  
        })
      );

      console.log(`Added image to Word document: ${imageFile}`);
    }

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 0,
              right: 0,
              bottom: 0,
              left: 0
            }
          }
        },
        children: paragraphs
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    await fs.writeFile(outputPath, buffer);

    console.log(`Word document saved to: ${outputPath}`);
    return true;
  } catch (error) {
    console.error('Error creating Word document from images:', error);
    throw error;
  }
}

async function pdfToWord(pdfPath, outputPath) {
  try {
    if (!(await fs.access(pdfPath).then(() => true).catch(() => false))) {
      throw new Error(`Input PDF not found: ${pdfPath}`);
    }
    console.log(`Input PDF verified: ${pdfPath}`);

    const outputDir = UPLOAD_FOLDER;
    const prefix = path.basename(pdfPath, path.extname(pdfPath));

    const imageFiles = await convertPdfToImages(pdfPath, outputDir, prefix);

    await convertImagesToWord(imageFiles, outputPath, outputDir);

    for (const imageFile of imageFiles) {
      const imgPath = path.join(outputDir, imageFile);
      await fs.unlink(imgPath).catch(err => console.error(`Failed to delete image ${imgPath}:`, err));
    }
    console.log(`Cleaned up temporary images in ${outputDir}`);

    return true;
  } catch (error) {
    console.error('Error in pdfToWord:', error);
    throw error;
  }
}

async function cleanupOldFiles() {
  try {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000;

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

setInterval(cleanupOldFiles, 30 * 60 * 1000);
cleanupOldFiles();

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
        const docxFilename = `${sanitizedName}_${timestamp}.docx`;
        const docxPath = path.join(UPLOAD_FOLDER, docxFilename);

        console.log(`\n=== Starting conversion for ${file.originalname} ===`);
        console.log(`Input path: ${inputPath}`);
        console.log(`Output path: ${docxPath}`);

        await pdfToWord(inputPath, docxPath);

        await fs.unlink(inputPath).catch((err) => console.error(`Failed to delete ${inputPath}:`, err));

        console.log(`Successfully converted ${file.originalname} to ${docxFilename}`);
        console.log(`Saved at: ${docxPath}`);

        conversions.push({
          filename: docxFilename,
          url: `/Uploads/${docxFilename}`,
          originalName: `${sanitizedName}.docx`
        });
      } catch (fileError) {
        console.error(`Conversion failed for ${file.originalname}:`, fileError);
        await fs.unlink(file.path).catch((err) => console.error(`Failed to delete ${file.path}:`, err));
        continue;
      }
    }

    if (conversions.length > 0) {
      const docxResponses = conversions.map((conv) => ({
        url: conv.url,
        name: conv.filename,
        originalName: conv.originalName
      }));
      console.log(`Sending ${docxResponses.length} converted DOCX files`);
      console.log('Response:', JSON.stringify(docxResponses, null, 2));
      res.json(docxResponses);
    } else {
      res.status(500).json({ error: 'Conversion failed for all files' });
    }
  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({ error: `Conversion failed: ${error.message}` });
  }
});

export default router;