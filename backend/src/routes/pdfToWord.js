import express from "express";
import multer from "multer";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
import Tesseract from "tesseract.js";
import { Document, Packer, Paragraph, TextRun, ImageRun } from "docx";
import { createCanvas } from "canvas";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS = path.join(__dirname, "..", "..", "Uploads");
console.log("UPLOADS path:", UPLOADS);

const ensureDir = async (dir) => {
  try {
    await fs.mkdir(dir, { recursive: true });
    console.log(`Ensured directory exists: ${dir}`);
  } catch (err) {
    console.error(`Failed to create directory ${dir}:`, err);
    throw err;
  }
};

ensureDir(UPLOADS);

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS);
  },
  filename: (req, file, cb) => {
    cb(
      null,
      `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_")}`
    );
  },
});

const upload = multer({ storage }).array("files", 10);

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error("Multer error:", err.message, "Field:", err.field);
    console.error("Received fields:", req.body);
    console.error("Received files:", req.files);
    return res
      .status(400)
      .json({
        error: `Multer error: ${err.message}. Expected field name 'files'.`,
      });
  }
  next(err);
};

const extractStyledText = async (page) => {
  const textContent = await page.getTextContent();
  const itemsByY = {};

  textContent.items.forEach((item) => {
    const str = (item.str || "").trim();
    if (!str) return;

    const y = Math.round(item.transform[5]); 
    if (!itemsByY[y]) itemsByY[y] = { items: [], y };
    itemsByY[y].items.push(item);
  });

  const yPositions = Object.keys(itemsByY)
    .map(Number)
    .sort((a, b) => b - a);
  const linesWithY = yPositions
    .map((yPos) => {
      const { items: lineItems, y } = itemsByY[yPos];
      const lineText = lineItems
        .sort((a, b) => a.transform[4] - b.transform[4]) 
        .map((item) => {
          const fontName = item.fontName || "";
          const fontSize = (item.height || 12) * 0.75; 
          const hasBold =
            fontName.toLowerCase().includes("bold") ||
            item.width > item.height * 1.2;
          const hasItalic =
            fontName.toLowerCase().includes("italic") ||
            fontName.toLowerCase().includes("oblique");

          const styledItem = {
            text: (item.str || "").trim(),
            bold: hasBold,
            italic: hasItalic,
            fontSize: Math.round(fontSize),
          };

          console.log(
            `  Extracted: "${styledItem.text}" (bold: ${hasBold}, italic: ${hasItalic}, size: ${styledItem.fontSize}pt)`
          );
          return styledItem;
        })
        .filter((item) => item && item.text && item.text.length > 0);

      console.log(`    Line at y=${y}: ${lineText.length} items`);
      return lineText.length > 0 ? { line: lineText, y } : null; 
    })
    .filter((lineObj) => lineObj !== null); 

  console.log(
    `Page extracted ${
      linesWithY.flatMap((l) => l.line).length
    } text items across ${linesWithY.length} lines`
  );
  return linesWithY; 
};

const ocrPage = async (page) => {
  console.log("Performing OCR on page");
  const viewport = page.getViewport({ scale: 3 });
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext("2d");
  await page.render({ canvasContext: context, viewport }).promise;
  const buffer = canvas.toBuffer("image/png");

  const {
    data: { text },
  } = await Tesseract.recognize(buffer, "eng", {
    logger: (m) =>
      console.log(
        `OCR Progress: ${
          m.status === "recognizing text"
            ? Math.round(m.progress * 100)
            : m.status
        }%`
      ),
  });

  const ocrText = (text || "").trim();
  const ocrItems =
    ocrText.length > 0
      ? [{ text: ocrText, bold: false, italic: false, fontSize: 12 }]
      : [];
  console.log(
    `OCR extracted: "${ocrText.substring(0, 100)}..." (${
      ocrItems.length
    } items)`
  );
  return [{ line: ocrItems, y: 0 }]; 
};

const extractImages = async (page) => {
  const ops = await page.getOperatorList();
  const images = [];

  console.log(`Processing operator list: ${ops.fnArray.length} operations`);

  for (let i = 0; i < ops.fnArray.length; i++) {
    let imgObj = null;
    if (ops.fnArray[i] === OPS.paintImageXObject) {
      const name = ops.argsArray[i][0];
      try {
        imgObj = page.objs.get(name);
      } catch (err) {
        console.warn(`XObject image ${name} unresolved: ${err.message}`);
      }
    } else if (ops.fnArray[i] === OPS.paintInlineImageXObject) {
      imgObj = ops.argsArray[i][0]; 
      console.log(`Found inline image at op ${i}`);
    }

    if (imgObj && imgObj.kind === OPS.image && imgObj.data) {
      const width = imgObj.width || 300;
      const height = imgObj.height || 200;
      const canvas = createCanvas(width, height);
      const context = canvas.getContext("2d");

      const imageData = new ImageData(
        new Uint8ClampedArray(imgObj.data),
        width,
        height
      );
      context.putImageData(imageData, 0, 0);

      const buffer = canvas.toBuffer("image/png");
      images.push(buffer);
      console.log(
        `Extracted image: ${width}x${height} (${buffer.length} bytes)`
      );
    }
  }

  if (images.length === 0) {
    try {
      const textContent = await page.getTextContent();
      if (textContent.items.length === 0) {
        console.log(
          "No text or XObjects - rendering full page as image fallback"
        );
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext("2d");

        await Promise.race([
          page.render({ canvasContext: context, viewport }).promise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Render timeout")), 10000)
          ), 
        ]);

        const buffer = canvas.toBuffer("image/png");
        images.push(buffer);
        console.log(
          `Fallback page image: ${viewport.width}x${viewport.height} (${buffer.length} bytes)`
        );
      } else {
        console.log("Text found but no images - skipping fallback render");
      }
    } catch (renderErr) {
      console.warn(
        `Fallback render failed: ${renderErr.message} - no page image added`
      );
    }
  }

  console.log(`Total images from page: ${images.length}`);
  return images;
};

const buildStyledParagraphs = (styledLinesWithY) => {
  const paragraphs = [];
  let currentPara = [];
  let avgLineHeight = 14; 
  styledLinesWithY.forEach((current, idx) => {
    if (!current || !Array.isArray(current.line) || current.line.length === 0) {
      console.warn(`Skipping invalid line at index ${idx}`);
      return;
    }

    const gap = idx > 0 ? Math.abs(styledLinesWithY[idx - 1].y - current.y) : 0;
    const isNewPara = gap > avgLineHeight * 1.2; 

    console.log(
      `  Line ${idx + 1} y-gap: ${gap.toFixed(
        1
      )}px (avg height: ${avgLineHeight.toFixed(1)}px) - New para? ${isNewPara}`
    );

    if (isNewPara && currentPara.length > 0) {
      paragraphs.push(buildParagraph(currentPara));
      currentPara = [];
    }

    currentPara.push(current.line);
    avgLineHeight = Math.max(
      avgLineHeight,
      ...current.line.map((item) => item.fontSize || 12)
    );
  });

  if (currentPara.length > 0) {
    paragraphs.push(buildParagraph(currentPara));
  }

  if (paragraphs.length < styledLinesWithY.length / 2) {
    console.log(
      "Sparse paragraphs detected - using per-line paragraphs for spacing"
    );
    paragraphs.length = 0; // Clear and rebuild
    styledLinesWithY.forEach(({ line }) =>
      paragraphs.push(buildParagraph([line]))
    );
  }

  console.log(
    `Built ${paragraphs.length} paragraphs from ${styledLinesWithY.length} lines`
  );
  return paragraphs.length > 0
    ? paragraphs
    : [buildFallbackParagraph(styledLinesWithY)];
};

const buildParagraph = (paraLines) => {
  const allItems = paraLines.flat(); 
  const validItems = allItems.filter(
    (item) =>
      item &&
      typeof item === "object" &&
      typeof item.text === "string" &&
      item.text.length > 0
  );

  if (validItems.length === 0) {
    console.warn("No valid items in paragraph - skipping");
    return new Paragraph({ children: [] });
  }

  console.log(`  Building paragraph with ${validItems.length} valid items`);

  const children = validItems
    .map((item) => {
      const safeText = (item.text || "").trim();
      if (!safeText) {
        console.warn(`Skipping item with empty text:`, item);
        return null;
      }

      const run = new TextRun({
        text: safeText,
        bold: !!item.bold,
        italics: !!item.italic,
        size: (item.fontSize || 12) * 2,
      });
      return run;
    })
    .filter((run) => run !== null);

  return new Paragraph({
    children,
    spacing: { after: 200 },
  });
};

const buildFallbackParagraph = (allLinesWithY) => {
  console.log("Using fallback single paragraph");
  const allItems = allLinesWithY.flatMap((obj) => obj.line).flat();
  const validItems = allItems.filter(
    (item) =>
      item &&
      typeof item === "object" &&
      typeof item.text === "string" &&
      item.text.length > 0
  );
  const flatText = validItems.map((item) => item.text || "").join(" ");
  return new Paragraph({
    children: flatText ? [new TextRun({ text: flatText, size: 24 })] : [],
    spacing: { after: 200 },
  });
};

router.post("/", (req, res, next) => {
  console.log("Received POST request to /api/convert/pdf-to-word");
  console.log("Request headers:", req.headers);
  console.log("Request body (before multer):", req.body);
  upload(req, res, async (err) => {
    if (err) return handleMulterError(err, req, res, next);

    try {
      console.log("Files received:", req.files);
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const convertedFiles = [];

      for (const file of req.files) {
        console.log(`\n=== Processing file: ${file.originalname} ===`);
        const inputPath = file.path;
        let allStyledLinesWithY = []; 
        let allPageImages = [];

        try {
          const loadingTask = getDocument(inputPath);
          const pdf = await loadingTask.promise;

          let textDensity = 0;
          const samplePages = Math.min(3, pdf.numPages);

          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            console.log(`\n--- Page ${pageNum} ---`);
            const page = await pdf.getPage(pageNum);

            let pageStyledLinesWithY = await extractStyledText(page);

            if (
              !pageStyledLinesWithY ||
              pageStyledLinesWithY.length === 0 ||
              pageStyledLinesWithY.every(
                (obj) => !Array.isArray(obj.line) || obj.line.length === 0
              )
            ) {
              console.log(`No text found on page ${pageNum}, performing OCR`);
              pageStyledLinesWithY = await ocrPage(page);
            }

            allStyledLinesWithY =
              allStyledLinesWithY.concat(pageStyledLinesWithY); 

            const pageImages = await extractImages(page);
            allPageImages.push(...pageImages);

            if (pageNum <= samplePages) {
              textDensity += pageStyledLinesWithY.flatMap(
                (obj) => obj.line
              ).length;
            }
          }

          console.log(
            `Total extracted: ${
              allStyledLinesWithY.flatMap((obj) => obj.line).length
            } styled items across ${allStyledLinesWithY.length} lines`
          );

          const avgDensity = textDensity / samplePages;
          if (avgDensity < 5) {
            console.log(
              `Low text density detected (${avgDensity.toFixed(
                1
              )} items/page). Re-processing all pages with OCR.`
            );
            allStyledLinesWithY = [];
            const loadingTaskRetry = getDocument(inputPath);
            const pdfRetry = await loadingTaskRetry.promise;
            for (let pageNum = 1; pageNum <= pdfRetry.numPages; pageNum++) {
              const page = await pdfRetry.getPage(pageNum);
              const ocrResult = await ocrPage(page); 
              allStyledLinesWithY = allStyledLinesWithY.concat(ocrResult);
            }
          }

          const paragraphs = buildStyledParagraphs(allStyledLinesWithY);

          if (allPageImages.length > 0) {
            allPageImages.forEach((imageBuffer) => {
              paragraphs.push(
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: imageBuffer,
                      transformation: {
                        width: 500, 
                        height: 300, 
                      },
                    }),
                  ],
                  spacing: { after: 200 },
                })
              );
            });
          } else {
            console.log("No images extracted from PDF");
          }

          const doc = new Document({
            sections: [
              {
                children: paragraphs,
              },
            ],
          });

          const buffer = await Packer.toBuffer(doc);

          const outputFilename =
            file.originalname.replace(/\.[^/.]+$/, "") + ".docx";
          const uniqueFilename = `converted_${Date.now()}_${outputFilename.replace(
            /[^a-zA-Z0-9.-]/g,
            "_"
          )}`;
          const outputPath = path.join(UPLOADS, uniqueFilename);

          try {
            await fs.writeFile(outputPath, buffer);
            console.log(
              `Saved converted file: ${outputPath} (${buffer.length} bytes)`
            );
            if (
              await fs
                .access(outputPath)
                .then(() => true)
                .catch(() => false)
            ) {
              console.log(`File confirmed at: ${outputPath}`);
            } else {
              throw new Error(`File not found after writing: ${outputPath}`);
            }
          } catch (writeErr) {
            console.error(`Error writing file ${outputPath}:`, writeErr);
            throw writeErr;
          }

          convertedFiles.push({
            name: outputFilename,
            url: `/Uploads/${uniqueFilename}`,
          });
        } catch (err) {
          console.error(`Error processing file ${file.originalname}:`, err);
          throw err;
        } finally {
          if (
            await fs
              .access(inputPath)
              .then(() => true)
              .catch(() => false)
          ) {
            await fs.unlink(inputPath);
            console.log(`Cleaned up input file: ${inputPath}`);
          }
        }
      }

      console.log("Sending response:", convertedFiles);
      res.json(convertedFiles);
    } catch (err) {
      console.error("Error processing files:", err);

      if (req.files) {
        await Promise.all(
          req.files.map(async (file) => {
            if (
              await fs
                .access(file.path)
                .then(() => true)
                .catch(() => false)
            ) {
              await fs.unlink(file.path);
              console.log(`Cleaned up file on error: ${file.path}`);
            }
          })
        );
      }
      res
        .status(500)
        .json({ error: `PDF -> Word conversion failed: ${err.message}` });
    }
  });
});

export default router;
