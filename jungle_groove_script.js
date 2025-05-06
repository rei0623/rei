// jungle_groove_script.js

// jungle_groove_script.js
console.log("jungle_groove_script.js parsing started. Waiting for YouTube API...");

// ==========================================================================
// YouTube Player API Ready Callback (MUST BE GLOBAL)
// ==========================================================================
function onYouTubeIframeAPIReadyJG() {
    console.log("GLOBAL onYouTubeIframeAPIReadyJG CALLED BY YOUTUBE API SCRIPT!");
    if (!elementsJG.youtubePlayerContainer) {
        console.error("onYouTubeIframeAPIReadyJG: elementsJG.youtubePlayerContainer is not yet initialized or found! Ensure initializeElementsJG runs before this or DOM is ready.");
        // Attempt to initialize elements if not done, though ideally DOMContentLoaded handles this.
        if (Object.keys(elementsJG).length === 0) { // Check if elementsJG is empty
            initializeElementsJG();
        }
        if (!elementsJG.youtubePlayerContainer) { // Re-check after potential init
             console.error("onYouTubeIframeAPIReadyJG: Still no youtubePlayerContainer after re-check. Player cannot be created.");
             return;
        }
    }
    console.log("onYouTubeIframeAPIReadyJG: youtubePlayerContainer found:", elementsJG.youtubePlayerContainer);

    try {
        appStateJG.player = new YT.Player(elementsJG.youtubePlayerContainer.id, {
            height: '1',
            width: '1',
            playerVars: {
                'autoplay': 0,
                'controls': 0,
                'playsinline': 1,
                'origin': window.location.origin // Important for security with postMessage API
            },
            events: {
                'onReady': onPlayerReadyJG,
                'onStateChange': onPlayerStateChangeJG,
                'onError': onPlayerErrorJG
            }
        });
        console.log("onYouTubeIframeAPIReadyJG: YT.Player instance creation attempted.");
    } catch (e) {
        console.error("onYouTubeIframeAPIReadyJG: Error creating YT.Player instance:", e);
        showSnackbarJG("YouTubeプレイヤーの作成に失敗しました。", "error");
    }
}
// Make sure this function is globally accessible
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReadyJG;

// ==========================================================================
// Constants & State
// ==========================================================================
const MAX_HISTORY_JG = 20;
const VOLUME_STEP_JG = 5;
const SEEK_STEP_JG = 5; // seconds
const LS_KEYS_JG = {
    HISTORY: 'jungleGrooveHistory',
    FAVORITES: 'jungleGrooveFavorites',
    PLAYLISTS: 'jungleGroovePlaylists', // If you implement playlists
    USER: 'jungleGrooveUser',
    THEME: 'jungleGrooveTheme', // For Day/Night mode
    QUEUE: 'jungleGrooveQueue'
};

const appStateJG = {
    player: null,
    songs: [],
    filteredSongs: [],
    currentSongIndex: -1,
    isPlaying: false,
    isShuffle: false,
    loopMode: 'none', // 'none', 'one', 'all'
    currentPanel: 'log-library', // Default panel
    volume: 75,
    progressInterval: null,
    history: [],
    favorites: [],
    userPlaylists: [], // Future use
    queue: [],
    currentQueueIndex: -1,
    playMode: 'library', // 'library' or 'queue'
    isPlayerReady: false,
    snackbarTimeoutId: null,
    activeModalId: null, // For potential future modals
    currentTheme: 'dark', // 'dark' (jungle night) or 'light' (jungle day)
};

let elementsJG = {}; // Will be populated by initializeElementsJG

// ==========================================================================
// Element Initialization
// ==========================================================================
function initializeElementsJG() {
    elementsJG = {
        body: document.body,
        // Header
        searchInput: document.getElementById('animal-tracker'),
        themeToggle: document.getElementById('weather-toggle'),
        profileButton: document.getElementById('profile-ranger'),
        // Player "Watering Hole"
        mainAlbumArt: document.getElementById('main-album-art-jg'),
        songTitleDisplay: document.getElementById('song-title-jg'),
        artistNameDisplay: document.getElementById('artist-name-jg'),
        btnShuffle: document.getElementById('btn-shuffle-jg'),
        btnPrev: document.getElementById('btn-prev-jg'),
        btnPlay: document.getElementById('btn-play-jg'),
        btnNext: document.getElementById('btn-next-jg'),
        btnLoop: document.getElementById('btn-loop-jg'),
        currentTimeDisplay: document.getElementById('current-time-jg'),
        totalTimeDisplay: document.getElementById('total-time-jg'),
        progressSlider: document.getElementById('progress-slider-jg'),
        volumeSlider: document.getElementById('volume-slider-jg'),
        volumeIconMute: document.querySelector('.volume-fruit-jg .fa-volume-mute'),
        volumeIconUp: document.querySelector('.volume-fruit-jg .fa-volume-up'),
        // Explorer's Log (Right Panel)
        logTabs: document.querySelectorAll('.log-tab-jg'),
        logPanels: document.querySelectorAll('.log-panel-jg'),
        libraryPanel: document.getElementById('log-library'),
        queuePanel: document.getElementById('log-discoveries'),
        favoritesPanel: document.getElementById('log-trophies'),
        historyPanel: document.getElementById('log-history'), // Corrected ID based on typical naming
        playlistsPanel: document.getElementById('log-paths'), // Added reference for playlists
        queueCountBadge: document.getElementById('queue-count-jg'),
        youtubePlayerContainer: null,
    };

    let ytContainer = document.getElementById('youtube-player-container-jg');
    if (!ytContainer) {
        ytContainer = document.createElement('div');
        ytContainer.id = 'youtube-player-container-jg';
        ytContainer.style.position = 'absolute'; // Ensure it doesn't affect layout
        ytContainer.style.top = '-9999px';
        ytContainer.style.left = '-9999px';
        ytContainer.style.width = '1px';
        ytContainer.style.height = '1px';
        document.body.appendChild(ytContainer);
    }
    elementsJG.youtubePlayerContainer = ytContainer;

    console.log("Jungle Groove Elements Initialized:", elementsJG);
}

// ==========================================================================
// YouTube API & Song Loading
// ==========================================================================
const youtubeAPI_JG = {
    apiKey: 'AIzaSyCbzvjP9vFa5I8N1qLI5H9LUpYim0nkQS4', // API Key set
    channelId: 'UCYAuSEKhuk3v4ZKzm5Lqb1Q',

    async getLatestVideos(maxResults = 15) {
        if (!this.apiKey || this.apiKey === 'YOUR_YOUTUBE_API_KEY_HERE') { // Keep this check in case key is removed later
            console.error("YouTube API Key is not set!");
            showSnackbarJG("YouTube APIキーが設定されていません。", "error");
            return [];
        }
        try {
            const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${this.channelId}&maxResults=${maxResults}&order=date&type=video&key=${this.apiKey}`);
            if (!response.ok) {
                 const errorData = await response.json().catch(() => null);
                 const errorMessage = errorData?.error?.message || `YouTube API error: ${response.status}`;
                 console.error(errorMessage);
                 throw new Error(errorMessage);
            }
            const data = await response.json();
            if (!data.items) return [];
            return data.items.map(item => ({
                id: item.id.videoId,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
                duration: "--:--" // Will be updated by player
            }));
        } catch (error) {
            console.error('Error fetching videos:', error);
            showSnackbarJG(`曲の読み込みに失敗しました: ${error.message}`, "error");
            return [];
        }
    },
     async getVideoDetails(videoIds) { // Function to get duration
        if (!videoIds || videoIds.length === 0) return {};
        try {
            const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds.join(',')}&key=${this.apiKey}`);
            if (!response.ok) throw new Error(`YouTube Video Details API error: ${response.status}`);
            const data = await response.json();
            const details = {};
            data.items.forEach(item => {
                details[item.id] = this.convertDuration(item.contentDetails.duration);
            });
            return details;
        } catch (error) {
            console.error('Error fetching video details:', error);
            return {};
        }
    },
    convertDuration(isoDuration) {
        const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
        const matches = isoDuration.match(regex);
        if (!matches) return '--:--';
        const hours = parseInt(matches[1] || 0);
        const minutes = parseInt(matches[2] || 0);
        const seconds = parseInt(matches[3] || 0);
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
};

async function loadInitialSongsJG() {
    if (!elementsJG.libraryPanel) {
        console.error("Library panel element not found for loading songs.");
        return;
    }
    showLoadingInPanelJG(elementsJG.libraryPanel, true);
    let songs = await youtubeAPI_JG.getLatestVideos(25); // Fetch more initially

    if (songs.length > 0) {
        const videoIds = songs.map(s => s.id);
        const durations = await youtubeAPI_JG.getVideoDetails(videoIds);
        songs = songs.map(song => ({
            ...song,
            duration: durations[song.id] || "--:--"
        }));
    }

    appStateJG.songs = songs;
    appStateJG.filteredSongs = [...songs]; // Initially, filtered is same as all
    renderSongListJG(elementsJG.libraryPanel, appStateJG.filteredSongs, 'library');
    showLoadingInPanelJG(elementsJG.libraryPanel, false);

    if (songs.length === 0 && (!youtubeAPI_JG.apiKey || youtubeAPI_JG.apiKey === 'YOUR_YOUTUBE_API_KEY_HERE')) { // Re-check API key
         showEmptyMessageInPanelJG(elementsJG.libraryPanel, "APIキーが必要です", "曲をロードするにはAPIキーを設定してください。");
    } else if (songs.length === 0) {
        showEmptyMessageInPanelJG(elementsJG.libraryPanel, "まだ曲がありません", "新しい冒険が始まるのを待とう！");
    }
}

// ==========================================================================
// UI Rendering
// ==========================================================================
function renderSongListJG(panelElement, songsToRender, context) {
    if (!panelElement) {
        console.warn(`Panel element for context "${context}" not found.`);
        return;
    }
    panelElement.innerHTML = '';

    if (!songsToRender || songsToRender.length === 0) {
        let emptyTitle = "何も見つからない...";
        let emptyMessage = "このエリアにはまだ何もないようだ。";
        if (context === 'library' && appStateJG.searchInput?.value) {
            emptyTitle = "検索結果なし";
            emptyMessage = `「${escapeHTMLJG(appStateJG.searchInput.value)}」に合う冒険は見つからなかった...`;
        } else if (context === 'queue') {
            emptyTitle = "キューは空っぽ";
            emptyMessage = "次の冒険の準備をしよう！";
        } else if (context === 'favorites') {
            emptyTitle = "お気に入りの宝物なし";
            emptyMessage = "まだお気に入りの発見がないようだ。曲の羽アイコンをクリック！";
        } else if (context === 'history') {
            emptyTitle = "足跡なし";
            emptyMessage = "まだどの曲も探検していないようだ。";
        }
        showEmptyMessageInPanelJG(panelElement, emptyTitle, emptyMessage);
        return;
    }

    const fragment = document.createDocumentFragment();
    songsToRender.forEach(song => {
        if (!song || !song.id) { // Ensure song object and id exist
            console.warn("Skipping invalid song object in renderSongListJG:", song);
            return;
        }
        const originalSongIndex = appStateJG.songs.findIndex(s => s.id === song.id); // Get index from the master list
        const isActive = appStateJG.currentSongIndex === originalSongIndex;
        const isFavorited = appStateJG.favorites.some(fav => fav.id === song.id);

        const entry = document.createElement('div');
        entry.className = `log-entry-jg ${isActive ? 'active-song' : ''}`;
        entry.dataset.id = song.id;
        entry.dataset.index = originalSongIndex; // Use original index

        entry.innerHTML = `
            <img src="${song.thumbnail || 'placeholder_thumb_generic.png'}" alt="${escapeHTMLJG(song.title || '')}">
            <div>
                <span class="title">${escapeHTMLJG(song.title || '不明なタイトル')}</span>
                <span class="artist">Rei Kikuchi</span>
            </div>
            <span class="duration">${song.duration || '--:--'}</span>
            <button class="song-item-action-jg" aria-label="${isFavorited ? 'お気に入りから削除' : 'お気に入りに追加'}">
                <i class="fas ${isFavorited ? 'fa-heart text-jg-accent-sunburst' : 'fa-feather-alt'}"></i>
            </button>
        `;

        entry.addEventListener('click', (e) => {
            const clickedButton = e.target.closest('.song-item-action-jg');
            if (clickedButton) {
                toggleFavoriteJG(song.id, clickedButton.querySelector('i'));
            } else {
                playSongAtIndexJG(originalSongIndex); // Use originalSongIndex here
            }
        });
        fragment.appendChild(entry);
    });
    panelElement.appendChild(fragment);
}
// ... (keep showLoadingInPanelJG and showEmptyMessageInPanelJG as they are) ...
function showLoadingInPanelJG(panelElement, isLoading) {
    if (!panelElement) return;
    if (isLoading) {
        panelElement.innerHTML = `<div class="flex justify-center items-center h-full text-jg-text-shadow"><i class="fas fa-spinner fa-spin fa-2x"></i><p class="ml-2">探検中...</p></div>`;
    }
}

function showEmptyMessageInPanelJG(panelElement, title, message) {
    if (!panelElement) return;
    panelElement.innerHTML = `
        <div class="text-center p-8 text-jg-text-shadow">
            <i class="fas fa-map-marked-alt fa-3x mb-4 opacity-50"></i>
            <h4 class="font-display-jg text-xl text-jg-text-earth mb-2">${escapeHTMLJG(title)}</h4>
            <p class="text-sm">${escapeHTMLJG(message)}</p>
        </div>`;
}
function updatePlayerUIGJ(song) {
    const playerElement = document.querySelector('.watering-hole-player');
    if (song) {
        elementsJG.mainAlbumArt.src = song.thumbnail || 'placeholder_jungle_album.png';
        elementsJG.songTitleDisplay.textContent = song.title || "Wild Rhythms";
        elementsJG.artistNameDisplay.textContent = "Rei Kikuchi"; // Or dynamic
        playerElement?.classList.add('has-song');
    } else {
        elementsJG.mainAlbumArt.src = 'placeholder_jungle_album.png';
        elementsJG.songTitleDisplay.textContent = "Wild Rhythms";
        elementsJG.artistNameDisplay.textContent = "The Jungle Cats";
        elementsJG.currentTimeDisplay.textContent = "0:00";
        elementsJG.totalTimeDisplay.textContent = "0:00";
        elementsJG.progressSlider.value = 0;
        playerElement?.classList.remove('has-song');
    }
    updatePlayPauseButtonJG();
    updateActiveListItemJG();
}

function updatePlayPauseButtonJG() {
    if (!elementsJG.btnPlay) return;
    const iconClass = appStateJG.isPlaying ? 'fa-pause' : 'fa-play';
    elementsJG.btnPlay.innerHTML = `<i class="fas ${iconClass}"></i>`;
    document.querySelector('.watering-hole-player')?.classList.toggle('is-playing', appStateJG.isPlaying);
}

function updateActiveListItemJG() {
    document.querySelectorAll('.log-entry-jg.active-song').forEach(el => el.classList.remove('active-song'));
    if (appStateJG.currentSongIndex !== -1 && appStateJG.currentSongIndex < appStateJG.songs.length) {
        const currentSongId = appStateJG.songs[appStateJG.currentSongIndex]?.id;
        if (currentSongId) {
            const activeItem = document.querySelector(`.log-entry-jg[data-id="${currentSongId}"]`);
            activeItem?.classList.add('active-song');
        }
    }
}

// ==========================================================================
// Player Controls (No major changes, just ensure IDs are correct)
// ==========================================================================
function playSongAtIndexJG(index) {
    if (index < 0 || index >= appStateJG.songs.length) {
        console.warn("Invalid song index:", index);
        return;
    }
    appStateJG.currentSongIndex = index;
    const song = appStateJG.songs[index];
    if (!song) {
        console.error("Song not found at index:", index);
        return;
    }

    updatePlayerUIGJ(song);

    if (appStateJG.player && appStateJG.isPlayerReady && song.id) {
        try {
            appStateJG.player.loadVideoById(song.id);
        } catch (error) {
            console.error("Error loading video in player:", error);
            showSnackbarJG("動画の読み込みに失敗しました。", "error");
        }
    }
    addToHistoryJG(song);
    if (appStateJG.currentPanel === 'log-history') renderHistoryListJG();
}

function togglePlayPauseJG() {
    if (!appStateJG.player || !appStateJG.isPlayerReady) {
         showSnackbarJG("プレイヤーの準備ができていません。", "warning");
        return;
    }
    if (appStateJG.currentSongIndex === -1 && appStateJG.songs.length > 0) {
        playSongAtIndexJG(0);
        return;
    }
    if (appStateJG.currentSongIndex === -1 && appStateJG.songs.length === 0) {
        showSnackbarJG("再生する曲がありません。", "info");
        return;
    }

    if (appStateJG.isPlaying) {
        appStateJG.player.pauseVideo();
    } else {
        appStateJG.player.playVideo();
    }
}
// ... (playNextJG, playPrevJG, handleSongEndJG, updateProgressJG are mostly fine, ensure element IDs if changed)
function playNextJG() {
    if (appStateJG.songs.length === 0) return;
    let nextIndex = appStateJG.currentSongIndex;

    if (appStateJG.isShuffle) {
        if (appStateJG.songs.length <= 1) nextIndex = 0;
        else do { nextIndex = Math.floor(Math.random() * appStateJG.songs.length); } while (nextIndex === appStateJG.currentSongIndex && appStateJG.songs.length > 1);
    } else {
        nextIndex = (appStateJG.currentSongIndex + 1);
        if (nextIndex >= appStateJG.songs.length) { // End of playlist
            if (appStateJG.loopMode === 'all') nextIndex = 0; // Loop all
            else { // Loop none or one (one is handled in songEnd)
                showSnackbarJG("探検の終わりです！", "info");
                appStateJG.isPlaying = false;
                updatePlayPauseButtonJG();
                // Optionally reset player UI here
                return;
            }
        }
    }
    playSongAtIndexJG(nextIndex);
}

function playPrevJG() {
    if (appStateJG.songs.length === 0) return;
    if (appStateJG.player && appStateJG.player.getCurrentTime && appStateJG.player.getCurrentTime() > 3) {
        appStateJG.player.seekTo(0);
        return;
    }
    let prevIndex = appStateJG.currentSongIndex;
    if (appStateJG.isShuffle) {
         if (appStateJG.songs.length <= 1) prevIndex = 0;
         else do { prevIndex = Math.floor(Math.random() * appStateJG.songs.length); } while (prevIndex === appStateJG.currentSongIndex && appStateJG.songs.length > 1);
    } else {
        prevIndex = (appStateJG.currentSongIndex - 1 + appStateJG.songs.length) % appStateJG.songs.length;
    }
    playSongAtIndexJG(prevIndex);
}

function handleSongEndJG() {
    if (appStateJG.loopMode === 'one') {
        playSongAtIndexJG(appStateJG.currentSongIndex);
    } else if (appStateJG.playMode === 'queue' && appStateJG.queue.length > 0) {
        appStateJG.currentQueueIndex++;
        if (appStateJG.currentQueueIndex < appStateJG.queue.length) {
            const nextSongIdInQueue = appStateJG.queue[appStateJG.currentQueueIndex];
            const originalIndex = appStateJG.songs.findIndex(s => s.id === nextSongIdInQueue);
            if (originalIndex !== -1) playSongAtIndexJG(originalIndex);
            else playNextJG(); // Fallback if song not found
        } else { // End of queue
            if (appStateJG.loopMode === 'all') { // If loop all, restart queue or play next from library
                 appStateJG.currentQueueIndex = -1; // Reset queue play
                 playNextJG(); // Or specific logic to restart queue
            } else {
                showSnackbarJG("キューの再生が終わりました。", "info");
                appStateJG.isPlaying = false;
                updatePlayPauseButtonJG();
            }
        }
    }
    else if (appStateJG.loopMode === 'all' || (appStateJG.loopMode === 'none' && appStateJG.currentSongIndex < appStateJG.songs.length - 1) ) {
        playNextJG();
    } else { // LoopMode 'none' and at the end of the list
        appStateJG.isPlaying = false;
        updatePlayPauseButtonJG();
        showSnackbarJG("探検の終わりです！", "info");
        // Optionally reset player UI or show a "playlist ended" message
    }
}

function updateProgressJG() {
    if (!appStateJG.player || typeof appStateJG.player.getDuration !== 'function' || !elementsJG.progressSlider) return;
    const currentTime = appStateJG.player.getCurrentTime() || 0;
    const duration = appStateJG.player.getDuration() || 0;

    if (duration > 0) {
        const progressPercent = (currentTime / duration) * 100;
        elementsJG.progressSlider.value = progressPercent;
        elementsJG.currentTimeDisplay.textContent = formatTimeJG(currentTime);
        elementsJG.totalTimeDisplay.textContent = formatTimeJG(duration);

        const currentSong = appStateJG.songs[appStateJG.currentSongIndex];
        if (currentSong && currentSong.duration === "--:--") {
            currentSong.duration = formatTimeJG(duration);
            // Re-render the specific item if duration was updated
            const itemInList = elementsJG.libraryPanel.querySelector(`.log-entry-jg[data-id="${currentSong.id}"] .duration`);
            if(itemInList) itemInList.textContent = currentSong.duration;
        }
    } else {
        elementsJG.progressSlider.value = 0;
        elementsJG.currentTimeDisplay.textContent = "0:00";
        // elementsJG.totalTimeDisplay.textContent = "0:00"; // Keep existing duration if known
    }
}
// ==========================================================================
// YouTube Player Event Handlers
// ==========================================================================
function onYouTubeIframeAPIReadyJG() {
    if (!elementsJG.youtubePlayerContainer) {
        console.error("YouTube Player container div not found for Jungle Groove.");
        return;
    }
    try {
        appStateJG.player = new YT.Player(elementsJG.youtubePlayerContainer.id, {
            height: '1', // Minimal size for hidden player
            width: '1',
            playerVars: { 'autoplay': 0, 'controls': 0, 'playsinline': 1, 'origin': window.location.origin },
            events: {
                'onReady': onPlayerReadyJG,
                'onStateChange': onPlayerStateChangeJG,
                'onError': onPlayerErrorJG
            }
        });
    } catch (e) {
        console.error("Failed to initialize YouTube player:", e);
        showSnackbarJG("YouTubeプレイヤーの初期化に失敗しました。", "error");
    }
}

// ==========================================================================
// YouTube Player Event Handlers
// ==========================================================================
// ... (onYouTubeIframeAPIReadyJG is now at the top of the file) ...

function onPlayerReadyJG(event) {
    console.log("Jungle Groove Player Ready! (onPlayerReadyJG called). Player object:", event.target);
    appStateJG.isPlayerReady = true;
    if (event.target && typeof event.target.setVolume === 'function') {
        try {
            event.target.setVolume(appStateJG.volume);
            console.log("onPlayerReadyJG: Volume set to", appStateJG.volume);
        } catch(e){
            console.warn("onPlayerReadyJG: Could not set volume on ready", e);
        }
    } else {
        console.warn("onPlayerReadyJG: event.target or setVolume not available.");
    }

    // APIキーのチェックをここでも行う
    const apiKey = youtubeAPI_JG.apiKey; // Get it once
    if (apiKey && apiKey !== 'YOUR_YOUTUBE_API_KEY_HERE' && apiKey !== 'AIzaSyCbzvjP9vFa5I8N1qLI5H9LUpYim0nkQS4_PLACEHOLDER_IF_YOU_USED_ONE') { // Add any other placeholders you might have used
        console.log("onPlayerReadyJG: API Key seems to be set. Calling loadInitialSongsJG...");
        loadInitialSongsJG();
    } else {
        console.error("onPlayerReadyJG: API Key is missing or still a placeholder! API Key found:", apiKey);
        showSnackbarJG("APIキーが正しく設定されていません。曲をロードできません。", "error");
        if (elementsJG.libraryPanel) { // Check if panel exists before showing message
            showEmptyMessageInPanelJG(elementsJG.libraryPanel, "APIキー未設定", "曲をロードするには、スクリプト内のAPIキーを有効なものに置き換えてください。");
        } else {
            console.error("onPlayerReadyJG: Library panel not found to display API key error message.");
        }
    }
}


function onPlayerStateChangeJG(event) {
    const playerState = event.data;
    const previouslyPlaying = appStateJG.isPlaying;
    appStateJG.isPlaying = (playerState === YT.PlayerState.PLAYING);

    if (previouslyPlaying !== appStateJG.isPlaying) {
        updatePlayPauseButtonJG();
    }

    if (appStateJG.isPlaying) {
        if (appStateJG.progressInterval) clearInterval(appStateJG.progressInterval);
        appStateJG.progressInterval = setInterval(updateProgressJG, 250);
        updateProgressJG();
    } else {
        clearInterval(appStateJG.progressInterval);
        // Ensure progress is updated one last time when paused or buffered
        if (playerState === YT.PlayerState.PAUSED || playerState === YT.PlayerState.BUFFERING) {
            updateProgressJG();
        }
    }

    if (playerState === YT.PlayerState.ENDED) {
        handleSongEndJG();
    }
}

function onPlayerErrorJG(event) {
    console.error("Jungle Groove Player Error:", event.data);
    let msg = "動画の再生エラー";
    if (event.data === 2) msg = "無効な動画IDです。";
    if (event.data === 5) msg = "HTML5プレイヤーエラー。";
    if (event.data === 100) msg = "動画が見つかりません。";
    if (event.data === 101 || event.data === 150) msg = "埋め込み再生が許可されていません。";
    showSnackbarJG(msg, "error");
    appStateJG.isPlaying = false;
    updatePlayPauseButtonJG();
}

// ==========================================================================
// Event Listeners Setup
// ==========================================================================
function setupEventListenersJG() {
    elementsJG.btnPlay?.addEventListener('click', togglePlayPauseJG);
    elementsJG.btnNext?.addEventListener('click', playNextJG);
    elementsJG.btnPrev?.addEventListener('click', playPrevJG);
    elementsJG.btnShuffle?.addEventListener('click', toggleShuffleJG);
    elementsJG.btnLoop?.addEventListener('click', toggleLoopJG);

    elementsJG.progressSlider?.addEventListener('input', (e) => {
        if (!appStateJG.player || !appStateJG.isPlayerReady || typeof appStateJG.player.getDuration !== 'function') return;
        const duration = appStateJG.player.getDuration();
        if (duration > 0) {
            const seekTime = (parseFloat(e.target.value) / 100) * duration;
            appStateJG.player.seekTo(seekTime, true);
            updateProgressJG(); // Immediately update UI after manual seek
        }
    });

    elementsJG.volumeSlider?.addEventListener('input', (e) => {
        appStateJG.volume = parseInt(e.target.value);
        if (appStateJG.player && appStateJG.isPlayerReady) appStateJG.player.setVolume(appStateJG.volume);
        // Update volume icons (e.g. mute, low, high)
        if (elementsJG.volumeIconMute && elementsJG.volumeIconUp) {
            elementsJG.volumeIconMute.style.opacity = appStateJG.volume === 0 ? '1' : '0.5';
            elementsJG.volumeIconUp.style.opacity = appStateJG.volume > 0 ? '1' : '0.5';
        }
    });

    elementsJG.themeToggle?.addEventListener('click', toggleThemeJG);

    elementsJG.logTabs.forEach(tab => {
        tab.addEventListener('click', () => switchLogPanelJG(tab.dataset.panel));
    });
    
    elementsJG.searchInput?.addEventListener('input', handleSearchJG);

    // Listener for dynamically created song list items is handled within renderSongListJG
}

// ==========================================================================
// UI & Control Logic Helpers
// ==========================================================================
function toggleThemeJG() {
    elementsJG.body.classList.toggle('light-mode-jg');
    appStateJG.currentTheme = elementsJG.body.classList.contains('light-mode-jg') ? 'light' : 'dark';
    elementsJG.themeToggle.innerHTML = `<i class="fas ${appStateJG.currentTheme === 'light' ? 'fa-moon' : 'fa-sun'}"></i>`;
    saveToLocalStorageJG(LS_KEYS_JG.THEME, appStateJG.currentTheme);
    showSnackbarJG(`天候が「${appStateJG.currentTheme === 'light' ? '昼のジャングル' : '夜のジャングル'}」に！`);
}

function switchLogPanelJG(panelId) {
    if (!panelId || appStateJG.currentPanel === panelId) return; // Avoid unnecessary re-renders
    appStateJG.currentPanel = panelId;

    elementsJG.logTabs.forEach(t => t.classList.toggle('active', t.dataset.panel === panelId));
    elementsJG.logPanels.forEach(p => p.classList.toggle('active', p.id === panelId));

    switch (panelId) {
        case 'log-library':
            renderSongListJG(elementsJG.libraryPanel, appStateJG.filteredSongs, 'library');
            break;
        case 'log-discoveries': // Queue
            renderSongListJG(elementsJG.queuePanel, appStateJG.queue.map(id => findSongByIdJG(id)).filter(s => s), 'queue');
            break;
        case 'log-trophies': // Favorites
            renderSongListJG(elementsJG.favoritesPanel, appStateJG.favorites, 'favorites');
            break;
        case 'log-history': // History
            if(elementsJG.historyPanel) renderSongListJG(elementsJG.historyPanel, [...appStateJG.history].reverse(), 'history'); // Show newest first
            break;
        // Add case for 'log-paths' (Playlists) when implemented
    }
}
function handleSearchJG() {
    const searchTerm = elementsJG.searchInput.value.toLowerCase().trim();
    appStateJG.filteredSongs = appStateJG.songs.filter(song =>
        song.title.toLowerCase().includes(searchTerm)
    );
    // If currently on library tab, re-render it
    if (appStateJG.currentPanel === 'log-library') {
        renderSongListJG(elementsJG.libraryPanel, appStateJG.filteredSongs, 'library');
    }
}


function toggleShuffleJG() {
    appStateJG.isShuffle = !appStateJG.isShuffle;
    elementsJG.btnShuffle.classList.toggle('active-control', appStateJG.isShuffle);
    showSnackbarJG(`シャッフル・ビート ${appStateJG.isShuffle ? 'ON' : 'OFF'}!`);
}
function toggleLoopJG() {
    if (appStateJG.loopMode === 'none') appStateJG.loopMode = 'all';
    else if (appStateJG.loopMode === 'all') appStateJG.loopMode = 'one';
    else appStateJG.loopMode = 'none';

    elementsJG.btnLoop.classList.toggle('active-control', appStateJG.loopMode !== 'none');
    if (appStateJG.loopMode === 'one') {
        elementsJG.btnLoop.innerHTML = '<i class="fas fa-redo-alt"></i><span class="loop-indicator-jg">1</span>';
    } else {
        elementsJG.btnLoop.innerHTML = '<i class="fas fa-redo-alt"></i>';
    }
    let loopMsg = "リピート: ";
    if(appStateJG.loopMode === 'none') loopMsg += "OFF";
    if(appStateJG.loopMode === 'all') loopMsg += "ジャングル全体";
    if(appStateJG.loopMode === 'one') loopMsg += "この一本の木";
    showSnackbarJG(loopMsg);
}

// ==========================================================================
// History & Favorites
// ==========================================================================
function addToHistoryJG(song) {
    if (!song || !song.id) return;
    appStateJG.history = appStateJG.history.filter(s => s.id !== song.id);
    appStateJG.history.unshift(song);
    if (appStateJG.history.length > MAX_HISTORY_JG) appStateJG.history.pop();
    saveToLocalStorageJG(LS_KEYS_JG.HISTORY, appStateJG.history);
}
function renderHistoryListJG() { // Make sure this is called when history panel is active
    if (elementsJG.historyPanel) {
         renderSongListJG(elementsJG.historyPanel, [...appStateJG.history].reverse(), 'history');
    }
}

function toggleFavoriteJG(songId, iconElement) {
    const songIndex = appStateJG.favorites.findIndex(s => s.id === songId);
    const song = findSongByIdJG(songId);
    if (!song) return;

    let isNowFavorite = false;
    if (songIndex > -1) {
        appStateJG.favorites.splice(songIndex, 1);
        showSnackbarJG(`「${escapeHTMLJG(song.title)}」をジャングルの秘宝から外した...`);
    } else {
        appStateJG.favorites.push(song);
        isNowFavorite = true;
        showSnackbarJG(`「${escapeHTMLJG(song.title)}」を秘宝として発見！`, "success");
    }

    if (iconElement) {
        iconElement.className = `fas ${isNowFavorite ? 'fa-heart text-jg-accent-sunburst' : 'fa-feather-alt'}`;
    }
    saveToLocalStorageJG(LS_KEYS_JG.FAVORITES, appStateJG.favorites);

    if (appStateJG.currentPanel === 'log-trophies') {
         renderSongListJG(elementsJG.favoritesPanel, appStateJG.favorites, 'favorites');
    }
    // Also update favorite icon in other lists if the song is present
    document.querySelectorAll(`.log-entry-jg[data-id="${songId}"] .song-item-action-jg i`).forEach(icon => {
        icon.className = `fas ${isNowFavorite ? 'fa-heart text-jg-accent-sunburst' : 'fa-feather-alt'}`;
    });
}


// ==========================================================================
// Utility Functions
// ==========================================================================
function findSongByIdJG(songId) {
    if (!songId) return null;
    return appStateJG.songs.find(s => s && s.id === songId);
}

function formatTimeJG(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function escapeHTMLJG(str) {
    if (typeof str !== 'string' || !str) return '';
    const map = {
        '&': '&',
        '<': '<',
        '>': '>',
        '"': '"',
        "'": '\'', // または '&apos;' や '&#39;'
    };
    // 正規表現のマッチングと置換は問題ないはずです。
    return str.replace(/[&<>"']/g, function(m) { return map[m]; });
}
function saveToLocalStorageJG(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error("Error saving to localStorage:", key, e);
        showSnackbarJG("設定の保存に失敗しました...", "error");
    }
}
function loadFromLocalStorageJG(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error("Error loading from localStorage:", key, e);
        return null;
    }
}

function showSnackbarJG(message, type = 'info', duration = 3000) {
    const snackbarId = 'snackbar-jg-dynamic'; // Ensure this ID is unique if you have other snackbars
    let snackbar = document.getElementById(snackbarId);
    if (!snackbar) {
        snackbar = document.createElement('div');
        snackbar.id = snackbarId;
        // Suggestion: Define base styles in CSS for #snackbar-jg-dynamic and use classes for types
        // For now, keeping JS styling for simplicity of copy-paste
        Object.assign(snackbar.style, {
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%) translateY(100px)', // Start off-screen
            padding: '12px 25px',
            backgroundColor: '#2c3e50', // Dark neutral
            color: '#ecf0f1', // Light text
            borderRadius: '8px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            zIndex: '10001', // Ensure above most things
            opacity: '0',
            transition: 'opacity 0.3s ease, transform 0.3s ease-out',
            fontSize: '0.9rem',
            fontFamily: 'var(--font-body-jg)',
            textAlign: 'center',
            minWidth: '280px',
            maxWidth: '90%'
        });
        document.body.appendChild(snackbar);
    }

    snackbar.textContent = message;
    let bgColor = '#34495e'; // Default info color (dark blueish grey)
    if (type === 'error') bgColor = '#c0392b'; // Dark red
    if (type === 'success') bgColor = '#27ae60'; // Dark green
    if (type === 'warning') bgColor = '#f39c12'; // Dark yellow/orange
    snackbar.style.backgroundColor = bgColor;

    // Trigger animation
    requestAnimationFrame(() => {
        snackbar.style.opacity = '1';
        snackbar.style.transform = 'translateX(-50%) translateY(0)';
    });

    if (appStateJG.snackbarTimeoutId) clearTimeout(appStateJG.snackbarTimeoutId);
    appStateJG.snackbarTimeoutId = setTimeout(() => {
        snackbar.style.opacity = '0';
        snackbar.style.transform = 'translateX(-50%) translateY(100px)';
    }, duration);
}

// ==========================================================================
// Initialization on DOM Load & YouTube API Ready
// ==========================================================================
function loadInitialDataJG() {
    appStateJG.history = loadFromLocalStorageJG(LS_KEYS_JG.HISTORY) || [];
    appStateJG.favorites = loadFromLocalStorageJG(LS_KEYS_JG.FAVORITES) || [];
    appStateJG.queue = loadFromLocalStorageJG(LS_KEYS_JG.QUEUE) || [];
    appStateJG.currentTheme = loadFromLocalStorageJG(LS_KEYS_JG.THEME) || 'dark';

    if (appStateJG.currentTheme === 'light') {
        elementsJG.body.classList.add('light-mode-jg'); // Ensure this class exists in CSS for light theme
        if(elementsJG.themeToggle) elementsJG.themeToggle.innerHTML = `<i class="fas fa-moon"></i>`;
    } else {
        if(elementsJG.themeToggle) elementsJG.themeToggle.innerHTML = `<i class="fas fa-sun"></i>`;
    }
    // Initial render for panels that depend on localStorage
    if(elementsJG.favoritesPanel) renderSongListJG(elementsJG.favoritesPanel, appStateJG.favorites, 'favorites');
    if(elementsJG.historyPanel) renderHistoryListJG(); // This will call renderSongListJG for history
    if(elementsJG.queuePanel) renderSongListJG(elementsJG.queuePanel, appStateJG.queue.map(id => findSongByIdJG(id)).filter(s => s), 'queue');
    updateQueueCountBadgeJG();
}

function updateQueueCountBadgeJG() {
    if (elementsJG.queueCountBadge) {
        elementsJG.queueCountBadge.textContent = appStateJG.queue.length;
        elementsJG.queueCountBadge.style.display = appStateJG.queue.length > 0 ? 'inline-block' : 'none';
    }
}


document.addEventListener('DOMContentLoaded', () => {
    console.log("Jungle Groove DOM Ready! Initializing the safari...");
    initializeElementsJG();
    loadInitialDataJG();
    setupEventListenersJG();
    // The onYouTubeIframeAPIReady will be called automatically by the YouTube script
});

// Make this function globally accessible for the YouTube API script to call
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReadyJG;
