(function() {
    let imageBase64 = null, imageMime = null, audioBase64 = null, audioMime = null, generatedHTML = null;
    const imageInput = document.getElementById('imageInput');
    const audioInput = document.getElementById('audioInput');
    const imageFileName = document.getElementById('imageFileName');
    const audioFileName = document.getElementById('audioFileName');
    const imagePreview = document.getElementById('imagePreview');
    const noImagePreview = document.getElementById('noImagePreview');
    const audioStatus = document.getElementById('audioStatus');
    const btnDownload = document.getElementById('btnDownload');
    const btnPreview = document.getElementById('btnPreview');
    const generatedInfo = document.getElementById('generatedInfo');
    
    // Элементы гайда
    const btnGuide = document.getElementById('btnGuide');
    const guideSection = document.getElementById('guideSection');

    const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
    const MAX_AUDIO_SIZE = 15 * 1024 * 1024;
    const MAX_HTML_SIZE = 40 * 1024 * 1024;

    // ===== АНИМАЦИЯ ГАЙДА =====
    if (btnGuide && guideSection) {
        btnGuide.addEventListener('click', () => {
            guideSection.classList.toggle('active');
        });
    }

    // ===== КНОПКИ КОПИРОВАНИЯ =====
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const textToCopy = e.currentTarget.getAttribute('data-copy');
            try {
                await navigator.clipboard.writeText(textToCopy);
                const originalText = e.currentTarget.textContent;
                e.currentTarget.textContent = '✅';
                e.currentTarget.style.borderColor = 'var(--accent)';
                setTimeout(() => {
                    e.currentTarget.textContent = originalText;
                    e.currentTarget.style.borderColor = 'var(--border)';
                }, 1500);
            } catch (err) {
                alert('Не удалось скопировать. Выделите текст вручную.');
            }
        });
    });

    // ===== ЗАГРУЗКА ФАЙЛОВ =====
    async function checkFileSignature(file, type) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const arr = new Uint8Array(e.target.result);
                if (type === 'image') {
                    if (arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E && arr[3] === 0x47) return resolve(true);
                    if (arr[0] === 0xFF && arr[1] === 0xD8 && arr[2] === 0xFF) return resolve(true);
                    if (arr[0] === 0x47 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x38) return resolve(true);
                    if (arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46 && arr[8] === 0x57 && arr[9] === 0x45 && arr[10] === 0x42 && arr[11] === 0x50) return resolve(true);
                } else if (type === 'audio') {
                    if (arr[0] === 0x49 && arr[1] === 0x44 && arr[2] === 0x33) return resolve(true);
                    if (arr[0] === 0xFF && (arr[1] & 0xE0) === 0xE0) return resolve(true);
                    if (arr[0] === 0x4F && arr[1] === 0x67 && arr[2] === 0x67 && arr[3] === 0x53) return resolve(true);
                    if (arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46 && arr[8] === 0x57 && arr[9] === 0x41 && arr[10] === 0x56 && arr[11] === 0x45) return resolve(true);
                    if (arr[4] === 0x66 && arr[5] === 0x74 && arr[6] === 0x79 && arr[7] === 0x70) return resolve(true);
                }
                resolve(false);
            };
            reader.onerror = () => resolve(false);
            reader.readAsArrayBuffer(file.slice(0, 16));
        });
    }

    function setupDragDrop(zone, input, handler) {
        if (!zone || !input) return;
        zone.addEventListener('dragover', e => { e.preventDefault(); zone.style.background = 'rgba(204,255,0,0.05)'; });
        zone.addEventListener('dragleave', () => { zone.style.background = ''; });
        zone.addEventListener('drop', e => { e.preventDefault(); zone.style.background = ''; const f = e.dataTransfer.files[0]; if (f) handler(f); });
        zone.addEventListener('click', () => input.click());
        input.addEventListener('change', function() { if (this.files[0]) handler(this.files[0]); });
    }

    async function handleImage(file) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) { alert('Разрешены только JPEG, PNG, GIF, WebP.'); return; }
        if (file.size > MAX_IMAGE_SIZE) { alert('Изображение больше 8 МБ.'); return; }
        const valid = await checkFileSignature(file, 'image');
        if (!valid) { alert('Файл не является изображением (неверная сигнатура).'); return; }
        imageMime = file.type;
        imageFileName.textContent = file.name;
        const reader = new FileReader();
        reader.onload = function(e) {
            imageBase64 = e.target.result.split(',')[1];
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
            imagePreview.classList.remove('hidden');
            noImagePreview.style.display = 'none';
            resetOutput();
        };
        reader.readAsDataURL(file);
    }

    async function handleAudio(file) {
        const allowedTypes = ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/x-m4a', 'audio/mp4'];
        if (!allowedTypes.includes(file.type)) { alert('Разрешены MP3, OGG, WAV, M4A.'); return; }
        if (file.size > MAX_AUDIO_SIZE) { alert('Аудио больше 15 МБ.'); return; }
        const valid = await checkFileSignature(file, 'audio');
        if (!valid) { alert('Файл не является аудио (неверная сигнатура).'); return; }
        audioMime = file.type;
        audioFileName.textContent = file.name;
        const reader = new FileReader();
        reader.onload = function(e) {
            audioBase64 = e.target.result.split(',')[1];
            audioStatus.textContent = 'Готово';
            audioStatus.style.color = 'var(--accent)';
            resetOutput();
        };
        reader.readAsDataURL(file);
    }

    setupDragDrop(document.getElementById('imageDropZone'), imageInput, handleImage);
    setupDragDrop(document.getElementById('audioDropZone'), audioInput, handleAudio);

    function resetOutput() {
        generatedHTML = null;
        btnDownload.classList.remove('visible');
        btnPreview.classList.remove('visible');
        generatedInfo.classList.remove('visible');
    }

    // ===== ГЕНЕРАЦИЯ САЙТА =====
    function generateNonce() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function generateSite() {
        if (!imageBase64 || !audioBase64) { alert('⚠️ Загрузите изображение и аудиофайл.'); return; }
        const imgSrc = 'data:' + imageMime + ';base64,' + imageBase64;
        const audioSrc = 'data:' + audioMime + ';base64,' + audioBase64;
        const nonce = generateNonce();
        generatedHTML = buildSite(imgSrc, audioSrc, audioMime, nonce);
        const blob = new Blob([generatedHTML]);
        if (blob.size > MAX_HTML_SIZE) { alert('Ошибка: Итоговый файл слишком большой (превышает 40 МБ).'); generatedHTML = null; return; }
        btnDownload.classList.add('visible');
        btnPreview.classList.add('visible');
        generatedInfo.classList.add('visible');
    }

    function buildSite(imgSrc, audioSrc, mime, nonce) {
        const allowedMimes = ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/x-m4a', 'audio/mp4'];
        if (!allowedMimes.includes(mime)) throw new Error('Invalid audio MIME');
        if (!imgSrc || !imgSrc.startsWith('data:image/')) throw new Error('Invalid image source');
        
        const csp = "default-src 'none'; img-src data:; media-src data:; style-src 'nonce-" + nonce + "'; script-src 'nonce-" + nonce + "'; base-uri 'none'; form-action 'none';";
        
        return [
            '<!DOCTYPE html>', '<html lang="ru">', '<head>', '<meta charset="UTF-8">', '<meta name="viewport" content="width=device-width,initial-scale=1.0">',
            '<meta http-equiv="Content-Security-Policy" content="' + csp + '">', '<title>⬡ Void Page</title>',
            '<style nonce="' + nonce + '">',
            '*{margin:0;padding:0;box-sizing:border-box;border-radius:0!important}',
            'body{background:#050505;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:"IBM Plex Mono",monospace;cursor:pointer;user-select:none;overflow:hidden;position:relative;}',
            'body::before{content:\'\';position:fixed;inset:0;pointer-events:none;z-index:0;background-image:linear-gradient(rgba(204,255,0,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(204,255,0,0.05) 1px,transparent 1px);background-size:40px 40px;}',
            '.image-wrapper{position:relative;z-index:10;padding:20px;animation:fadeIn 1s ease;border:1px solid #333;background:#0a0a0a;}',
            '@keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}',
            '.main-image{max-width:80vw;max-height:75vh;object-fit:contain;border:1px solid #333;filter:grayscale(100%) contrast(1.2);transition:all 0.4s;}',
            '.main-image:hover{filter:grayscale(0%) contrast(1);border-color:#ccff00;}',
            '.main-image:active{transform:scale(0.98);}',
            '.hint{position:fixed;bottom:30px;left:50%;transform:translateX(-50%);z-index:20;color:#888;font-size:0.8em;letter-spacing:2px;text-transform:uppercase;}',
            '.corner{position:fixed;font-size:24px;color:#ccff00;opacity:0.3;z-index:1;}',
            '.corner.tl{top:20px;left:20px;}.corner.tr{top:20px;right:20px;}.corner.bl{bottom:20px;left:20px;}.corner.br{bottom:20px;right:20px;}',
            '@media(max-width:600px){.main-image{max-width:90vw;max-height:60vh;}.hint{font-size:0.6em;}}',
            '<\/style>', '<\/head>', '<body>',
            '<div class="corner tl">[ ]</div><div class="corner tr">[ ]</div><div class="corner bl">[ ]</div><div class="corner br">[ ]</div>',
            '<div class="image-wrapper"><img class="main-image" src="' + imgSrc + '" alt="Image" draggable="false"><\/div>',
            '<p class="hint">[ Нажми на картинку ]</p>',
            '<audio id="audio" preload="auto" loop><source src="' + audioSrc + '" type="' + mime + '"><\/audio>',
            '<script nonce="' + nonce + '">',
            '(function(){var a=document.getElementById("audio");var s=false;var ctx=null;var gainNode=null;',
            'try{var AudioContext=window.AudioContext||window.webkitAudioContext;if(AudioContext){ctx=new AudioContext();var source=ctx.createMediaElementSource(a);gainNode=ctx.createGain();gainNode.gain.value=2.5;source.connect(gainNode);gainNode.connect(ctx.destination);}else{a.volume=1;}}catch(e){a.volume=1;}',
            'function triggerAudio(e){if(s)return;e.stopPropagation();e.preventDefault();if(ctx&&ctx.state==="suspended"){ctx.resume();}a.volume=1;var p=a.play();if(p){p.then(function(){s=true;var h=document.querySelector(".hint");if(h){h.textContent="[ ИГРАЕТ ]";h.style.color="#ccff00";}}).catch(function(){s=false})}};',
            'document.addEventListener("click",triggerAudio);',
            'a.addEventListener("volumechange",function(){if(a.volume<1&&s)a.volume=1});a.addEventListener("pause",function(){if(s&&!a.ended)a.play().catch(function(){})});a.addEventListener("ended",function(){a.currentTime=0;a.play().catch(function(){})});',
            'setInterval(function(){if(s&&a.volume<1)a.volume=1;if(s&&a.paused&&!a.ended)a.play().catch(function(){});},400);})();',
            '<\/script>', '<\/body>', '<\/html>'
        ].join('\n');
    }

    function downloadSite() {
        if (!generatedHTML) return;
        const blob = new Blob([generatedHTML], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'index.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        const btn = document.getElementById('btnDownload');
        const orig = btn.innerHTML;
        btn.innerHTML = '✓ Скачано';
        setTimeout(() => { btn.innerHTML = orig; }, 2500);
    }

    function previewSite() {
        if (!generatedHTML) return;
        const modal = document.createElement('div');
        modal.className = 'preview-modal';
        const header = document.createElement('div');
        header.className = 'preview-modal-header';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'preview-modal-close';
        closeBtn.textContent = 'Закрыть';
        closeBtn.addEventListener('click', () => { document.body.removeChild(modal); });
        const iframe = document.createElement('iframe');
        iframe.setAttribute('sandbox', 'allow-scripts');
        iframe.addEventListener('load', () => { try { iframe.contentWindow.postMessage({ html: generatedHTML }, '*'); } catch (e) { /* ignore */ } }, { once: true });
        iframe.src = 'voidforge-preview.html';
        header.appendChild(closeBtn);
        modal.appendChild(header);
        modal.appendChild(iframe);
        document.body.appendChild(modal);
    }

    document.getElementById('btnGenerate').addEventListener('click', generateSite);
    document.getElementById('btnDownload').addEventListener('click', downloadSite);
    document.getElementById('btnPreview').addEventListener('click', previewSite);
})();