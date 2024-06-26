import { spawn } from 'node:child_process';

export function ffprobe(params) {
    return new Promise((resolve, reject) => {
        const {
            input
        } = params

        const command = ['-show_streams', '-print_format', 'json', '-select_streams', 'v', '-i', input]
        const proc = spawn('ffprobe', command)
        let output = []

        proc.on('error', (err) => {
            reject(err)
        });

        proc.stdout.on('data', (data) => {
            output.push(data.toString())

        })

        proc.on('close', () => resolve(
            JSON.parse(output.join(''))
        ))

    })
}