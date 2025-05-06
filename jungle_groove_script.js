// jungle_groove_script.js
console.log("jungle_groove_script.js parsing started. Waiting for YouTube API...");

let elementsJG = {}; // Ensure elementsJG is declared early
let appStateJG = {}; // Declare appStateJG early for onYouTubeIframeAPIReady if needed before full init

// ==========================================================================
// YouTube Player API Ready Callback (MUST BE GLOBAL and named onYouTubeIframeAPIReady)
// ==========================================================================
function onYouTubeIframeAPIReady() {
    console.log("GLOBAL onYouTubeIframeAPIReady CALLED BY YOUTUBE API SCRIPT!");

    // Ensure elements are initialized, especially youtubePlayerContainer.
    // This might be called before DOMContentLoaded, so elementsJG might be empty.
    // initializeElementsJG() will be called again on DOMContentLoaded to ensure all elements are captured.
    if (Object.keys(elementsJG).length === 0 || !elementsJG.youtubePlayerContainer) {
        console.warn("onYouTubeIframeAPIReady: elementsJG not fully initialized or youtubePlayerContainer missing. Initializing elements now for player creation.");
        initializeElementsJG(); // Attempt to initialize elements if not done.
    }

    if (!elementsJG.youtubePlayerContainer) {
         console.error("onYouTubeIframeAPIReady: Still no youtubePlayerContainer after trying to initialize. Player cannot be created. Make sure a div with id 'youtube-player-container-jg' exists or is created by initializeElementsJG.");
         showSnackbarJG("プレイヤー表示領域が見つかりません。", "error"); // showSnackbarJG might not be defined yet if this runs too early
         return;
    }
    console.log("onYouTubeIframeAPIReady: youtubePlayerContainer found:", elementsJG.youtubePlayerContainer, "with ID:", elementsJG.youtubePlayerContainer.id);

    try {
        // Initialize appStateJG here if it's not fully defined yet,
        // especially properties needed by the player or its event handlers.
        // This is a basic re-init; complex state should be handled carefully.
        if (Object.keys(appStateJG).length < 5) { // Heuristic: if not many keys, it's not fully initialized
            console.warn("onYouTubeIframeAPIReady: appStateJG seems partially initialized, re-setting basic player state.");
            appStateJG.player = null;
            appStateJG.isPlayerReady = false;
            appStateJG.volume = appStateJG.volume || 75; // Keep existing volume if set
        }


        appStateJG.player = new YT.Player(elementsJG.youtubePlayerContainer.id, { // Make sure this ID is correct
            height: '1',
            width: '1',
            playerVars: {
                'autoplay': 0,
                'controls': 0,
                'playsinline': 1,
                'origin': window.location.origin
            },
            events: {
                'onReady': onPlayerReadyJG,       // Ensure this is the correct function name
                'onStateChange': onPlayerStateChangeJG, // Ensure this is the correct function name
                'onError': onPlayerErrorJG         // Ensure this is the correct function name
            }
        });
        console.log("onYouTubeIframeAPIReady: YT.Player instance creation attempted.");
        if (appStateJG.player) {
            console.log("onYouTubeIframeAPIReady: YT.Player instance created successfully.");
        } else {
            console.error("onYouTubeIframeAPIReady: YT.Player instance creation failed (player object is null/undefined).");
        }
    } catch (e) {
        console.error("onYouTubeIframeAPIReady: Error creating YT.Player instance:", e);
        // showSnackbarJG might not be available if script order is an issue, fallback to alert
        const message = "YouTubeプレイヤーの作成中にエラー: " + e.message;
        if (typeof showSnackbarJG === 'function') {
            showSnackbarJG(message, "error");
        } else {
            alert(message);
        }
    }
}
// No need for window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady; if the function is named onYouTubeIframeAPIReady globally.

// ==========================================================================
// Constants & State
// ==========================================================================
const MAX_HISTORY_JG = 20;
const VOLUME_STEP_JG = 5;
const SEEK_STEP_JG = 5; // seconds
const LS_KEYS_JG = {
    HISTORY: 'jungleGrooveHistory',
    FAVORITES: 'jungleGrooveFavorites',
    PLAYLISTS: 'jungleGroovePlaylists',
    USER: 'jungleGrooveUser',
    THEME: 'jungleGrooveTheme',
    QUEUE: 'jungleGrooveQueue'
};

// appStateJG is declared at the top, now fully initialize it
appStateJG.player = null;
appStateJG.songs = [];
appStateJG.filteredSongs = [];
appStateJG.currentSongIndex = -1;
appStateJG.isPlaying = false;
appStateJG.isShuffle = false;
appStateJG.loopMode = 'none';
appStateJG.currentPanel = 'log-library';
appStateJG.volume = 75;
appStateJG.progressInterval = null;
appStateJG.history = [];
appStateJG.favorites = [];
appStateJG.userPlaylists = [];
appStateJG.queue = [];
appStateJG.currentQueueIndex = -1;
appStateJG.playMode = 'library';
appStateJG.isPlayerReady = false;
appStateJG.snackbarTimeoutId = null;
appStateJG.activeModalId = null;
appStateJG.currentTheme = 'dark';

// elementsJG is declared at the top
// ==========================================================================
// Element Initialization
// ==========================================================================
function initializeElementsJG() {
    console.log("initializeElementsJG - START");
    elementsJG = {
        body: document.body,
        searchInput: document.getElementById('animal-tracker'),
        themeToggle: document.getElementById('weather-toggle'),
        profileButton: document.getElementById('profile-ranger'),
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
        logTabs: document.querySelectorAll('.log-tab-jg'),
        logPanels: document.querySelectorAll('.log-panel-jg'),
        libraryPanel: document.getElementById('log-library'),
        queuePanel: document.getElementById('log-discoveries'),
        favoritesPanel: document.getElementById('log-trophies'),
        historyPanel: document.getElementById('log-history'),
        playlistsPanel: document.getElementById('log-paths'),
        queueCountBadge: document.getElementById('queue-count-jg'),
        youtubePlayerContainer: null,
    };

    let ytContainer = document.getElementById('youtube-player-container-jg');
    if (!ytContainer) {
        ytContainer = document.createElement('div');
        ytContainer.id = 'youtube-player-container-jg';
        ytContainer.style.position = 'absolute';
        ytContainer.style.top = '-9999px';
        ytContainer.style.left = '-9999px';
        ytContainer.style.width = '1px';
        ytContainer.style.height = '1px';
        document.body.appendChild(ytContainer);
    }
    elementsJG.youtubePlayerContainer = ytContainer;

    console.log("Jungle Groove Elements Initialized (from initializeElementsJG):", elementsJG);
}

// ==========================================================================
// YouTube API & Song Loading
// ==========================================================================
const youtubeAPI_JG = {
    apiKey: 'AIzaSyCbzvjP9vFa5I8N1qLI5H9LUpYim0nkQS4', // API Key set
    channelId: 'UCYAuSEKhuk3v4ZKzm5Lqb1Q',

    async getLatestVideos(maxResults = 15) {
        console.log("getLatestVideos - START. API Key used:", this.apiKey);
        if (!this.apiKey || this.apiKey === 'YOUR_YOUTUBE_API_KEY_HERE' || this.apiKey.includes('_PLACEHOLDER')) {
            console.error("youtubeAPI_JG.getLatestVideos: YouTube API Key is not properly set!", this.apiKey);
            showSnackbarJG("YouTube APIキーが設定されていません。", "error");
            return [];
        }
        const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${this.channelId}&maxResults=${maxResults}&order=date&type=video&key=${this.apiKey}`;
        console.log("Fetching YouTube videos from:", apiUrl);
        try {
            const response = await fetch(apiUrl);
            console.log("YouTube API Response Status:", response.status, response.statusText);
            if (!response.ok) {
                 const errorText = await response.text();
                 let errorData = null;
                 try { errorData = JSON.parse(errorText); } catch (e) { console.warn("Could not parse API error response as JSON:", errorText); }

                 const errorMessage = errorData?.error?.message || `YouTube API error: ${response.status} - ${response.statusText || errorText}`;
                 console.error("API Error Data (if JSON):", errorData);
                 console.error("API Error Text (if not JSON or for details):", errorText);
                 throw new Error(errorMessage);
            }
            const data = await response.json();
            console.log("YouTube API Response Data:", data);
            if (!data.items) {
                console.warn("No items found in YouTube API response. Full data:", data);
                return [];
            }
            return data.items.map(item => ({
                id: item.id.videoId,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
                duration: "--:--"
            }));
        } catch (error) {
            console.error('Error in getLatestVideos fetch operation:', error);
            showSnackbarJG(`曲の読み込み中にエラーが発生しました: ${error.message}`, "error");
            return [];
        }
    },
    async getVideoDetails(videoIds) {
        console.log("getVideoDetails - START. Fetching for IDs:", videoIds);
        if (!videoIds || videoIds.length === 0) return {};
        // Ensure API key is valid before making a call
        if (!this.apiKey || this.apiKey === 'YOUR_YOUTUBE_API_KEY_HERE' || this.apiKey.includes('_PLACEHOLDER')) {
            console.error("youtubeAPI_JG.getVideoDetails: YouTube API Key is not properly set!", this.apiKey);
            return {};
        }
        try {
            const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds.join(',')}&key=${this.apiKey}`);
            if (!response.ok) throw new Error(`YouTube Video Details API error: ${response.status}`);
            const data = await response.json();
            const details = {};
            if (data.items) {
                data.items.forEach(item => {
                    if (item.contentDetails) {
                       details[item.id] = this.convertDuration(item.contentDetails.duration);
                    } else {
                       details[item.id] = "--:--";
                       console.warn(`Video item ${item.id} missing contentDetails.`);
                    }
                });
            }
            return details;
        } catch (error) {
            console.error('Error fetching video details:', error);
            return {};
        }
    },
    convertDuration(isoDuration) { // Keep this function as is
        if (!isoDuration) return '--:--';
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
    console.log("loadInitialSongsJG - START");
    if (!elementsJG.libraryPanel) {
        console.error("loadInitialSongsJG: Library panel element not found for loading songs.");
        return;
    }
    console.log("loadInitialSongsJG: Showing loading indicator.");
    showLoadingInPanelJG(elementsJG.libraryPanel, true);

    let songs = [];
    try {
        songs = await youtubeAPI_JG.getLatestVideos(25);
        console.log("loadInitialSongsJG: Fetched songs from getLatestVideos:", songs);
    } catch (error) {
        console.error("loadInitialSongsJG: Error occurred while calling getLatestVideos:", error);
        appStateJG.songs = [];
        appStateJG.filteredSongs = [];
        if (elementsJG.libraryPanel) {
            renderSongListJG(elementsJG.libraryPanel, [], 'library');
            showLoadingInPanelJG(elementsJG.libraryPanel, false);
            showEmptyMessageInPanelJG(elementsJG.libraryPanel, "読み込み失敗", "曲の取得中にエラーが発生しました。");
        }
        return;
    }

    if (songs && songs.length > 0) {
        console.log("loadInitialSongsJG: Fetching durations for " + songs.length + " songs.");
        const videoIds = songs.map(s => s.id).filter(id => id);
        if (videoIds.length > 0) {
            try {
                const durations = await youtubeAPI_JG.getVideoDetails(videoIds);
                console.log("loadInitialSongsJG: Fetched durations:", durations);
                songs = songs.map(song => ({
                    ...song,
                    duration: durations[song.id] || "--:--"
                }));
            } catch (error) {
                console.error("loadInitialSongsJG: Error fetching video details (durations):", error);
            }
        }
    }

    appStateJG.songs = songs || [];
    appStateJG.filteredSongs = [...(songs || [])];
    console.log("loadInitialSongsJG: Calling renderSongListJG for library with songs:", appStateJG.filteredSongs);
    if (elementsJG.libraryPanel) {
        renderSongListJG(elementsJG.libraryPanel, appStateJG.filteredSongs, 'library');
        showLoadingInPanelJG(elementsJG.libraryPanel, false);
    }

    if ((!songs || songs.length === 0)) {
        if (elementsJG.libraryPanel) {
            // Check if API key was the issue based on a flag or if it's still the placeholder
            const apiKey = youtubeAPI_JG.apiKey;
            if (!apiKey || apiKey === 'YOUR_YOUTUBE_API_KEY_HERE' || apiKey.includes('_PLACEHOLDER')) {
                 showEmptyMessageInPanelJG(elementsJG.libraryPanel, "APIキーが必要です", "曲をロードするにはAPIキーを設定してください。");
            } else {
                showEmptyMessageInPanelJG(elementsJG.libraryPanel, "まだ曲がありません", "新しい冒険が始まるのを待とう！");
            }
        }
    }
}
// ==========================================================================
// UI Rendering
// ==========================================================================
// ... (renderSongListJG, showLoadingInPanelJG, showEmptyMessageInPanelJG, updatePlayerUIGJ, updatePlayPauseButtonJG, updateActiveListItemJG -  Keep as previously provided, with fixes)
function renderSongListJG(panelElement, songsToRender, context) {
    if (!panelElement) {
        console.warn(`Panel element for context "${context}" not found.`);
        return;
    }
    panelElement.innerHTML = '';

    if (!songsToRender || songsToRender.length === 0) {
        let emptyTitle = "何も見つからない...";
        let emptyMessage = "このエリアにはまだ何もないようだ。";
        if (context === 'library' && elementsJG.searchInput?.value) { // Check if searchInput exists
            emptyTitle = "検索結果なし";
            emptyMessage = `「${escapeHTMLJG(elementsJG.searchInput.value)}」に合う冒険は見つからなかった...`;
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
        if (!song || !song.id) {
            console.warn("Skipping invalid song object in renderSongListJG:", song);
            return;
        }
        const originalSongIndex = appStateJG.songs.findIndex(s => s.id === song.id);
        const isActive = appStateJG.currentSongIndex === originalSongIndex;
        const isFavorited = appStateJG.favorites.some(fav => fav.id === song.id);

        const entry = document.createElement('div');
        entry.className = `log-entry-jg ${isActive ? 'active-song' : ''}`;
        entry.dataset.id = song.id;
        entry.dataset.index = originalSongIndex;

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
                playSongAtIndexJG(originalSongIndex);
            }
        });
        fragment.appendChild(entry);
    });
    panelElement.appendChild(fragment);
}

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
        elementsJG.artistNameDisplay.textContent = "Rei Kikuchi";
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
// Player Controls
// ==========================================================================
// ... (playSongAtIndexJG, togglePlayPauseJG, playNextJG, playPrevJG, handleSongEndJG, updateProgressJG - Keep as previously provided, with fixes)
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
    if (appStateJG.currentPanel === 'log-history' && elementsJG.historyPanel) renderHistoryListJG();
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
function playNextJG() {
    if (appStateJG.songs.length === 0) return;
    let nextIndex = appStateJG.currentSongIndex;

    if (appStateJG.isShuffle) {
        if (appStateJG.songs.length <= 1) nextIndex = 0;
        else do { nextIndex = Math.floor(Math.random() * appStateJG.songs.length); } while (nextIndex === appStateJG.currentSongIndex && appStateJG.songs.length > 1);
    } else {
        nextIndex = (appStateJG.currentSongIndex + 1);
        if (nextIndex >= appStateJG.songs.length) {
            if (appStateJG.loopMode === 'all') nextIndex = 0;
            else {
                showSnackbarJG("探検の終わりです！", "info");
                appStateJG.isPlaying = false;
                updatePlayPauseButtonJG();
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
            else playNextJG();
        } else {
            if (appStateJG.loopMode === 'all') {
                 appStateJG.currentQueueIndex = -1;
                 playNextJG();
            } else {
                showSnackbarJG("キューの再生が終わりました。", "info");
                appStateJG.isPlaying = false;
                updatePlayPauseButtonJG();
            }
        }
    }
    else if (appStateJG.loopMode === 'all' || (appStateJG.loopMode === 'none' && appStateJG.currentSongIndex < appStateJG.songs.length - 1) ) {
        playNextJG();
    } else {
        appStateJG.isPlaying = false;
        updatePlayPauseButtonJG();
        showSnackbarJG("探検の終わりです！", "info");
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
            const itemInList = elementsJG.libraryPanel?.querySelector(`.log-entry-jg[data-id="${currentSong.id}"] .duration`); // Add null check for libraryPanel
            if(itemInList) itemInList.textContent = currentSong.duration;
        }
    } else {
        elementsJG.progressSlider.value = 0;
        elementsJG.currentTimeDisplay.textContent = "0:00";
    }
}
// ==========================================================================
// YouTube Player Event Handlers (Already included updated logs from previous step)
// ==========================================================================
// ==========================================================================
// YouTube Player Event Handlers
// ==========================================================================
function onPlayerReadyJG(event) {
    console.log("Jungle Groove Player Ready! (onPlayerReadyJG called). Player object available:", !!event.target);
    appStateJG.isPlayerReady = true;
    if (event.target && typeof event.target.setVolume === 'function') {
        try {
            event.target.setVolume(appStateJG.volume);
            console.log("onPlayerReadyJG: Volume set to", appStateJG.volume);
        } catch(e){
            console.warn("onPlayerReadyJG: Could not set volume on ready", e);
        }
    } else {
        console.warn("onPlayerReadyJG: event.target or setVolume not available for volume setting.");
    }

    const apiKey = youtubeAPI_JG.apiKey;
    // Check for placeholder again, ensure it's a real key
    if (apiKey && apiKey !== 'YOUR_YOUTUBE_API_KEY_HERE' && !apiKey.includes('_PLACEHOLDER_') && apiKey.length > 10) { // Basic length check
        console.log("onPlayerReadyJG: API Key seems to be set correctly. Calling loadInitialSongsJG...");
        loadInitialSongsJG();
    } else {
        console.error("onPlayerReadyJG: API Key is missing, still a placeholder, or too short! API Key found:", `"${apiKey}"`);
        showSnackbarJG("APIキーが正しく設定されていません。曲をロードできません。", "error");
        if (elementsJG.libraryPanel) {
            showEmptyMessageInPanelJG(elementsJG.libraryPanel, "APIキー未設定", "曲をロードするには、スクリプト内のAPIキーを有効なものに置き換えてください。");
        }
    }
}

function onPlayerStateChangeJG(event) {
    console.log("onPlayerStateChangeJG - Player state:", event.data, "(Playing:", YT.PlayerState.PLAYING, "Paused:", YT.PlayerState.PAUSED, "Ended:", YT.PlayerState.ENDED, ")");
    const playerState = event.data;
    const previouslyPlaying = appStateJG.isPlaying;
    appStateJG.isPlaying = (playerState === YT.PlayerState.PLAYING);

    if (previouslyPlaying !== appStateJG.isPlaying) {
        updatePlayPauseButtonJG();
    }

    if (appStateJG.isPlaying) {
        if (appStateJG.progressInterval) clearInterval(appStateJG.progressInterval);
        appStateJG.progressInterval = setInterval(updateProgressJG, 250);
        updateProgressJG(); // Initial update when play starts
    } else {
        clearInterval(appStateJG.progressInterval);
        if (playerState === YT.PlayerState.PAUSED || playerState === YT.PlayerState.BUFFERING || playerState === YT.PlayerState.ENDED) {
            updateProgressJG(); // Update progress one last time
        }
    }

    if (playerState === YT.PlayerState.ENDED) {
        handleSongEndJG();
    }
}

function onPlayerErrorJG(event) {
    console.error("onPlayerErrorJG - Error code:", event.data);
    let msg = `動画の再生エラー (コード: ${event.data})`;
    if (event.data === 2) msg = "無効な動画ID、またはリクエストに問題があります。";
    if (event.data === 5) msg = "HTML5プレイヤーで内部エラーが発生しました。";
    if (event.data === 100) msg = "要求された動画が見つかりませんでした。";
    if (event.data === 101 || event.data === 150) msg = "この動画の埋め込み再生は、所有者によって許可されていません。";
    showSnackbarJG(msg, "error");
    appStateJG.isPlaying = false;
    updatePlayPauseButtonJG();
    // Optionally, try to play the next song or reset UI further
}
// ==========================================================================
// Event Listeners Setup
// ==========================================================================
// ... (setupEventListenersJG - Keep as previously provided)
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
            updateProgressJG();
        }
    });

    elementsJG.volumeSlider?.addEventListener('input', (e) => {
        appStateJG.volume = parseInt(e.target.value);
        if (appStateJG.player && appStateJG.isPlayerReady) appStateJG.player.setVolume(appStateJG.volume);
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
}
// ==========================================================================
// UI & Control Logic Helpers
// ==========================================================================
// ... (toggleThemeJG, switchLogPanelJG, handleSearchJG, toggleShuffleJG, toggleLoopJG - Keep as previously provided)
function toggleThemeJG() {
    if (!elementsJG.body || !elementsJG.themeToggle) return;
    elementsJG.body.classList.toggle('light-mode-jg');
    appStateJG.currentTheme = elementsJG.body.classList.contains('light-mode-jg') ? 'light' : 'dark';
    elementsJG.themeToggle.innerHTML = `<i class="fas ${appStateJG.currentTheme === 'light' ? 'fa-moon' : 'fa-sun'}"></i>`;
    saveToLocalStorageJG(LS_KEYS_JG.THEME, appStateJG.currentTheme);
    showSnackbarJG(`天候が「${appStateJG.currentTheme === 'light' ? '昼のジャングル' : '夜のジャングル'}」に！`);
}

function switchLogPanelJG(panelId) {
    if (!panelId || appStateJG.currentPanel === panelId) return;
    appStateJG.currentPanel = panelId;

    elementsJG.logTabs.forEach(t => t.classList.toggle('active', t.dataset.panel === panelId));
    elementsJG.logPanels.forEach(p => {
        if (p) p.classList.toggle('active', p.id === panelId); // Add null check for p
    });


    switch (panelId) {
        case 'log-library':
            if (elementsJG.libraryPanel) renderSongListJG(elementsJG.libraryPanel, appStateJG.filteredSongs, 'library');
            break;
        case 'log-discoveries': // Queue
            if (elementsJG.queuePanel) renderSongListJG(elementsJG.queuePanel, appStateJG.queue.map(id => findSongByIdJG(id)).filter(s => s), 'queue');
            break;
        case 'log-trophies': // Favorites
            if (elementsJG.favoritesPanel) renderSongListJG(elementsJG.favoritesPanel, appStateJG.favorites, 'favorites');
            break;
        case 'log-history':
            if(elementsJG.historyPanel) renderHistoryListJG();
            break;
    }
}
function handleSearchJG() {
    if (!elementsJG.searchInput) return;
    const searchTerm = elementsJG.searchInput.value.toLowerCase().trim();
    appStateJG.filteredSongs = appStateJG.songs.filter(song =>
        song.title && song.title.toLowerCase().includes(searchTerm) // Add null check for song.title
    );
    if (appStateJG.currentPanel === 'log-library' && elementsJG.libraryPanel) {
        renderSongListJG(elementsJG.libraryPanel, appStateJG.filteredSongs, 'library');
    }
}


function toggleShuffleJG() {
    if (!elementsJG.btnShuffle) return;
    appStateJG.isShuffle = !appStateJG.isShuffle;
    elementsJG.btnShuffle.classList.toggle('active-control', appStateJG.isShuffle);
    showSnackbarJG(`シャッフル・ビート ${appStateJG.isShuffle ? 'ON' : 'OFF'}!`);
}
function toggleLoopJG() {
    if (!elementsJG.btnLoop) return;
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
// ... (addToHistoryJG, renderHistoryListJG, toggleFavoriteJG - Keep as previously provided)
function addToHistoryJG(song) {
    if (!song || !song.id) return;
    appStateJG.history = appStateJG.history.filter(s => s.id !== song.id);
    appStateJG.history.unshift(song);
    if (appStateJG.history.length > MAX_HISTORY_JG) appStateJG.history.pop();
    saveToLocalStorageJG(LS_KEYS_JG.HISTORY, appStateJG.history);
}
function renderHistoryListJG() {
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

    if (appStateJG.currentPanel === 'log-trophies' && elementsJG.favoritesPanel) {
         renderSongListJG(elementsJG.favoritesPanel, appStateJG.favorites, 'favorites');
    }
    document.querySelectorAll(`.log-entry-jg[data-id="${songId}"] .song-item-action-jg i`).forEach(icon => {
        icon.className = `fas ${isNowFavorite ? 'fa-heart text-jg-accent-sunburst' : 'fa-feather-alt'}`;
    });
}
// ==========================================================================
// Utility Functions
// ==========================================================================
// ... (findSongByIdJG, formatTimeJG, escapeHTMLJG, saveToLocalStorageJG, loadFromLocalStorageJG, showSnackbarJG - Keep as previously provided, with `escapeHTMLJG` using the correct map)
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

function escapeHTMLJG(str) { // CORRECTED VERSION
    if (typeof str !== 'string' || !str) return '';
    const map = {
        '&': '&',
        '<': '<',
        '>': '>',
        '"': '&quot;',
        "'": '&apos;'
    };
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
    const snackbarId = 'snackbar-jg-dynamic';
    let snackbar = document.getElementById(snackbarId);
    if (!snackbar) {
        snackbar = document.createElement('div');
        snackbar.id = snackbarId;
        Object.assign(snackbar.style, {
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%) translateY(100px)',
            padding: '12px 25px',
            backgroundColor: '#2c3e50',
            color: '#ecf0f1',
            borderRadius: '8px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            zIndex: '10001',
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
    let bgColor = '#34495e';
    if (type === 'error') bgColor = '#c0392b';
    if (type === 'success') bgColor = '#27ae60';
    if (type === 'warning') bgColor = '#f39c12';
    snackbar.style.backgroundColor = bgColor;

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
    console.log("loadInitialDataJG - START: Loading data from localStorage and setting theme.");
    appStateJG.history = loadFromLocalStorageJG(LS_KEYS_JG.HISTORY) || [];
    appStateJG.favorites = loadFromLocalStorageJG(LS_KEYS_JG.FAVORITES) || [];
    appStateJG.queue = loadFromLocalStorageJG(LS_KEYS_JG.QUEUE) || [];
    appStateJG.currentTheme = loadFromLocalStorageJG(LS_KEYS_JG.THEME) || 'dark';

    if (elementsJG.body && elementsJG.themeToggle) {
        if (appStateJG.currentTheme === 'light') {
            elementsJG.body.classList.add('light-mode-jg');
            elementsJG.themeToggle.innerHTML = `<i class="fas fa-moon"></i>`;
        } else {
            elementsJG.body.classList.remove('light-mode-jg');
            elementsJG.themeToggle.innerHTML = `<i class="fas fa-sun"></i>`;
        }
    } else {
        console.warn("loadInitialDataJG: Body or themeToggle element not found for theme setup.");
    }

    // Render lists that depend on localStorage (songs are loaded after player is ready)
    if (elementsJG.favoritesPanel) renderSongListJG(elementsJG.favoritesPanel, appStateJG.favorites, 'favorites');
    else console.warn("loadInitialDataJG: favoritesPanel not found for initial render.");

    if (elementsJG.historyPanel) renderHistoryListJG();
    else console.warn("loadInitialDataJG: historyPanel not found for initial render.");

    // For queue, we need appStateJG.songs to be populated to find song details.
    // So, render queue might need to be called again after songs are loaded, or just show IDs/placeholders.
    // For now, let's try to render it with what we have.
    if (elementsJG.queuePanel) {
        const queueSongs = appStateJG.queue.map(id => findSongByIdJG(id)).filter(s => s); // findSongByIdJG will return undefined if songs not loaded
        renderSongListJG(elementsJG.queuePanel, queueSongs, 'queue');
    } else {
        console.warn("loadInitialDataJG: queuePanel not found for initial render.");
    }
    updateQueueCountBadgeJG();
    console.log("loadInitialDataJG - END");
}

function updateQueueCountBadgeJG() {
    if (elementsJG.queueCountBadge) {
        elementsJG.queueCountBadge.textContent = appStateJG.queue.length;
        elementsJG.queueCountBadge.style.display = appStateJG.queue.length > 0 ? 'inline-block' : 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded - START. Initializing safari...");
    initializeElementsJG();
    loadInitialDataJG();
    setupEventListenersJG();
    console.log("DOMContentLoaded - END. Event listeners set up.");
});

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded - START. Initializing safari...");
    initializeElementsJG(); // Initialize DOM elements first
    loadInitialDataJG();    // Load preferences, history, favorites from localStorage
    setupEventListenersJG();
    console.log("DOMContentLoaded - END. Event listeners set up. Waiting for YouTube API to call onYouTubeIframeAPIReady.");
    // Song loading (loadInitialSongsJG) is now triggered by onPlayerReadyJG
});

// window.onYouTubeIframeAPIReady is already set at the top
