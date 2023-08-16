<template>
  <ClientOnly>
    <div class="_display:flex _justify-content:center _align-items:center _flex-direction:column _height:100vh _padding-y:4">
      <!-- Input -->
      <div class="container">
        <IInput
          v-model="url"
          placeholder="Enter a YouTube video or playlist URL"
          :disabled="['loading', 'loadingBoth', 'selectingVideo', 'selectingPlaylist', 'downloading',].includes(state) && !['doneVideo', 'donePlaylist'].includes(state)"
          :clearable="!['loading', 'loadingBoth', 'selectingVideo', 'selectingPlaylist', 'downloading', 'doneVideo', 'donePlaylist'].includes(state)"
        >
          <template #append v-if="url != '' && !['selectingVideo', 'selectingPlaylist', 'downloading'].includes(state)">
            <IButton
              @click="state === 'selectingVideo' ? cancel() : select()"
              :disabled="!validUrl || state === 'loading' || state === 'loadingBoth'"
              :loading="state === 'loading' || state === 'loadingBoth'"
            >
              {{ ['selectingVideo', 'selectingPlaylist'].includes(state) ? 'Cancel' : 'Download' }}
            </IButton>
          </template>
        </IInput>
      </div>

      <!-- Selecting a video -->
      <div class="container _margin-top:1" v-if="state === 'selectingVideo'">
        <ICard>
          <div class="_display:flex">
            <img class="thumbnail _border-radius _margin-right:1" :src="selection.thumbnail" />
            
            <div class="_flex-grow:1">
              <h4 class="_margin-bottom:1/2">{{ selection.title.length > 50 ? `${selection.title.substring(0, 47)}...` : selection.title }}</h4>

              <p class="avatar _margin-bottom:0">
                <img class="_border-radius:50% _margin-right:1/2" :src="selection.author.avatar" />
                <a class="_color:gray" :href="selection.author.url">{{ selection.author.name }}</a>
              </p>

              <div class="_clearfix _margin-top:1">
                <IButton class="_margin-right:1/2" size="sm" @click="download('mp4')">mp4</IButton>
                <IButton class="_margin-right:1/2" size="sm" @click="download('webm')">webm</IButton>
                <IButton class="_margin-right:1/2" size="sm" @click="download('mp3')">mp3</IButton>

                <IButton class="_float:right _margin-right:0" size="sm" @click="cancel()">Cancel</IButton>
              </div>
            </div>
          </div>
        </ICard>
      </div>

        <!-- Selecting a playlist -->
        <div class="container _margin-top:1" v-if="state === 'selectingPlaylist'">
        <ICard>
          <div class="_display:flex">
            <img class="thumbnail _border-radius _margin-right:1" :src="selection.thumbnail" />
            
            <div class="_flex-grow:1">
              <h4 class="_margin-bottom:1/2">{{ selection.title.length > 50 ? `${selection.title.substring(0, 47)}...` : selection.title }}</h4>

              <p class="avatar _margin-bottom:0">
                <img class="_border-radius:50% _margin-right:1/2" :src="selection.author.avatar" />
                <a class="_color:gray" :href="selection.author.url">{{ selection.author.name }}</a>
                &mdash;
                <a class="link _color:primary" @click="selectingPlaylistVideosModal = true">
                  {{ selection.videos.length }} video{{ selection.videos.length > 1 ? 's' : '' }} in playlist
                  {{ queue.filter((x) => x.download).length !== selection.videos.length ? ` (${queue.filter((x) => x.download).length}/${selection.videos.length} selected)` : '' }}
                </a>
              </p>

              <div class="_clearfix _margin-top:1">
                <IButton class="_margin-right:1/2" size="sm" @click="download('mp4')">mp4</IButton>
                <IButton class="_margin-right:1/2" size="sm" @click="download('webm')">webm</IButton>
                <IButton class="_margin-right:1/2" size="sm" @click="download('mp3')">mp3</IButton>

                <IButton class="_float:right _margin-right:0" size="sm" @click="cancel()">Cancel</IButton>
              </div>
            </div>
          </div>
        </ICard>
      </div>

      <!-- Selecting individual playlist videos modal -->
      <IModal v-model="selectingPlaylistVideosModal">
        <p>Select the videos from this playlist to download:</p>

        <div v-for="video in selection.videos" v-bind:key="video.id">
          <ICheckbox class="_margin-bottom:1/4" size="lg" v-model="queue.find((x) => x.id === video.id)!.download">
            <span class="playlist-checkbox _margin-left:1/3">
              {{ video.title }}
              <br />
              <span class="_color:gray">{{ video.author.name }}</span>
            </span>
          </ICheckbox>
        </div>
      </IModal>

      <!-- Downloading video(s) queue -->
      <div class="container _margin-top:1" v-if="['downloading', 'doneVideo', 'donePlaylist'].includes(state)">
        <ICard class="playlist">

          <div v-for="video in queue.filter((x) => x.download)" v-bind:key="video.id" class="_display:flex _margin-bottom:2">
            <img class="small-thumbnail _border-radius _margin-right:1" :src="video.thumbnail" />

            <div class="_flex-grow:1">
              <h5 class="_margin-bottom:1/2">{{ video.title.length > 80 ? `${video.title.substring(0, 77)}...` : video.title }}</h5>

              <div v-if="video.state === 'idle'">
                <p class="_color:gray _margin-bottom:0">Waiting to download...</p>
              </div>

              <div v-if="['downloading', 'done'].includes(video.state)">
                <IProgress :max="video.progress.total">
                  <IProgressBar :value="video.progress.current" :color="video.progress.current === video.progress.total ? 'success' : 'primary'" />
                </IProgress>

                <p v-if="video.state === 'downloading'" class="_color:gray _margin-bottom:0">{{ ((100 * video.progress.current) / video.progress.total).toFixed(0) }}% &mdash; {{ (video.progress.current / (1024 ** 2)).toFixed(1) }} MB of {{ (video.progress.total / (1024 ** 2)).toFixed(1) }} MB</p>
                <p v-if="video.state === 'done'" class="_color:gray _margin-bottom:0">
                  Video downloaded &mdash; 
                  <a :href="`/${video.id}.${format}`" :download="`${video.title}.${format}`">download ({{ (video.progress.total / (1024 ** 2)).toFixed(1) }} MB)</a>
                </p>
              </div>
            </div>
          </div>
          
        </ICard>
      </div>

      <!-- Playlist complete -->
      <div class="container _margin-top:1" v-if="state === 'donePlaylist'">
        <ICard>
            <p>
              Download playlist as a ZIP:
              <a :href="`/${selection.id}.zip`" :download="`${selection.title}.zip`">download ({{ (selection.zipSize / (1024 ** 2)).toFixed(1) }} MB)</a>
            </p>
        </ICard>
      </div>

      <!-- Copyright -->
      <div class="container _margin-top:1">
        <p class="_color:gray _text:center">
          &copy; Anthony Watts
          &mdash; <a class="link _color:primary" @click="cycleColorMode()">{{ colorMode === 'light' ? 'switch to 🌙 Dark Mode' : 'switch to ☀️ Light Mode' }}</a>
        </p>
      </div>

      <!-- Select video/playlist modal -->
      <IModal v-model="selectionModal">
        <p>The provided URL has both a video and playlist. Do you want to download the individual video or the entire playlist?</p>

        <IButton @click="select('video')">Video</IButton>
        <IButton @click="select('playlist')">Playlist</IButton>
        <IButton @click="cancel()">Cancel</IButton>
      </IModal>

      <!-- Playlist length warning modal -->
      <IModal v-model="warningModal">
        <p>The playlist you are trying to download has {{ queue.length > 10 ? 'more than ' : '' }}10 videos in it. Large playlists may take a long time to download, and could cause YouTube to temporarily block your IP address.</p>

        <p>Do you still wish to download the playlist?</p>

        <IButton @click="download(format, true)">Yes</IButton>
        <IButton @click="cancel()">Cancel</IButton>
      </IModal>
    </div>

    <IToastContainer />
  </ClientOnly>
</template>
    
<script lang="ts" setup>
import { useInkline } from '@inkline/inkline';
// @ts-ignore
import { useToast } from '@inkline/inkline/composables';

const inkline = useInkline();
const toast = useToast();
const colorMode = computed<'light' | 'dark'>(() => inkline.options.colorMode);

useHead({
  title: 'YouTube Downloader',
  meta: [
    { name: 'theme-color', content: colorMode.value === 'light' ? '#ffffff' : '#22292A' }
  ]
});

const state: Ref<'idle' | 'loading' | 'loadingBoth' | 'selectingVideo' | 'selectingPlaylist' | 'downloading' | 'doneVideo' | 'donePlaylist'> = ref('idle');
const format: Ref<'mp4' | 'webm' | 'mp3' | ''> = ref('');
const url = ref('');

const selectionModal = ref(false);
const warningModal = ref(false);
const selectingPlaylistVideosModal = ref(false);

const selection: Ref<{
  id: string;
  url: string;
  title: string;
  author: {
    name: string;
    url: string;
    avatar: string;
  };
  thumbnail: string;
  videos: any[];
  zipSize: number;
}> = ref({
  id: '',
  url: '',
  title: '',
  author: { name: '', url: '', avatar: '' },
  thumbnail: '',
  videos: [],
  zipSize: 0
});

const queue: Ref<{
  id: string;
  url: string;
  title: string;
  author: { name: string; url: string; avatar: string; };
  thumbnail: string;
  state: 'idle' | 'downloading' | 'done';
  progress: { current: 0, total: 0 },
  download: boolean
}[]> = ref([]);

// Validates the current URL in the selection input
const validUrl = computed(() => {
  if (!url.value || url.value == '') return false;

  const clean = url.value.replace(/http:\/\//g, '').replace(/https:\/\//g, '').replace(/www\./g, '')
  const split = clean.split('/');

  if (!['youtube.com', 'youtu.be'].includes(split[0].toLowerCase())) return false;

  if (split[0] === 'youtube.com') {
    if (split[1].toLowerCase().startsWith('watch')
      || split[1].toLowerCase().startsWith('playlist')
      || split[1].toLowerCase() === 'embed') return true;
    else return false;
  } else return true;
});

// Select a video/playlist
const select = async (sel: 'video' | 'playlist' | null = null) => {
  format.value = '';
  state.value = sel ? 'loadingBoth' : 'loading';

  const res = await $fetch('/api/metadata', {
    method: 'post',
    body: {
      url: url.value,
      selection: sel || undefined
    }
  });

  if ('error' in res) {
    state.value = 'idle';

    return toast.show({
      title: 'Error',
      message: res.error,
      color: 'danger'
    });
  }

  if (res.type === 'video' && 'id' in res) {
    queue.value = [];

    queue.value.push({
      id: res.id,
      url: url.value,
      title: res.title,
      author: res.author,
      thumbnail: res.thumbnail,
      state: 'idle',
      progress: { current: 0, total: 0 },
      download: true
    });

    selection.value = {
      id: res.id,
      url: url.value,
      title: res.title,
      author: res.author,
      thumbnail: res.thumbnail,
      videos: [],
      zipSize: 0
    }
  
    state.value = 'selectingVideo';
    selectionModal.value = false;
  }

  if (res.type === 'playlist' && 'id' in res && 'videos' in res) {
    queue.value = [];
    
    for (const video of res.videos) {
      queue.value.push({
        id: video.id,
        url: video.url,
        title: video.title,
        author: video.author,
        thumbnail: video.thumbnail,
        state: 'idle',
        progress: { current: 0, total: 0 },
        download: true
      });
    }
    
    selection.value = {
      id: res.id,
      url: url.value,
      title: res.title,
      author: res.author,
      thumbnail: res.thumbnail,
      videos: res.videos,
      zipSize: 0
    }
  
    state.value = 'selectingPlaylist';
    selectionModal.value = false;
  }

  if (res.type === 'both') return selectionModal.value = true;
}

// Download a video/playlist
const download = async (f: 'mp4' | 'webm' | 'mp3' | '', sel = false) => {
  format.value = f;

  if (queue.value.filter((x) => x.download).length > 10 && !sel) {
    return warningModal.value = true;
  }
  
  warningModal.value = false;
  state.value = 'downloading';

  const ws = new WebSocket('ws://localhost:8080');

  ws.onmessage = (raw) => {
    const message = JSON.parse(raw.data);

    if (message.code === 2) {
      const index = queue.value.filter((x) => x.download).findIndex((x) => x.id === message.data.id);
      
      if (index === -1) return toast.show({
        title: 'Error',
        message: 'Index error',
        color: 'danger'
      });

      if (queue.value.filter((x) => x.download)[index].state !== 'downloading') queue.value.filter((x) => x.download)[index].state = 'downloading';

      queue.value.filter((x) => x.download)[index].progress = {
        current: message.data.current,
        total: message.data.total
      }
    }

    if (message.code === 3) {
      const index = queue.value.filter((x) => x.download).findIndex((x) => x.id === message.data.id);
      if (index === -1) return toast.show({
        title: 'Error',
        message: 'Index error',
        color: 'danger'
      });

      queue.value.filter((x) => x.download)[index].state = 'done';

      if (queue.value.length === 1) toast.show({
        title: 'Download complete',
        message: `Video downloaded successfully`,
        color: 'success'
      });
    }

    if (message.code === 4) {
      if (message.data && message.data.size) selection.value.zipSize = message.data.size;

      url.value = '';
      state.value = queue.value.filter((x) => x.download).length > 1 ? 'donePlaylist' : 'doneVideo';

      if (queue.value.filter((x) => x.download).length > 1) toast.show({
        title: 'Download complete',
        message: `${queue.value.filter((x) => x.download).length} videos downloaded successfully`,
        color: 'success'
      });
    }
  }

  ws.onopen = () => {
    let id: string | string[];

    if (queue.value.filter((x) => x.download).length === 1 && queue.value.filter((x) => !x.download).length === 0) id = selection.value.id;
    else if (queue.value.filter((x) => x.download).length === 1 && queue.value.filter((x) => !x.download).length > 0) id = queue.value.filter((x) => x.download)[0].id;
    else id = queue.value.filter((x) => x.download).map((x) => x.id);

    ws.send(
      JSON.stringify({
        code: 1,
        data: {
          id,
          playlistID: queue.value.filter((x) => x.download).length === 1 ? undefined : selection.value.id,
          format: f
        }
      })
    );

    state.value = 'downloading';
  }
}

// Cancel a selection
const cancel = () => {
  url.value = '';
  format.value = '';
  queue.value = [];

  selection.value = {
    id: '',
    url: '',
    title: '',
    author: { name: '', url: '', avatar: '' },
    thumbnail: '',
    videos: [],
    zipSize: 0
  }

  selectionModal.value = false;
  warningModal.value = false;
  
  state.value = 'idle';
}

// Change color mode between light/dark mode
const cycleColorMode = () => inkline.options.colorMode = colorMode.value === 'light' ? 'dark' : 'light';
</script>
    
<style>
.container {
  width: 100%;
  max-width: 800px;
}

.link {
  cursor: pointer;
}

.thumbnail {
  max-width: 200px;
  max-height: 112.5px;
  aspect-ratio: 16 / 9;
}

.small-thumbnail {
  max-width: 120px;
  max-height: 67.5px;
  aspect-ratio: 16 / 9;
}

.avatar {
  color: inherit;
  text-decoration: none;
}

.avatar img {
  max-width: 24px;
  max-height: auto;
  aspect-ratio: 1;
}

.downloader {
  width: 24px;
  height: auto;
}

.playlist {
  max-height: 600px;
  overflow-y: scroll;
}

.playlist-checkbox {
  font-size: 16px;
  line-height: 1.25;
}
</style>