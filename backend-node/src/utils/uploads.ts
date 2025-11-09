import fs from "fs";
import path from "path";

import { config } from "../config/env";

const uploadRoot = path.resolve(process.cwd(), config.uploads.dir);

export const ensureUploadDir = () => {
  if (!fs.existsSync(uploadRoot)) {
    fs.mkdirSync(uploadRoot, { recursive: true });
  }
};

ensureUploadDir();

export const getUploadRoot = () => uploadRoot;

export const buildPublicUploadPath = (filename: string) =>
  `/uploads/${filename}`;
