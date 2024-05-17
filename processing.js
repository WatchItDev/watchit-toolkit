
// https://github.com/fluent-ffmpeg/node-fluent-ffmpeg/tree/master



// # TODO add tests
// def get_new_video_quality(video: str) -> str:
//     """
//     Return quality from video file
//     :param video: Path to video file
//     :return video Size
//     :throw InvalidVideoQuality
//     """
//     ffprobe = FFProbe(video)
//     video_size = ffprobe.video_size
//     logger.log.info(f"Current video quality: {video_size}")

//     reversal_sizes = reversed(
//         (
//             (Sizes.Q360, "360p"),
//             (Sizes.Q480, "480p"),
//             (Sizes.Q720, "720p"),
//             (Sizes.Q1080, "1080p"),
//             (Sizes.Q2k, "2k"),
//             (Sizes.Q4k, "4k"),
//         )
//     )

//     matched_new_resolution = next(
//         (eq for res, eq in reversal_sizes if res.width <= video_size.width), None
//     )

//     logger.log.info(f"Match quality: {matched_new_resolution}")
//     if matched_new_resolution:
//         return matched_new_resolution
//     raise InvalidVideoQuality()


// def get_representations(quality) -> list:
//     """
//     Return representation list based on`quality`.
//     Blocked upscale and locked downscale allowed for each defined quality
//     :param quality:
//     :return list of representations based on requested quality
//     """
//     return {
//         "360p": [REPR.R360p],
//         "480p": [REPR.R360p, REPR.R480p],
//         "720p": [REPR.R360p, REPR.R480p, REPR.R720p],
//         "1080p": [REPR.R360p, REPR.R480p, REPR.R720p, REPR.R1080p],
//         "2k": [REPR.R360p, REPR.R480p, REPR.R720p, REPR.R1080p, REPR.R2k],
//         "4k": [REPR.R360p, REPR.R480p, REPR.R720p, REPR.R1080p, REPR.R2k, REPR.R4k],
//     }.get(quality.lower())


// def to_dash(input_file, output_dir) -> str:
//     """
//     Transcode movie file to dash
//     :param input_file: Current file path
//     :param output_dir: New file path
//     :return: new file format dir
//     """
//     video = input(input_file, max_muxing_queue_size=MAX_MUXING_QUEUE_SIZE)
//     quality = get_new_video_quality(input_file)
//     current_format = util.extract_extension(input_file)
//     logger.log.warn(f"Transcoding {current_format} to DASH using VP8 codec")

//     dash = video.dash(Formats.vp8())
//     dash.representations(*get_representations(quality))
//     dash.output(output_dir, monitor=progress)
//     sys.stdout.write("\n")
//     return output_dir


// def to_hls(input_file, output_dir) -> str:
//     """
//     Transcode movie file to hls
//     :param input_file: Current file path
//     :param output_dir: New file path
//     :return: new file format dir
//     """
//     video = input(input_file, max_muxing_queue_size=MAX_MUXING_QUEUE_SIZE)
//     quality = get_new_video_quality(input_file)
//     current_format = util.extract_extension(input_file)
//     logger.log.warn(f"Transcoding {current_format} to HLS using H264 codec")

//     hls = video.hls(Formats.h264(), hls_time=HLS_TIME)
//     hls.representations(*get_representations(quality))
//     hls.output(output_dir, monitor=progress)
//     sys.stdout.write("\n")
//     return output_dir



import moment from 'moment'
import { spawn } from 'node:child_process';



export function hls(params) {

    return new Promise(function (resolve, reject) {

        const {
            input,
            output,
            representations
        } = params

        // The -map option is used to choose which streams from the input(s) should be included in the output(s).
        // https://trac.ffmpeg.org/wiki/Map
        const emptyStreams = new Array(representations.length)
        const filterOutputStreams = emptyStreams.fill(['-map', '0:v:0', '-map', '0:a:0'])

        // setup needed configurations based on stream index
        const configure = representations.reduce((acc, _, index) => {
            return [...acc, [`-c:v:${index}`, 'libx264', `-c:a:${index}`, 'aac']]
        }, [])

        const filters = representations.reduce((acc, repr, index) => {
            const [[w, h], [videoBit, audioBit]] = repr
            // you cannot scale video without reencoding
            const filter = [`-filter:v:${index}`, `scale=w=${w}:h=${h}`, '-maxrate', `${videoBit}k`, `-b:a:${index}`, `${audioBit}k`]
            return [...acc, filter]
        }, [])

        // Map string which specifies how to group the audio, video and subtitle streams into different variant streams.
        // We use to reversed to force the order of the streams, since the representations are in asc order. [480, 720, etc..]
        // example stream map v:0,a:0,name:1080p v:1,a:1,name:480p v:2,a:2,name:720p
        // https://ffmpeg.org/ffmpeg-formats.html
        const streamMap = representations.toReversed().reduce((acc, repr, index) => {
            const [[, h],] = repr
            return `${acc} v:${index},a:${index},name:${h}p`
        }, '')


        //https://trac.ffmpeg.org/wiki/Map
        const inputArgs = [
            ...filterOutputStreams,
            ...configure,
            ...filters
        ].flat()

        const hlsParams = [
            // hls params
            "-master_pl_name", `index.m3u8`,
            "-hls_playlist_type", "vod",
            "-hls_flags", "independent_segments",
            "-hls_list_size", "0",
            '-start_number', '0',
            "-hls_time", "10",
            "-tag:v", "hvc1",

            // https://i.stack.imgur.com/2MPmc.png
            // https://superuser.com/questions/1556953/why-does-preset-veryfast-in-ffmpeg-generate-the-most-compressed-file-compared
            // Using fast saves about 10% encoding time, faster 25%. ultrafast will save 55% at the expense of much lower quality.
            "-preset", "faster",
            '-tune', 'zerolatency',
            // "-threads", "8",

            // Constant Rate Factor: 
            // For x264 your valid range is 0-51.
            // For vpx the range is 4-63.
            // https://trac.ffmpeg.org/wiki/Encode/H.264
            // Tip: If you're looking for an output that is roughly "visually lossless" but not technically lossless, 
            // use a -crf value of around 17 or 18 (you'll have to experiment to see which value is acceptable for you). 
            // It will likely be indistinguishable from the source and not result in a huge, possibly incompatible file like true lossless mode.

            // The range of the quantizer scale is 0-51: where 0 is lossless, 23 is default, and 51 is worst possible. 
            // A lower value is a higher quality and a subjectively sane range is 18-28
            "-crf", '18',
            // var_stream_map is an FFmpeg function that helps us combine the various 
            // video and audio transcodes to create the different HLS playlists.
            "-f", "hls",
            // '-progress', 'pipe:1',
            '-loop', '1',
            '-var_stream_map', streamMap,
            `${output}/%v/index.m3u8`
        ]

        // return new Promise(function (resolve, reject) {
        // -progress pipe:1 send the output to stdout
        const command = ['-i', input, ...inputArgs, ...hlsParams]
        const proc = spawn('ffmpeg', command)

        proc.on('error', (data) => {
            console.log(data.toString())
        })

        proc.stderr.on('data', (data) => {
            console.log(`${data.toString()}`)
        });

        // proc end
        proc.on('exit', () => {
            resolve()
        });
        // })


    })

}


