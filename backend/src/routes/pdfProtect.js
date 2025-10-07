import express from "express";
import multer from "multer";
import { exec } from "child_process";
import path from "path";
import fs from "fs";

const router = express.Router();

const upload = multer({ dest: "uploads/" });

router.post("/", upload.single("file"), (req, res) => {
  const { password } = req.body;
  const file = req.file;

  if (!file || !password) {
    return res.status(400).json({ error: "File and password are required" });
  }

  const outputPath = path.join("uploads", `protected-${Date.now()}.pdf`);
  const userPassword = password; // entered by user
  const ownerPassword = password + "_adm"; // hidden owner password

  const command = `qpdf --encrypt "${userPassword}" "${ownerPassword}" 256 -- "${file.path}" "${outputPath}"`;

  exec(command, (error) => {
    if (error) {
      console.error("Error protecting PDF:", error);
      return res.status(500).json({ error: "Failed to protect PDF" });
    }

    res.download(outputPath, "protected.pdf", (err) => {
      if (err) {
        console.error("Download error:", err);
      }
      fs.unlinkSync(file.path);
    });
  });
});

export default router;
