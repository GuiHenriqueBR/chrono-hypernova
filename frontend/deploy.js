import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Possible locations for vite binary (handling hoisting and different environments)
const possiblePaths = [
  path.join(__dirname, "node_modules", "vite", "bin", "vite.js"), // Local
  path.join(__dirname, "..", "node_modules", "vite", "bin", "vite.js"), // Root (monorepo)
  path.join(__dirname, "..", "..", "node_modules", "vite", "bin", "vite.js"), // Deep root
];

// Find the first path that exists
const vitePath = possiblePaths.find((p) => fs.existsSync(p));

if (!vitePath) {
  console.error(
    "Build script: Could not find vite.js in any of the following locations:"
  );
  possiblePaths.forEach((p) => console.error(` - ${p}`));
  process.exit(1);
}

console.log("Build script: Found vite at", vitePath);

try {
  // Spawn a new node process to run vite
  // inherit stdio to see output/colors
  const child = spawn(process.execPath, [vitePath, "build"], {
    stdio: "inherit",
    cwd: __dirname, // Run in current directory (frontend)
  });

  child.on("close", (code) => {
    console.log(`Build script: Vite exited with code ${code}`);
    process.exit(code);
  });

  child.on("error", (err) => {
    console.error("Build script: Failed to start vite process", err);
    process.exit(1);
  });
} catch (error) {
  console.error("Build script: Unexpected error.", error);
  process.exit(1);
}
