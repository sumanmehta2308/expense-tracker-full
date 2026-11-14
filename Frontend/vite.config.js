import { defineConfig } from "vite";
import { resolve } from "path";
import fs from "fs";

const htmlFiles = fs.readdirSync(__dirname)
  .filter((file) => file.endsWith(".html"))
  .reduce((entries, file) => {
    const name = file.replace(/\.html$/, "");
    entries[name] = resolve(__dirname, file);
    return entries;
  }, {});

export default defineConfig({
  build: {
    rollupOptions: {
      input: htmlFiles,
    },
  },
});
