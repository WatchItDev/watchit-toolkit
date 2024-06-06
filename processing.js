import moment from "moment";
import { spawn } from "node:child_process";

export function hls(params) {
  return new Promise(function (resolve, reject) {
    const { input, output, representations } = params;
    const streamsKeys = Object.keys(representations);
    const streamsValues = Object.values(representations);
    const streamsBlocks = streamsKeys.map((i) => `[v${+i + 1}]`);
    let tpl = `[0:v]split=${streamsKeys.length}${streamsBlocks.join("")};`;
    const streams = streamsValues.reduce(
      (acc, curr, i) =>
        (acc += `[v${+i + 1}]scale=-2:${curr.height}[v${+i + 1}out];`),
      tpl
    );

    // Map string which specifies how to group the audio, video and subtitle streams into different variant streams.
    // We use to reversed to force the order of the streams, since the representations are in asc order. [480, 720, etc..]
    // example stream map v:0,a:0,name:1080p v:1,a:1,name:480p v:2,a:2,name:720p
    // https://ffmpeg.org/ffmpeg-formats.html
    const streamMap = representations.reduce((acc, repr, index) => {
      return `${acc} v:${index},a:${index},name:${repr.height}p`;
    }, "");

    let hlsParams = [];

    /**
    ffmpeg -i input.mp4 -filter_complex \
    "[0:v]split=5[v1][v2][v3][v4][v5]; \
     [v1]scale=-2:1080[v1out]; \
     [v2]scale=-2:720[v2out]; \
     [v3]scale=-2:480[v3out]; \
     [v4]scale=-2:360[v4out]; \
     [v5]scale=-2:240[v5out]" \
     -map [v1out] -map a -c:v:0 libx264 -b:v:0 5000k -maxrate:v:0 5350k -bufsize:v:0 7500k -c:a aac -b:a 128k -f hls -hls_time 10 -hls_playlist_type vod -hls_segment_filename "1080p_%03d.ts" 1080p.m3u8 \
     -map [v2out] -map a -c:v:1 libx264 -b:v:1 2800k -maxrate:v:1 2996k -bufsize:v:1 4200k -c:a aac -b:a 128k -f hls -hls_time 10 -hls_playlist_type vod -hls_segment_filename "720p_%03d.ts" 720p.m3u8 \
     -map [v3out] -map a -c:v:2 libx264 -b:v:2 1400k -maxrate:v:2 1498k -bufsize:v:2 2100k -c:a aac -b:a 128k -f hls -hls_time 10 -hls_playlist_type vod -hls_segment_filename "480p_%03d.ts" 480p.m3u8 \
     -map [v4out] -map a -c:v:3 libx264 -b:v:3 800k -maxrate:v:3 856k -bufsize:v:3 1200k -c:a aac -b:a 128k -f hls -hls_time 10 -hls_playlist_type vod -hls_segment_filename "360p_%03d.ts" 360p.m3u8 \
     -map [v5out] -map a -c:v:4 libx264 -b:v:4 400k -maxrate:v:4 428k -bufsize:v:4 600k -c:a aac -b:a 128k -f hls -hls_time 10 -hls_playlist_type vod -hls_segment_filename "240p_%03d.ts" 240p.m3u8 \
     -master_pl_name master.m3u8
    **/

    representations.forEach((res, index) => {
      const keyFrameInterval = res.fps * 2; // Calcula el intervalo de keyframes
      hlsParams.push(
        `-map`,
        `[v${index + 1}out]`,
        `-c:v:${index}`,
        `libx264`,
        '-x264-params', 
        // For live streaming or streaming of content with a high degree of motion, 
        // CBR is the best option, as it provides a more consistent bit rate and image quality. 
        // VBR is more suitable for streaming content with a low degree of motion, such as a podcast, 
        // as it can provide better image quality at a lower bit rate. 
        // https://www.gumlet.com/learn/cbr-vs-vbr/
        'nal-hrd=cbr:force-cfr=1',
        `-b:v:${index}`,
        `${res.vb}k`,
        `-maxrate:v:${index}`,
        `${res.vb}k`,
        `-bufsize:v:${index}`,
        `${res.vb * 2}k`,
        "-g",
        keyFrameInterval.toString(),
        "-keyint_min",
        "48",
        "-map",
        "a:0",
        `-c:a:${index}`,
        "aac",
        `-b:a:${index}`,
        `${res.ab}k`
      );
    });

    hlsParams = hlsParams.concat([
      // hls params
      "-master_pl_name",
      `index.m3u8`,

      // https://i.stack.imgur.com/2MPmc.png
      // https://superuser.com/questions/1556953/why-does-preset-veryfast-in-ffmpeg-generate-the-most-compressed-file-compared
      // Using fast saves about 10% encoding time, faster 25%. ultrafast will save 55% at the expense of much lower quality.
      "-preset",
      "fast",
      // '-tune', 'zerolatency',
      "-threads",
      "4",

      `-ar`,
      "44100",
      "-ac",
      "2",
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
      `-tag:v`,
      "hvc1",
      "-f",
      "hls",
      "-hls_segment_type",
      "mpegts",
      "-hls_segment_filename",
      `${output}/%v_stream_%03d.ts`, // '-progress', 'pipe:1',
      // '-loop', '1',
      `-var_stream_map`,
      streamMap,
      `${output}/%v.m3u8`,
    ]);

    // return new Promise(function (resolve, reject) {
    // -progress pipe:1 send the output to stdout
    const command = ["-y","-i", input, "-filter_complex", streams, ...hlsParams];
    // process.exit()
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
