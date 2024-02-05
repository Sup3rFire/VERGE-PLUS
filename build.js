const asar = require("@electron/asar");
const esbuild = require("esbuild");
const fs = require("fs");

asar.extractAll("app.asar", "dist");

// esbuild --bundle --minify --outdir=dist
fs.appendFileSync("dist/preload.js", esbuild.buildSync({
  bundle: true,
  minify: true,
  entryPoints: [process.argv.at(-1)],
  write: false
}).outputFiles[0].contents);

asar.createPackage("dist/", "out.asar")