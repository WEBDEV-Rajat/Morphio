import express from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
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

// Ensure Uploads folder exists and has permissions
async function ensureFolders() {
  try {
    await fs.mkdir(UPLOAD_FOLDER, { recursive: true });
    // Set full permissions for Everyone (Windows)
    await execPromise(`icacls "${UPLOAD_FOLDER}" /grant Everyone:F`);
    console.log(`Ensured Uploads folder exists with full permissions: ${UPLOAD_FOLDER}`);
  } catch (err) {
    console.error('Error creating Uploads folder or setting permissions:', err);
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

// Test LibreOffice availability
async function testLibreOffice() {
  try {
    const sofficePath = `"C:\\Program Files\\LibreOffice\\program\\soffice.exe"`;
    const { stdout } = await execPromise(`${sofficePath} --version`);
    console.log(`LibreOffice version: ${stdout.trim()}`);
    return true;
  } catch (error) {
    console.error('LibreOffice not found or failed to run:', error);
    return false;
  }
}

// Convert PDF to PPTX using LibreOffice
async function pdfToPptx(pdfPath, outputPath) {
  try {
    // Verify input PDF exists
    if (!(await fs.access(pdfPath).then(() => true).catch(() => false))) {
      throw new Error(`Input PDF not found: ${pdfPath}`);
    }
    console.log(`Input PDF verified: ${pdfPath}`);

    // Test LibreOffice
    if (!(await testLibreOffice())) {
      throw new Error('LibreOffice is not installed or inaccessible');
    }

    const sofficePath = `"C:\\Program Files\\LibreOffice\\program\\soffice.exe"`;
    const outputDir = path.dirname(outputPath);
    const inputBaseName = path.parse(path.basename(pdfPath)).name;
    const expectedPptxName = `${inputBaseName}.pptx`;
    const expectedPptxPath = path.join(outputDir, expectedPptxName);

    // Log directory contents before conversion
    console.log(`Files in ${outputDir} before conversion:`, await fs.readdir(outputDir));

    // Clean up existing PPTX if present
    if (await fs.access(expectedPptxPath).then(() => true).catch(() => false)) {
      await fs.unlink(expectedPptxPath);
      console.log(`Removed existing PPTX: ${expectedPptxPath}`);
    }

    // Run LibreOffice conversion with specific filter
    const command = `${sofficePath} --headless --convert-to pptx:impress_msPowerPoint_2007 "${pdfPath}" --outdir "${outputDir}"`;
    console.log(`Running LibreOffice: ${command}`);

    const { stdout, stderr } = await execPromise(command, { timeout: 60000 }); // 60s timeout
    console.log(`LibreOffice stdout: ${stdout}`);
    if (stderr) console.warn(`LibreOffice stderr: ${stderr}`);

    // Wait for file creation
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Log directory contents after conversion
    console.log(`Files in ${outputDir} after conversion:`, await fs.readdir(outputDir));

    // Check for expected PPTX
    if (await fs.access(expectedPptxPath).then(() => true).catch(() => false)) {
      await fs.rename(expectedPptxPath, outputPath);
      console.log(`Renamed PPTX to: ${outputPath}`);
      return true;
    } else {
      // Check for any PPTX files as a fallback
      const files = await fs.readdir(outputDir);
      const pptxFiles = files.filter(f => f.endsWith('.pptx'));
      if (pptxFiles.length > 0) {
        console.log(`Found unexpected PPTX files: ${pptxFiles.join(', ')}`);
        const fallbackPptx = path.join(outputDir, pptxFiles[0]);
        await fs.rename(fallbackPptx, outputPath);
        console.log(`Renamed fallback PPTX to: ${outputPath}`);
        return true;
      } else {
        console.error(`Expected PPTX not found: ${expectedPptxPath}`);
        console.log(`No PPTX files found in ${outputDir}`);
        throw new Error('Converted PPTX not found');
      }
    }
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