import { Client } from 'youtubei';

const youtube = new Client();

/**
 * Validate and parse a YouTube link
 * @param link The link to validate and parse video/playlist ID from
 * @returns A Promise that resolves with video and/or playlist IDs, or rejects with reason if the link is invalid
 */
const parseYouTubeLink = async (link: string): Promise<{ videoId: string | undefined, playlistId: string | undefined }> => {
    return new Promise((resolve, reject) => {
        const clean = link.replace(/http:\/\//g, '').replace(/https:\/\//g, '').replace(/www\./g, '')
        const split = clean.split('/');
        if (!['youtube.com', 'youtu.be'].includes(split[0].toLowerCase())) return reject('Not a youtube.com or youtu.be link');

        if (split[0] === 'youtube.com') {
            if (split[1].toLowerCase().startsWith('watch') || split[1].toLowerCase().startsWith('playlist')) {
                const query = `?${split[1].split('?')[1]}`;
                const params = new URLSearchParams(query);
                const result: { videoId: string | undefined, playlistId: string | undefined } = { videoId: undefined, playlistId: undefined }

                if (params.has('v')) result.videoId = params.get('v') ?? undefined;
                if (params.has('list')) result.playlistId = params.get('list') ?? undefined;

                return resolve(result);
            } else if (split[1].toLowerCase() === 'embed') return resolve({ videoId: split[2], playlistId: undefined });
            else return reject('Not a watch, playlist or embed link');
        } else return resolve({ videoId: split[1], playlistId: undefined });
    });
}

export default defineEventHandler(async (event) => {
    const { url, selection } = await readBody(event);
    if (!url) return { error: 'No URL' }

    try {
        const { videoId, playlistId } = await parseYouTubeLink(url);

        const type = videoId && !playlistId ? 'video' : (playlistId && !videoId ? 'playlist' : 'both');
        if (!videoId && !playlistId) return { error: 'Couldn\'t extract video or playlist ID from YouTube URL' }

        if ((type === 'video' || (type === 'both' && selection === 'video')) && videoId) {
            const video = await youtube.getVideo(videoId);
            if (!video) return { error: 'Couldn\'t find YouTube video' }
    
            const thumbnail = 'thumbnails' in video ? video.thumbnails.sort((a, b) => a.height - b.height)[video.thumbnails.length - 1].url : 'missingThumbnail';
            
            const author = 'channel' in video && video.channel !== undefined ? {
                name: video.channel.name,
                url: `https://www.youtube.com/channel/${video.channel.id}`,
                avatar: video.channel.thumbnails
                    ? video.channel.thumbnails.sort((a, b) => a.height - b.height)[video.channel.thumbnails.length - 1].url
                    : '/missingAvatar.png'
            } : undefined;
        
            return {
                type: 'video',
                id: videoId,
                title: video.title,
                author,
                thumbnail
            }
        } else if ((type === 'playlist' || (type === 'both' && selection === 'playlist')) && playlistId) {
            const playlist = await youtube.getPlaylist(playlistId);
            if (!playlist) return { error: 'Couldn\'t find YouTube playlist' }
            if (playlist.videoCount === 0 || !('items' in playlist.videos)) return { error: 'YouTube playlist contains no videos' }
    
            const thumbnail = 'thumbnails' in playlist ? playlist.thumbnails.sort((a, b) => a.height - b.height)[playlist.thumbnails.length - 1].url : 'missingThumbnail.png';
    
            const author = 'channel' in playlist && playlist.channel !== undefined ? {
                name: playlist.channel.name,
                url: `https://www.youtube.com/channel/${playlist.channel.id}`,
                avatar: playlist.channel.thumbnails
                    ? playlist.channel.thumbnails.sort((a, b) => a.height - b.height)[playlist.channel.thumbnails.length - 1].url
                    : '/missingAvatar.png'
            } : undefined;

            if (playlist.videos.items.length !== playlist.videoCount) return { error: 'Mismatch between videos.items.length and videoCount' }

            return {
                type: 'playlist',
                id: playlistId,
                title: playlist.title,
                author,
                thumbnail,
                videos: playlist.videos.items.map((x) => {
                    const videoThumbnail = 'thumbnails' in x ? x.thumbnails.sort((a, b) => a.height - b.height)[x.thumbnails.length - 1].url : 'missingThumbnail.png';

                    const videoAuthor = 'channel' in x && x.channel !== undefined ? {
                        name: x.channel.name,
                        url: `https://www.youtube.com/channel/${x.channel.id}`,
                        avatar: x.channel.thumbnails
                            ? x.channel.thumbnails.sort((a, b) => a.height - b.height)[x.channel.thumbnails.length - 1].url
                            : '/missingAvatar.png'
                    } : undefined;

                    return {
                        id: x.id,
                        url: `https://www.youtube.com/watch?v=${x.id}`,
                        title: x.title,
                        author: videoAuthor,
                        thumbnail: videoThumbnail
                    }
                })
            }
        } else if (type === 'both' && videoId && playlistId && !selection) return { type }
    } catch(err: any) {
        if (['Not a youtube.com or youtu.be link', 'Not a watch, playlist or embed link'].includes(err.toString())) return { error: `Invalid YouTube URL (${err.toString()})` }
        else return { error: `Unknown error (${err.toString()})` }
    }
});