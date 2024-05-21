import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

import { create, globSource } from "kubo-rpc-client";
import { ffprobe } from "./introspection.js";
import { hls } from "./processing.js";

const node = await create();
const ROOT_PATH = "/media/gmena/bigexternal/raw/";
const CONVERTED_PATH = ROOT_PATH.replace("raw", "encoded");

// class Sizes:
//     Q480 = Size(854, 480)
//     Q720 = Size(1280, 720)
//     Q1080 = Size(1920, 1080)
//     Q2k = Size(2560, 1440)
//     Q4k = Size(3840, 2160)

// class BRS:
//     B480 = Bitrate(750 * 1024, 192 * 1024)
//     B720 = Bitrate(2048 * 1024, 320 * 1024)
//     B1080 = Bitrate(4096 * 1024, 320 * 1024)
//     B2k = Bitrate(6144 * 1024, 320 * 1024)
//     B4k = Bitrate(17408 * 1024, 320 * 1024)

// class REPR:
//     R360p = Representation(Sizes.Q360, BRS.B360)
//     R480p = Representation(Sizes.Q480, BRS.B480)
//     R720p = Representation(Sizes.Q720, BRS.B720)
//     R1080p = Representation(Sizes.Q1080, BRS.B1080)
//     R2k = Representation(Sizes.Q2k, BRS.B2k)
//     R4k = Representation(Sizes.Q4k, BRS.B4k)

const images = {
  small: [45, 67],
  medium: [230, 345],
  large: [500, 750],
};

const representation = {
  // [[width, height], [video kb bitrate, audiokb  bitrate]]
  480: [
    [854, 480],
    [750, 192],
  ],
  720: [
    [1280, 720],
    [2048, 320],
  ],
  1080: [
    [1920, 1080],
    [4096, 320],
  ],
  2560: [
    [2560, 1440],
    [6144, 320],
  ],
  3840: [
    [3840, 2160],
    [17408, 320],
  ],
};

async function videoProcessing(input, output) {
  const outputDir = path.join(output, "hls");
  const expectIndexFile = path.join(outputDir, "index.m3u8");

  if (fs.existsSync(expectIndexFile)) {
    console.log(`Omiting existing`);
    return Promise.resolve(outputDir);
  }

  const videoData = await ffprobe({
    input,
  }).catch((err) => {
    console.log(err.toString());
  });

  if (!videoData?.streams?.length) return false;
  const { width } = videoData.streams[0];
  const allowed = Object.keys(representation).reduce((acc, curr) => {
    if (curr <= width) acc.push(representation[curr]);
    return acc;
  }, []);

  await hls({
    input,
    output: outputDir,
    representations: allowed,
  });

  return outputDir;
}

async function* imageProcessing(input, output) {
  for (const key in images) {
    const [w, h] = images[key];
    const fileOut = path.join(output, `${key}.jpg`);
    const sharpen = sharp(input).resize(w, h);
    const imageBytes = await sharpen.toBuffer();
    await sharpen.toFile(fileOut);

    yield [key, imageBytes];
  }
}

const cidCollections = {};
const processed = new Set()

function* recursivePaths(inputPath) {
  const paths = fs.readdirSync(inputPath, { withFileTypes: true });
  for (const input of paths) {
    const resultingPath = path.join(input.path, input.name);
    if (fs.lstatSync(resultingPath).isDirectory()) {
      yield* recursivePaths(resultingPath);
    } else {
      if ([".mp4", "image.jpg", ".json"].some((i) => input.name.includes(i))) {
        const root = input.path.replace(ROOT_PATH, "").split(path.sep);
        const imdb = root.shift();
        processed.add(imdb)
        // if (Object.keys(cidCollections).length > 10) return;
        if (processed.size <= 10) continue;
        yield {
          imdb,
          path: resultingPath,
        };
      }
    }
  }
}

try {
  for (const dir of recursivePaths(ROOT_PATH)) {
    const { imdb, path: input } = dir;
    const output = path.join(CONVERTED_PATH, imdb);

    if (!(imdb in cidCollections)) {
      cidCollections[imdb] = {
        images: {},
      };
    }

    if (input.includes(".mp4")) {
      console.log(`Processing video for ${imdb}`);
      const hlsOutput = await videoProcessing(input, output);
      const glob = globSource(hlsOutput, "**/*");

      for await (const file of node.addAll(glob, {
        wrapWithDirectory: true,
        cidVersion: 1,
      })) {
        if (file.path == "") {
          cidCollections[imdb]["video"] = file.cid.toString();
        }
      }
    }

    if (input.includes("image.jpg")) {
      console.log(`Processing image for ${imdb}`);
      for await (const [key, buffer] of imageProcessing(input, output)) {
        const fileCid = await node.add(buffer, { cidVersion: 1 });
        cidCollections[imdb]["images"][key] = fileCid.cid.toString();
      }
    }

    if (input.includes(".json")) {
      console.log(`Processing data for ${imdb}`);
      if (!fs.existsSync(output)) fs.mkdirSync(output);
      fs.copyFileSync(input, `${output}/data.json`);

      const jsonData = fs.readFileSync(`${output}/data.json`);
      const jsonObject = JSON.parse(jsonData);

      jsonObject["id"] = jsonObject["imdb_code"];
      jsonObject["trailerUrl"] = jsonObject["trailer_code"];
      jsonObject["genesisDate"] = jsonObject["date_uploaded_unix"];

      delete jsonObject["trailer_code"];
      delete jsonObject["date_uploaded_unix"];
      delete jsonObject["imdb_code"];
      delete jsonObject["resource"];
      delete jsonObject["mpa_rating"];
      delete jsonObject["group_name"];

      const buffer = JSON.stringify(jsonObject);
      const jsonCid = await node.add(buffer, {
        cidVersion: 1,
      });

      cidCollections[imdb]["data"] = jsonCid.cid.toString();
    }
  }

  const manifest = {
    count: Object.keys(cidCollections).length,
    manifest: Object.values(cidCollections),
  };

  const bytes = JSON.stringify(manifest);
  const manifestCid = await node.add(bytes, {
    cidVersion: 1,
  });

  console.log(manifestCid.cid.toString());
  fs.writeFileSync("manifest.json", JSON.stringify(manifest));
} catch (e) {
  console.log(e);
}
