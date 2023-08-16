# youtube-downloader
YouTube video/playlist downloader

## Features
- Download any (public/unlisted, non age/region restricted) YouTube video or playlist
- Supports multiple formats: video (mp4, webm) and audio (mp3)
- Support for most YouTube video and playlist URL formats
- Select individual videos from playlists to download
- Trim videos before downloading (specify separate start and end times) **(planned feature)**
- Automatically parses `&t=` timestamps in YouTube URLs **(planned feature)**
- Simple, easy to use interface
- Light & dark mode

## Install
This project requires ffmpeg to be installed and set up correctly, as well as Node.js v16 or above.
Instructions for your specific operating system can be found online.

1. Clone the project/download the latest files
2. Install dependencies with `npm install`/`pnpm install`/`yarn`
3. Start using `npm run start`/`pnpm start`/`yarn start`
4. Open [localhost:3000](http://localhost:3000) in your browser

## Credit
(c) 2023 Anthony Watts. Licensed & published under the MIT License.

YouTube is owned by Google, and is not affiliated with this software, nor does it endorse the use of it. Use of this software is at your own risk.

This project was built with the following frameworks and libraries:
- [Vue 3](https://vuejs.org/)
- [Nuxt 3](https://nuxt.com/)
- [Inkline 4](https://www.inkline.io/)
- [websockets/ws](https://github.com/websockets/ws)
- [fent/node-ytdl-core](https://github.com/fent/node-ytdl-core)
- [fluent-ffmpeg/node-fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg)
- [SuspiciousLookingOwl/youtubei](https://github.com/SuspiciousLookingOwl/youtubei)