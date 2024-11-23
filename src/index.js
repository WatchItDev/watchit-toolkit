import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import mime from 'mime';
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
  480: { width: 854, height: 480, vb: 750, ab: 128, name: "480p", fps: 30 },
  720: { width: 1280, height: 720, vb: 2048, ab: 128, name: "720p", fps: 30 },
  1080: {
    width: 1920,
    height: 1080,
    vb: 4096,
    ab: 128,
    name: "1080p",
    fps: 30,
  },
  2560: {
    width: 2560,
    height: 1440,
    vb: 6144,
    ab: 128,
    name: "1440p",
    fps: 60,
  },
  3840: {
    width: 3840,
    height: 2160,
    vb: 17408,
    ab: 192,
    name: "2160p",
    fps: 60,
  },
};

async function videoProcessing(input, output) {
  const outputDir = path.join(output, "hls");
  const lockFile = path.join(output, 'lock');

  const videoData = await ffprobe({
    input,
  }).catch((err) => {
    console.log(err.toString());
  });

  if (!videoData?.streams?.length) return [false, false];
  if (fs.existsSync(lockFile)) {
    console.log(`Omiting existing`);
    return Promise.resolve([outputDir,  videoData.streams[0]]);
  }

  fs.mkdirSync(outputDir, { recursive: true });
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

  // touch file
  const fd = fs.openSync(lockFile, 'w')
  fs.closeSync(fd);
  return [outputDir, videoData.streams[0]];
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

const sep = {};
const manifests = [];
const processed = new Set();
const MIN_Q = 7.7;

export function* recursivePaths(inputPath) {
  const paths = fs.readdirSync(inputPath, { withFileTypes: true });
  for (const input of paths) {
    const resultingPath = path.join(input.path, input.name);
    if (fs.lstatSync(resultingPath).isDirectory()) {
      yield* recursivePaths(resultingPath);
    } else {
      if ([".mp4", "image.jpg", ".json"].some((i) => input.name.includes(i))) {
        const root = input.path.replace(ROOT_PATH, "").split(path.sep);
        const imdb = root.shift();
        // processed.add(imdb);
        // if (processed.size > 40) return false;


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
    const jsonData = fs.readFileSync(`${ROOT_PATH}/${imdb}/data.json`);
    const output = path.join(CONVERTED_PATH, imdb);

    const jsonObject = JSON.parse(jsonData);
    if (parseFloat(jsonObject?.rating ?? 0) < MIN_Q) {
      console.log(`Omitting ${imdb}`);
      continue;
    }

    fs.mkdirSync(output, { recursive: true });
    if (!(imdb in sep)) {
      sep[imdb] = {
        "s": {},
        "d": {},
        "t": {},
        "x": {}
      };
    }

    if (input.includes(".mp4")) {
      console.log(`Processing video for ${imdb}`);
      const stats = fs.statSync(input);
      const [hlsOutput, videoData] = await videoProcessing(input, output);
      const glob = globSource(hlsOutput, "**/*");
      console.log("Adding processed video");

      sep[imdb]["t"] = {
        "size": stats.size,
        "width": videoData.width,
        "height": videoData.height,
        "length": videoData.duration_ts
      }

      for await (const file of node.addAll(glob, {
        wrapWithDirectory: true,
        cidVersion: 1,
      })) {
        if (file.path == "") {
          sep[imdb]["s"]["cid"] = file.cid.toString();
          sep[imdb]["s"]["path"] = "hls/index.m3u8";
          sep[imdb]["s"]["type"] = mime.getType(path.join(hlsOutput, sep[imdb]["s"]["path"]))
        }
      }
    }

    if (input.includes("image.jpg")) {
      console.log(`Processing image for ${imdb}`);
      sep[imdb]["x"]["attachments"] = [];
      for await (const [key, buffer] of imageProcessing(input, output)) {
        const fileCid = await node.add(buffer, { cidVersion: 1 });
        sep[imdb]["x"]["attachments"].push({
          title: key,
          type: mime.getType(input),
          cid: fileCid.cid.toString(),
          description: "",
        })
      }
    }

    if (input.includes(".json")) {
      console.log(`Processing data for ${imdb}`);

      jsonObject["id"] = jsonObject["imdb_code"];
      jsonObject["trailerUrl"] = jsonObject["trailer_code"];
      jsonObject["genesisDate"] = jsonObject["date_uploaded_unix"];

      delete jsonObject["trailer_code"];
      delete jsonObject["date_uploaded_unix"];
      delete jsonObject["imdb_code"];
      delete jsonObject["resource"];
      delete jsonObject["mpa_rating"];
      delete jsonObject["group_name"];

      sep[imdb]["d"]["title"] = jsonObject["title"];
      sep[imdb]["d"]["description"] = jsonObject["synopsis"];
      sep[imdb]["d"]["genres"] = jsonObject["genres"];
      sep[imdb]["d"]["runtime"] = jsonObject["runtime"];
      sep[imdb]["d"]["year"] = jsonObject["year"];
      // sep[imdb]["x"]["rating"] = jsonObject["rating"];

    }
    
  }

  for(const value of Object.values(sep) ){
    const buffer = JSON.stringify(value);
    const jsonCid = await node.add(buffer, {
      cidVersion: 1,
    });

    manifests.push(jsonCid.cid.toString())
  }


  const manifest = {
    count: manifests.length,
    manifest: manifests,
  };

  const bytes = JSON.stringify(manifest);
  const manifestCid = await node.add(bytes, {
    cidVersion: 1,
    pin: true
  });

  console.log(manifestCid.cid.toString());
  fs.writeFileSync("manifest.json", JSON.stringify(manifest));
} catch (e) {
  console.log(e);
}
