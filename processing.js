

import moment from "moment";
import { spawn } from "node:child_process";

export function hls(params) {
  return new Promise(function (resolve, reject) {
    const { input, output, representations } = params;
    const emptyStreams = new Array(Object.keys(representations).length);
    const filterOutputStreams = emptyStreams
      .fill(["-map", "0:v:0", "-map", "0:a:0"])
      .flat();

    const streamMap = representations
      .map((res, index) => `v:${index},a:${index},name:${res.name}`)
      .join(" ");

    const hlsParams = [
      // hls params
      "-master_pl_name",
      `index.m3u8`,
      "-hls_playlist_type",
      "vod",
      "-hls_flags",
      "independent_segments",
      "-hls_list_size",
      "0",
      "-start_number",
      "0",
      "-hls_time",
      "10",
      "-tag:v",
      "hvc1",

      // https://i.stack.imgur.com/2MPmc.png
      // https://superuser.com/questions/1556953/why-does-preset-veryfast-in-ffmpeg-generate-the-most-compressed-file-compared
      // Using fast saves about 10% encoding time, faster 25%. ultrafast will save 55% at the expense of much lower quality.
      "-preset",
      "fast",
      // '-tune', 'zerolatency',
      //   "-threads",
      //   "4",

      `-ar`,
      "44100",

      "-strict",
      "-2",
      // Constant Rate Factor:
      // For x264 your valid range is 0-51.
      // For vpx the range is 4-63.
      // https://trac.ffmpeg.org/wiki/Encode/H.264
      // Tip: If you're looking for an output that is roughly "visually lossless" but not technically lossless,
      // use a -crf value of around 17 or 18 (you'll have to experiment to see which value is acceptable for you).
      // It will likely be indistinguishable from the source and not result in a huge, possibly incompatible file like true lossless mode.

      // The range of the quantizer scale is 0-51: where 0 is lossless, 23 is default, and 51 is worst possible.
      // A lower value is a higher quality and a subjectively sane range is 18-28
      "-crf",
      "23",
      // var_stream_map is an FFmpeg function that helps us combine the various
      // video and audio transcodes to create the different HLS playlists.
      "-f",
      "hls",
      // '-progress', 'pipe:1',
      // '-loop', '1',
      "-var_stream_map",
      streamMap,
      `${output}/%v/index.m3u8`,
    ];

    representations.forEach((res, index) => {
      const keyFrameInterval = res.fps * 2; // Calcula el intervalo de keyframes
      hlsParams.push(
        `-filter:v:${index}`,
        `scale=w=${res.width}:h=${res.height}`,
        `-b:v:${index}`,
        `${res.vb}k`,
        `-b:a:${index}`,
        `${res.ab}k`,
        `-maxrate:v:${index}`,
        `${res.vb}k`,
        `-bufsize:v:${index}`,
        `${res.vb * 2}k`,
        `-c:a:${index}`,
        "aac",
        `-c:v:${index}`,
        "libx265",
        "-g",
        keyFrameInterval.toString() // Ajuste del intervalo de keyframes
      );
    });

    // return new Promise(function (resolve, reject) {
    // -progress pipe:1 send the output to stdout
    const command = ["-i", input, ...filterOutputStreams, ...hlsParams];
    const proc = spawn("ffmpeg", command);

    proc.on("error", (data) => {
      console.log(data.toString());
    });

    proc.stderr.on("data", (data) => {
      console.log(`${data.toString()}`);
    });

    // proc end
    proc.on("exit", () => {
      resolve();
    });
    // })
  });
}
