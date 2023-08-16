import WebSocket, { WebSocketServer } from 'ws';
import ytdl from 'ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import JSZip from 'jszip';
import path from 'path';
import fs from 'fs';

interface WSMessage {
    code: number;
    data: any;
}

export default defineNitroPlugin((nitroApp) => {
    const wss = new WebSocketServer({
        port: 8080
    })
        .on('error', console.error)
        .on('connection', (connection) => onConnection(connection));
})

const onConnection = async (connection: WebSocket): Promise<void> => {
    connection
        .on('error', console.error)
        .on('message', async (message: string) => {
            try {
                const decoded = JSON.parse(message);

                await onMessage(connection, decoded);
            } catch(err) {
                console.error(err);
            }
        });
}

const onMessage = async (connection: WebSocket, message: WSMessage): Promise<void> => {
    if (!message.code || !message.data) return;

    if (message.code === 1) {
        if (!message.data.id || !message.data.format) return;

        let queue = [...Array.isArray(message.data.id) ? message.data.id : [message.data.id]];

        for (const id of queue) {
            await download(id, message.data.format, connection);
        }

        if (queue.length > 1) {
            const zip = new JSZip();

            for (const id of queue) {
                const filePath = path.join(process.cwd(), `/public/${id}.${message.data.format}`);

                const file = await fs.promises.readFile(filePath);

                zip.file(`${id}.${message.data.format}`, file);
            }

            await new Promise<void>((resolve, reject) => {
                zip
                    .generateNodeStream({
                        type: 'nodebuffer',
                        streamFiles: true
                    })
                    .pipe(
                        fs.createWriteStream(path.join(process.cwd(), `/public/${message.data.playlistID}.zip`))
                    )
                    .on('finish', () => {
                        return resolve();
                    });
            })
                .then(async () => {
                    queue = [];

                    const { size } = await fs.promises.stat(path.join(process.cwd(), `/public/${message.data.playlistID}.zip`));

                    return connection.send(
                        JSON.stringify({
                            code: 4,
                            data: {
                                size
                            }
                        })
                    );
                });
        } else {
            queue = [];

            return connection.send(
                JSON.stringify({
                    code: 4
                })
            );
        }
    }
}

const download = (id: string, format: string, connection: WebSocket): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        if (fs.existsSync(path.join(process.cwd(), `/public/${id}.${format}`))) {
            connection.send(
                JSON.stringify({
                    code: 3,
                    data: {
                        id
                    }
                })
            );

            return resolve();
        }

        const formatName = format.toLowerCase() === 'mp3' ? 'mp4' : format.toLowerCase();

        const audio = ytdl(id, {
            quality: 'highestaudio',
            filter: (x) => x.container === formatName
        })
            .on('progress', (segment, current, total) => {
                connection.send(
                    JSON.stringify({
                        code: 2,
                        data: {
                            id,
                            current,
                            total
                        }
                    })
                );
            })
            .on('error', (err) => console.error(err));

        if (format === 'mp3') {
            await new Promise<void>((_resolve, _reject) => {
                ffmpeg(audio)
                    .output(path.join(process.cwd(), `/public/${id}.${format}`))
                    .on('end', (stdout, stderr) => _resolve())
                    .on('error', (err) => _reject(err))
                    .run();
            })
                .then(() => {
                    connection.send(
                        JSON.stringify({
                            code: 3,
                            data: {
                                id
                            }
                        })
                    );

                    return resolve();
                })
                .catch((err) => console.error(err))
        } else {
            const video = ytdl(id, {
                quality: 'highestvideo',
                filter: (x) => x.container === formatName
            })
                .on('progress', (segment, current, total) => {
                    connection.send(
                        JSON.stringify({
                            code: 2,
                            data: {
                                id,
                                current,
                                total
                            }
                        })
                    );
                })
                .on('error', (err) => console.error(err));
    
            await new Promise<void>((_resolve, _reject) => {
                audio.pipe(
                    fs.createWriteStream(path.join(process.cwd(), `/public/.${id}__audio.${formatName}`))
                    .on('finish', async () => {
                        ffmpeg()
                            .input(video)
                            .input(path.join(process.cwd(), `/public/.${id}__audio.${formatName}`))
                            .output(path.join(process.cwd(), `/public/${id}.${format}`))
                            .on('end', (stdout, stderr) => _resolve())
                            .on('error', (err) => _reject(err))
                            .run();
                    })
                );
            })
                .then(async () => {
                    await fs.promises.unlink(path.join(process.cwd(), `/public/.${id}__audio.${formatName}`));

                    connection.send(
                        JSON.stringify({
                            code: 3,
                            data: {
                                id
                            }
                        })
                    );
        
                    return resolve();
                })
                .catch((err) => console.error(err));
        }
    });
}