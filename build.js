const asar = require("@electron/asar");
const esbuild = require("esbuild");
const fs = require("fs/promises");
const { version } = require("./package.json");
const manifest = require("./src/browser/manifest.json");
manifest.version = version;

(async () => {
  let dir = "dist/browser";
  await fs.mkdir(dir, { recursive: true });
  await Promise.all([
    fs.writeFile(
      dir + "/preload.js",
      esbuild.buildSync({
        bundle: true,
        minify: true,
        entryPoints: ["./src/main.ts"],
        write: false,
        define: {
          VERSION: JSON.stringify(version),
          PLATFORM: JSON.stringify("browser"),
        },
      }).outputFiles[0].contents
    ),
    fs.writeFile(dir + "/manifest.json", JSON.stringify(manifest)),
  ]);
})();

(async () => {
  let dir = "dist/desktop";
  asar.extractAll("src/original.asar", dir);

  // esbuild --bundle --minify --outdir=dist
  await fs.appendFile(dir + "/preload.js", "\n");
  await fs.appendFile(
    dir + "/preload.js",
    esbuild.buildSync({
      bundle: true,
      minify: true,
      entryPoints: ["./src/main.ts"],
      write: false,
      define: {
        VERSION: JSON.stringify(version),
        PLATFORM: JSON.stringify("desktop"),
      },
    }).outputFiles[0].contents
  );

  asar.createPackage(dir, "dist/app.asar");
})();
