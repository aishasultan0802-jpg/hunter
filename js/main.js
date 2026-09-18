// Sağ düyməni bloklayır
        document.addEventListener('contextmenu', e => e.preventDefault());
        
        // Mətnin və elementlərin seçilməsini bloklayır
        document.onselectstart = () => false;
        
        // F12, Ctrl+U, Ctrl+Shift+I/C/J kimi qısa yolları bloklayır
        document.onkeydown = e => {
            if (e.keyCode == 123 || 
               (e.ctrlKey && e.shiftKey && (e.keyCode == 73 || e.keyCode == 67 || e.keyCode == 74)) || 
               (e.ctrlKey && e.keyCode == 85)) {
                return false;
            }
        };

const firebaseConfig = {
            apiKey: "AIzaSyANT73cWZ32ymEjiis3JHo4u0xlPhExGYg",
            authDomain: "duckhuntergame-35c6c.firebaseapp.com",
            databaseURL: "https://duck-hunt-game-a0f5d-default-rtdb.firebaseio.com",
            projectId: "duck-hunt-game-a0f5d",
            storageBucket: "duckhuntergame-35c6c.firebasestorage.app",
            messagingSenderId: "583544426641",
            appId: "1:583544426641:web:04bcbe7b38ab50fead6f30"
        };
        
        firebase.initializeApp(firebaseConfig);
        const database = firebase.database();

        const isGameplayPage = window.location.pathname.toLowerCase().endsWith('/gameplay.html') || window.location.pathname.toLowerCase().endsWith('gameplay.html');

        let score = 0;
        let ducksHit = 0;
        let totalDucksSpawned = 0;
        let currentLevel = 1;
        let timeLeft = 60;
        let ammoLeft = 3; 
        let comboCount = 0; 
        let playerName = "";
        let isDuckActive = false;
        let gameActive = false;
        
        let levelDuckCount = 0; 
        let goldenDuckSpawnRounds = []; 

        let timerInterval;
        let duckMoveInterval;
        let duckFallInterval;
        let duckSpawnTimeout = null;
        let duckHitProcessed = false;
        let currentDuckElement = null;

        function playQuackSound() {
            try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const filter = audioCtx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(450, audioCtx.currentTime);
                filter.Q.setValueAtTime(3, audioCtx.currentTime);
                filter.connect(audioCtx.destination);

                let osc1 = audioCtx.createOscillator();
                let osc2 = audioCtx.createOscillator();
                let gain = audioCtx.createGain();

                osc1.type = 'sawtooth'; osc2.type = 'triangle';
                osc1.frequency.setValueAtTime(320, audioCtx.currentTime);
                osc1.frequency.linearRampToValueAtTime(180, audioCtx.currentTime + 0.15);
                osc2.frequency.setValueAtTime(640, audioCtx.currentTime); 
                osc2.frequency.linearRampToValueAtTime(360, audioCtx.currentTime + 0.15);

                gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.16);

                osc1.connect(gain); osc2.connect(gain); gain.connect(filter);
                osc1.start(); osc2.start();
                osc1.stop(audioCtx.currentTime + 0.16); osc2.stop(audioCtx.currentTime + 0.16);
            } catch(e) {}
        }

        function playComboSound() {
            try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); 
                osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); 
                osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); 
                osc.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.3); 
                gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
                gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
                osc.connect(gain); gain.connect(audioCtx.destination);
                osc.start(); osc.stop(audioCtx.currentTime + 0.5);
            } catch(e) {}
        }

        function playShotSound() {
            try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = audioCtx.createOscillator();
                const oscGain = audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(160, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.15);
                oscGain.gain.setValueAtTime(0.5, audioCtx.currentTime);
                oscGain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
                
                const bufferSize = audioCtx.sampleRate * 0.3;
                const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
                const noise = audioCtx.createBufferSource();
                noise.buffer = buffer;
                
                const filter = audioCtx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(800, audioCtx.currentTime);
                const noiseGain = audioCtx.createGain();
                noiseGain.gain.setValueAtTime(0.4, audioCtx.currentTime);
                noiseGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
                
                osc.connect(oscGain); oscGain.connect(audioCtx.destination);
                noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(audioCtx.destination);
                osc.start(); noise.start();
                osc.stop(audioCtx.currentTime + 0.25); noise.stop(audioCtx.currentTime + 0.25);
            } catch(e) {}
        }

        function playEmptySound() {
            try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(120, audioCtx.currentTime);
                gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
                gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
                osc.connect(gain); gain.connect(audioCtx.destination);
                osc.start(); osc.stop(audioCtx.currentTime + 0.05);
            } catch(e) {}
        }

        function playDuckHitSound() {
            try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(450, audioCtx.currentTime);
                osc.frequency.linearRampToValueAtTime(150, audioCtx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
                gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
                osc.connect(gain); gain.connect(audioCtx.destination);
                osc.start(); osc.stop(audioCtx.currentTime + 0.1);
            } catch(e) {}
        }

        function playFallingSound() {
            try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(700, audioCtx.currentTime);
                osc.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.7);
                gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
                gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.7);
                osc.connect(gain); gain.connect(audioCtx.destination);
                osc.start(); osc.stop(audioCtx.currentTime + 0.7);
            } catch(e) {}
        }

        function playGoldenHitSound() {
            try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const osc1 = audioCtx.createOscillator();
                const osc2 = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                
                osc1.type = 'sine'; osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime); 
                osc2.type = 'sine'; osc2.frequency.setValueAtTime(880, audioCtx.currentTime); 
                
                gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
                
                osc1.connect(gain); osc2.connect(gain); gain.connect(audioCtx.destination);
                osc1.start(); osc2.start();
                osc1.stop(audioCtx.currentTime + 0.4); osc2.stop(audioCtx.currentTime + 0.4);
            } catch(e) {}
        }

        const gameContainer = document.getElementById('game-container');
        const mainWrapper = document.getElementById('main-wrapper');
        const scoreDisplay = document.getElementById('score-display');
        const playerDisplay = document.getElementById('player-display');
        const timerDisplay = document.getElementById('timer-display');
        const levelDisplay = document.getElementById('level-display');
        const ammoDisplay = document.getElementById('ammo-display');
        const comboDisplay = document.getElementById('combo-display');
        const crosshair = document.getElementById('crosshair');
        const flashEffect = document.getElementById('flash-effect');
        const levelAnnouncer = document.getElementById('level-announcer');
        const announceTitle = document.getElementById('announce-title');
        const scoreRowsContainer = document.getElementById('score-rows-container');
        const hunterIdPreview = document.getElementById('hunter-id-preview');
        const bonusPopup = document.getElementById('bonus-popup');
        const comboAlert = document.getElementById('combo-alert');

        const grassContainer = document.getElementById('grass-container');
        if (grassContainer) {
            const totalBlades = Math.ceil(1180 / 8);
            for (let i = 0; i < totalBlades; i++) {
                const blade = document.createElement('div');
                blade.className = 'grass-blade';
                blade.style.left = (i * 8) + 'px';
                blade.style.borderBottomWidth = (Math.random() * 20 + 25) + 'px';
                blade.style.borderLeftWidth = '7px'; blade.style.borderRightWidth = '7px';
                const greenTones = ['#388e3c', '#2e7d32', '#4caf50', '#1b5e20'];
                blade.style.borderBottomColor = greenTones[Math.floor(Math.random() * greenTones.length)];
                blade.style.transform = `rotate(${(Math.random() * 10 - 5)}deg)`;
                grassContainer.appendChild(blade);
            }
        }

        if (scoreRowsContainer) {
            database.ref('scores').on('value', (snapshot) => {
                let scoresArray = [];
                snapshot.forEach((childSnapshot) => {
                    const value = childSnapshot.val() || {};
                    // Yalnız minimum 300 xal toplayan oyunçular siyahıda göstərilir.
                    if (Number(value.points) >= 300) {
                        scoresArray.push(value);
                    }
                });
                scoresArray.sort((a, b) => b.points - a.points);
                updateScoreboardView(scoresArray);
            });
        }

        if (gameContainer) gameContainer.addEventListener('mousemove', (e) => {
            const rect = gameContainer.getBoundingClientRect();
            crosshair.style.left = (e.clientX - rect.left) + 'px';
            crosshair.style.top = (e.clientY - rect.top) + 'px';
        });
        if (gameContainer) gameContainer.addEventListener('mouseenter', () => crosshair.style.display = 'block');
        if (gameContainer) gameContainer.addEventListener('mouseleave', () => crosshair.style.display = 'none');

        if (gameContainer) gameContainer.addEventListener('mousedown', (e) => {
            if(!gameActive) return;
            if(e.target.closest('.duck')) return;
            if(ammoLeft <= 0) { playEmptySound(); return; }

            ammoLeft--;
            ammoDisplay.textContent = `Güllə: ${ammoLeft}/3`;
            resetCombo();

            playShotSound(); 
            flashEffect.style.display = 'block';
            setTimeout(() => { flashEffect.style.display = 'none'; }, 60);
        });

        function resetCombo() {
            comboCount = 0;
            comboDisplay.style.display = 'none';
        }

        function triggerComboVisual(text) {
            comboAlert.textContent = text;
            comboAlert.style.display = 'block';
            comboAlert.classList.remove('combo-animate');
            void comboAlert.offsetWidth; 
            comboAlert.classList.add('combo-animate');
            playComboSound();
            setTimeout(() => { comboAlert.style.display = 'none'; }, 1000);
        }

        function getDuckSVG(isGolden) {
            const bodyColor = isGolden ? "#ffd700" : "#8d6e63";
            const shadowColor = isGolden ? "#ffa500" : "#5d4037";
            const headColor = isGolden ? "#ffe066" : "#2e7d32";
            const chestColor = isGolden ? "#fff5cc" : "#bcaaa4";
            const darkColor = isGolden ? "#b38f00" : "#4e342e";
            const wingColor = isGolden ? "#e6b800" : "#5d4037";
            const wingInner = isGolden ? "#fff0b3" : "#bcaaa4";
            const wingStroke = isGolden ? "#b38f00" : "#3e2723";

            return `
                <svg viewBox="0 0 110 90" width="100%" height="100%">
                    <polygon points="20,55 5,40 25,43" fill="${isGolden ? shadowColor : '#2c1d11'}" />
                    <polygon points="22,50 8,32 25,38" fill="${shadowColor}" />
                    <ellipse cx="50" cy="52" rx="34" ry="20" fill="${bodyColor}" />
                    <path d="M 40,34 Q 55,34 65,52 Q 55,72 40,52 Z" fill="${chestColor}" /> 
                    <rect x="42" y="52" width="25" height="12" fill="${darkColor}" rx="5"/>
                    <path d="M 68,45 C 75,45 78,30 75,20 C 85,15 90,25 85,38 Z" fill="${headColor}" />
                    <circle cx="78" cy="22" r="12" fill="${headColor}" />
                    <rect x="70" y="32" width="12" height="3" fill="#ffffff" transform="rotate(15 70 32)"/>
                    <circle cx="82" cy="18" r="3" fill="#ffffff" />
                    <circle cx="82.5" cy="18" r="1.5" fill="#000000" />
                    <path d="M 88,18 L 106,24 L 88,28 Z" fill="#ffca28" />
                    <polygon points="40,70 35,82 45,82" fill="#ff7043" />
                    <polygon points="52,70 48,82 58,82" fill="#ff7043" />
                    <g class="duck-wing">
                        <path d="M 35,50 C 20,15 45,2 52,25 C 55,35 48,50 35,50 Z" fill="${wingColor}" stroke="${wingStroke}" stroke-width="1.5"/>
                        <path d="M 38,45 C 28,25 44,15 48,32 Z" fill="${wingInner}" />
                    </g>
                </svg>
            `;
        }

        async function hashPassword(password) {
            const data = new TextEncoder().encode(password);
            const digest = await crypto.subtle.digest('SHA-256', data);
            return Array.from(new Uint8Array(digest))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        }

        function normalizePlayerKey(firstname, lastname) {
            return `${firstname.trim()} ${lastname.trim()}`
                .toLocaleLowerCase('az-AZ')
                .replace(/\s+/g, ' ')
                .replace(/[.#$\[\]\/]/g, '_');
        }

        function formatHunterIdNumber(hunterId) {
            const match = String(hunterId || '').match(/Ovçu-ID(\d{5})$/);
            return match ? match[1] : '';
        }

        function showHunterIdPreview(hunterId, isError = false) {
            const num = formatHunterIdNumber(hunterId);
            hunterIdPreview.style.color = isError ? '#d32f2f' : '#2e7d32';
            hunterIdPreview.textContent = isError
                ? 'Şifrə yanlışdır. Zəhmət olmasa yenidən yoxlayın.'
                : (num ? `Sizin ID: Ovçu-ID${num}` : '');
        }

        async function findExistingHunter(firstname, lastname) {
            const userKey = normalizePlayerKey(firstname, lastname);
            const v3Snapshot = await database.ref('credentialsV3/' + userKey).once('value');
            if (v3Snapshot.exists()) {
                return { ref: v3Snapshot.ref, data: v3Snapshot.val(), userKey };
            }

            const v2Snapshot = await database.ref('credentialsV2/' + userKey).once('value');
            if (v2Snapshot.exists()) {
                let firstRecord = null;
                v2Snapshot.forEach((child) => {
                    if (!firstRecord && child.val()) firstRecord = child.val();
                });
                if (firstRecord && firstRecord.hunterId) {
                    return { ref: database.ref('credentialsV3/' + userKey), data: firstRecord, userKey };
                }
            }

            const legacySnapshot = await database.ref('credentials/' + userKey).once('value');
            if (legacySnapshot.exists()) {
                const legacyPassword = legacySnapshot.val();
                if (typeof legacyPassword === 'string') {
                    return { ref: null, data: { legacyPassword }, userKey };
                }
            }

            return { ref: null, data: null, userKey };
        }

        async function reserveNewHunterId(userKey, passwordHash, firstname, lastname) {
            let result = await database.ref('hunterCounter').transaction((current) => (current || 0) + 1);
            let candidateId = `Ovçu-ID${String(result.snapshot.val()).padStart(5, '0')}`;
            const hunterRef = database.ref('credentialsV3/' + userKey);
            const registration = await hunterRef.transaction((current) => current || {
                hunterId: candidateId,
                passwordHash: passwordHash,
                ad: firstname,
                soyad: lastname,
                name: `${firstname} ${lastname}`
            });

            const finalData = registration.snapshot.val();
            return {
                hunterId: finalData.hunterId,
                passwordHash: finalData.passwordHash,
                ad: finalData.ad,
                soyad: finalData.soyad,
                name: finalData.name
            };
        }

        let passwordConfirmed = false;
        let confirmedHunterId = '';
        let confirmedCredentialsKey = '';
        let confirmedPasswordHash = '';
        let confirmedPasswordValue = '';
        let confirmationVersion = 0;

        function clearPasswordConfirmation() {
            confirmationVersion++;
            passwordConfirmed = false;
            confirmedHunterId = '';
            confirmedCredentialsKey = '';
            confirmedPasswordHash = '';
            confirmedPasswordValue = '';
            window.currentHunterId = '';
            showHunterIdPreview('');
        }

        if (!isGameplayPage) {
            ['firstname', 'lastname', 'password'].forEach((id) => {
                const field = document.getElementById(id);
                if (!field) return;
                field.addEventListener('input', clearPasswordConfirmation);
                field.addEventListener('change', clearPasswordConfirmation);
                field.addEventListener('paste', () => setTimeout(clearPasswordConfirmation, 0));
            });
        }

        function enforceCurrentConfirmation() {
            const firstname = document.getElementById('firstname').value.trim();
            const lastname = document.getElementById('lastname').value.trim();
            const password = document.getElementById('password').value;
            const currentKey = normalizePlayerKey(firstname, lastname);

            // İstifadəçi təsdiqdən sonra şifrəni/Adı/Soyadı dəyişibsə,
            // köhnə təsdiqi və İD-ni heç bir halda saxlamırıq.
            if (!passwordConfirmed ||
                currentKey !== confirmedCredentialsKey ||
                password !== confirmedPasswordValue) {
                if (hunterIdPreview.textContent && !hunterIdPreview.textContent.startsWith('Şifrə yanlışdır')) clearPasswordConfirmation();
            }
        }

        // Brauzer tərəfindən dəyər dəyişdirilməsi kimi hallarda da köhnə İD-ni qoruyuruq.
        if (!isGameplayPage) setInterval(enforceCurrentConfirmation, 100);

        async function confirmPassword() {
            const requestVersion = ++confirmationVersion;
            passwordConfirmed = false;
            confirmedHunterId = '';
            confirmedCredentialsKey = '';
            confirmedPasswordHash = '';
            confirmedPasswordValue = '';
            window.currentHunterId = '';
            showHunterIdPreview('');

            const firstname = document.getElementById('firstname').value.trim();
            const lastname = document.getElementById('lastname').value.trim();
            const password = document.getElementById('password').value;

            if (!firstname || !lastname || !password) {
                alert('Zəhmət olmasa Ad, Soyad və Şifrə sahələrini tam doldurun!');
                return;
            }

            const validName = /^[A-Za-zƏəÖöÜüĞğÇçŞşİı]+(?:[ -][A-Za-zƏəÖöÜüĞğÇçŞşİı]+)*$/;
            if (!validName.test(firstname) || !validName.test(lastname)) {
                alert('Ad və Soyad yalnız hərflərdən, boşluqdan və defisdən ibarət ola bilər!');
                return;
            }

            const userKey = normalizePlayerKey(firstname, lastname);

            try {
                const existing = await findExistingHunter(firstname, lastname);
                if (requestVersion !== confirmationVersion) return;

                if (existing.data && existing.data.hunterId) {
                    let storedPasswordHash = existing.data.passwordHash;

                    // Köhnə V2 qeydiyyatında hash ayrıca açarda saxlanılıbsa onu tapırıq.
                    if (!storedPasswordHash) {
                        const v2Snapshot = await database.ref('credentialsV2/' + existing.userKey).once('value');
                        if (requestVersion !== confirmationVersion) return;
                        v2Snapshot.forEach((child) => {
                            if (!storedPasswordHash && child.val() && child.val().hunterId === existing.data.hunterId) {
                                storedPasswordHash = child.key;
                            }
                        });
                    }

                    if (existing.data.resetPassword) {
                        const resetPassword = String(existing.data.resetPassword);
                        const resetPasswordHash = await hashPassword(resetPassword);

                        await existing.ref.update({
                            passwordHash: resetPasswordHash,
                            resetPassword: null
                        });

                        existing.data.passwordHash = resetPasswordHash;
                        delete existing.data.resetPassword;
                        storedPasswordHash = resetPasswordHash;
                    }

                    const typedPasswordHash = storedPasswordHash ? await hashPassword(password) : '';
                    if (requestVersion !== confirmationVersion) return;

                    if (storedPasswordHash && storedPasswordHash === typedPasswordHash) {
                        passwordConfirmed = true;
                        confirmedHunterId = existing.data.hunterId;
                        confirmedCredentialsKey = existing.userKey;
                        confirmedPasswordHash = typedPasswordHash;
                        confirmedPasswordValue = password;
                        window.currentHunterId = existing.data.hunterId;
                        showHunterIdPreview(existing.data.hunterId);
                    } else {
                        showHunterIdPreview('', true);
                    }
                    return;
                }

                if (existing.data && existing.data.legacyPassword) {
                    if (existing.data.legacyPassword === password) {
                        const typedPasswordHash = await hashPassword(password);
                        if (requestVersion !== confirmationVersion) return;

                        const migrated = await reserveNewHunterId(existing.userKey, typedPasswordHash, firstname, lastname);
                        if (requestVersion !== confirmationVersion) return;

                        passwordConfirmed = true;
                        confirmedHunterId = migrated.hunterId;
                        confirmedCredentialsKey = existing.userKey;
                        confirmedPasswordHash = typedPasswordHash;
                        confirmedPasswordValue = password;
                        window.currentHunterId = migrated.hunterId;
                        showHunterIdPreview(migrated.hunterId);
                    } else {
                        showHunterIdPreview('', true);
                    }
                    return;
                }

                // Yeni istifadəçi üçün ŞİFRƏNİ TƏSDİQLƏ düyməsi vurulan kimi
                // İD və həmin şifrə Firebase-də qeydiyyata alınır. Bundan sonra
                // eyni Ad + Soyad üçün başqa şifrə yeni qeydiyyat yarada bilməz.
                const typedPasswordHash = await hashPassword(password);
                if (requestVersion !== confirmationVersion) return;

                const newHunter = await reserveNewHunterId(userKey, typedPasswordHash, firstname, lastname);
                if (requestVersion !== confirmationVersion) return;

                passwordConfirmed = true;
                confirmedHunterId = newHunter.hunterId;
                confirmedCredentialsKey = userKey;
                confirmedPasswordHash = newHunter.passwordHash;
                confirmedPasswordValue = password;
                window.currentHunterId = newHunter.hunterId;
                showHunterIdPreview(newHunter.hunterId);
            } catch (e) {
                if (requestVersion !== confirmationVersion) return;
                passwordConfirmed = false;
                confirmedHunterId = '';
                confirmedCredentialsKey = '';
                confirmedPasswordHash = '';
                window.currentHunterId = '';
                showHunterIdPreview('');
                alert('Şifrə təsdiqlənərkən xəta baş verdi. Yenidən cəhd edin.');
            }
        }

        async function startGame() {
            const firstname = document.getElementById('firstname').value.trim();
            const lastname = document.getElementById('lastname').value.trim();
            const password = document.getElementById('password').value;
            const userKey = normalizePlayerKey(firstname, lastname);

            if (!firstname || !lastname || !password) {
                alert("Zəhmət olmasa Ad, Soyad və Şifrə sahələrini tam doldurun!");
                return;
            }

            const validName = /^[A-Za-zƏəÖöÜüĞğÇçŞşİı]+(?:[ -][A-Za-zƏəÖöÜüĞğÇçŞşİı]+)*$/;
            if (!validName.test(firstname) || !validName.test(lastname)) {
                alert("Ad və Soyad yalnız hərflərdən, boşluqdan və defisdən ibarət ola bilər!");
                return;
            }

            const passwordHash = await hashPassword(password);

            // İD yalnız məhz hazırkı Ad + Soyad + Şifrə kombinasiyası təsdiqlənibsə keçərlidir.
            if (!passwordConfirmed ||
                confirmedCredentialsKey !== userKey ||
                confirmedPasswordHash !== passwordHash ||
                confirmedPasswordValue !== password ||
                !confirmedHunterId ||
                window.currentHunterId !== confirmedHunterId) {
                showHunterIdPreview('');
                window.currentHunterId = '';
                passwordConfirmed = false;
                confirmedHunterId = '';
                confirmedCredentialsKey = '';
                confirmedPasswordHash = '';
                alert("Zəhmət olmasa hazırkı şifrənizi yenidən 'ŞİFRƏNİ TƏSDİQLƏ' düyməsi ilə təsdiqləyin!");
                return;
            }

            playerName = `${firstname} ${lastname}`;

            try {
                const existing = await findExistingHunter(firstname, lastname);

                // Təsdiqdən sonra məlumatların dəyişdirilmədiyini yenidən yoxlayırıq.
                if (!passwordConfirmed ||
                    confirmedCredentialsKey !== userKey ||
                    confirmedPasswordHash !== passwordHash ||
                    confirmedPasswordValue !== password ||
                    window.currentHunterId !== confirmedHunterId) {
                    showHunterIdPreview('');
                    window.currentHunterId = '';
                    alert("Məlumatlar dəyişdirilib. Şifrənizi yenidən təsdiqləyin!");
                    return;
                }

                // Eyni Ad + Soyad yalnız bir dəfə qeydiyyatdan keçə bilər.
                if (existing.data) {
                    let hunterId = existing.data.hunterId;
                    let storedPasswordHash = existing.data.passwordHash;

                    if (!hunterId && existing.data.legacyPassword) {
                        const migrated = await reserveNewHunterId(userKey, passwordHash, firstname, lastname);
                        hunterId = migrated.hunterId;
                        storedPasswordHash = migrated.passwordHash;
                    } else if (hunterId && !storedPasswordHash) {
                        const v2Snapshot = await database.ref('credentialsV2/' + userKey).once('value');
                        v2Snapshot.forEach((child) => {
                            if (!storedPasswordHash && child.val() && child.val().hunterId === hunterId) {
                                storedPasswordHash = child.key;
                            }
                        });
                    }

                    // Əvvəldən qeydiyyatdan keçmiş oyunçu üçün şifrə MÜTLƏQ uyğun olmalıdır.
                    if (!hunterId || storedPasswordHash !== passwordHash || hunterId !== confirmedHunterId) {
                        clearPasswordConfirmation();
                        showHunterIdPreview('', true);
                        alert("⚠️ Şifrəniz doğru deyil!");
                        return;
                    }

                    window.currentHunterId = hunterId;
                    showHunterIdPreview(hunterId);
                    proceedToGame();
                    return;
                }

                // Yeni istifadəçi üçün qeydiyyat yalnız təsdiqlənmiş şifrə ilə yaradılır.
                const newHunter = await reserveNewHunterId(userKey, passwordHash, firstname, lastname);
                if (newHunter.hunterId !== confirmedHunterId) {
                    clearPasswordConfirmation();
                    showHunterIdPreview('', true);
                    alert("⚠️ İD təsdiqlənmədi. Şifrənizi yenidən təsdiqləyin!");
                    return;
                }

                window.currentHunterId = newHunter.hunterId;
                showHunterIdPreview(newHunter.hunterId);
                proceedToGame();
            } catch (e) {
                alert("⚠️ Qeydiyyat zamanı xəta baş verdi. Yenidən cəhd edin.");
            }
        }

        function proceedToGame() {
            sessionStorage.setItem('duckHunterPlayerName', playerName);
            sessionStorage.setItem('duckHunterId', window.currentHunterId || '');
            window.location.href = 'gameplay.html';
        }

        function startLevel(lvl) {
            if (duckSpawnTimeout !== null) {
                clearTimeout(duckSpawnTimeout);
                duckSpawnTimeout = null;
            }
            currentLevel = lvl;
            timeLeft = 60;
            isDuckActive = false;
            gameActive = false;
            levelDuckCount = 0;
            resetCombo();

            const firstGolden = Math.floor(Math.random() * 3) + 2; 
            const secondGolden = Math.floor(Math.random() * 3) + 6; 
            goldenDuckSpawnRounds = [firstGolden, secondGolden];
            
            levelDisplay.textContent = `Mərhələ: ${currentLevel}`;
            timerDisplay.textContent = `Vaxt: ${timeLeft}`;
            scoreDisplay.textContent = `Xal: ${score}`;
            
            ammoLeft = 3;
            ammoDisplay.textContent = `Güllə: ${ammoLeft}/3`;
            
            announceTitle.textContent = `MƏRHƏLƏ ${currentLevel}`;
            levelAnnouncer.style.opacity = '1';
            
            setTimeout(() => {
                levelAnnouncer.style.opacity = '0';
                gameActive = true;
                startTimer();
                nextDuckManager();
            }, 2000);
        }

        function startTimer() {
            clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                if(!gameActive) return;
                timeLeft--;
                timerDisplay.textContent = `Vaxt: ${timeLeft}`;
                
                if(timeLeft <= 0) {
                    clearInterval(timerInterval);
                    endLevelLogic();
                }
            }, 1000);
        }

        function endLevelLogic() {
            gameActive = false;
            clearCurrentDuck();

            if (currentLevel === 1) {
                if (ducksHit === 0) {
                    alert(`Oyunu uduzdunuz! Sıfır ördək vurduğunuz üçün 2-ci mərhələyə buraxılmırsınız.`);
                    gameOver(true);
                } else if (ducksHit < 5) {
                    alert(`Oyunu uduzdunuz! Siz ${ducksHit} ördək vurdunuz. 2-ci mərhələyə keçmək üçün ən az 5 ədəd ördək vurulmalıdır!`);
                    gameOver(true);
                } else {
                    alert(`Təbriklər! 1-ci mərhələni tamamladınız. Sürətli olan 2-ci mərhələ başlayır!`);
                    startLevel(2);
                }
            } else if (currentLevel === 2) {
                alert(`Mükəmməl! Hər iki mərhələni tamamladınız. Yekun xalınız: ${score}`);
                gameOver(false);
            }
        }

        async function gameOver(isDisqualified) {
            gameActive = false;
            clearInterval(timerInterval);
            clearCurrentDuck();
            
            let missedDucks = totalDucksSpawned - ducksHit;
            if(isDisqualified) { missedDucks = 999; }
            
            await saveScoreFirebase(playerName, score, missedDucks);

            if (isGameplayPage) {
                const medal = getMedalByScore(score);
                if (!isDisqualified && medal) {
                    alert(`Yekun xalınız: ${score} — ${medal} medal qazandınız!`);
                }
                sessionStorage.removeItem('duckHunterPlayerName');
                sessionStorage.removeItem('duckHunterId');
                window.location.href = 'index.html';
                return;
            }

            gameContainer.style.display = 'none';
            mainWrapper.style.display = 'flex';
            document.getElementById('password').value = ""; 
        }

        function clearCurrentDuck() {
            if (duckSpawnTimeout !== null) {
                clearTimeout(duckSpawnTimeout);
                duckSpawnTimeout = null;
            }
            if(currentDuckElement) {
                currentDuckElement.remove();
                currentDuckElement = null;
            }
            clearInterval(duckMoveInterval);
            clearInterval(duckFallInterval);
            isDuckActive = false;
        }

        function nextDuckManager() {
            if (!gameActive || isDuckActive || duckSpawnTimeout !== null) return;
            duckSpawnTimeout = setTimeout(() => {
                duckSpawnTimeout = null;
                createDuck();
            }, Math.random() * 600 + 400);
        }

        function createDuck() {
            if (!gameActive || isDuckActive) return;
            isDuckActive = true;
            duckHitProcessed = false;
            totalDucksSpawned++;
            levelDuckCount++;
            
            ammoLeft = 3;
            ammoDisplay.textContent = `Güllə: ${ammoLeft}/3`;
            
            const isGoldenDuck = goldenDuckSpawnRounds.includes(levelDuckCount);

            const duck = document.createElement('div');
            duck.className = 'duck';
            if (isGoldenDuck) { duck.classList.add('golden-duck'); }
            duck.innerHTML = getDuckSVG(isGoldenDuck);
            currentDuckElement = duck;

            const fromLeft = Math.random() > 0.5;
            let startX, startY;
            const verticalVariation = Math.random() * 140; 

            if (fromLeft) {
                startX = -120; startY = (360 - verticalVariation); duck.style.transform = 'scaleX(1)'; 
            } else {
                startX = 1200; startY = (360 - verticalVariation); duck.style.transform = 'scaleX(-1)'; 
            }

            duck.style.left = startX + 'px'; duck.style.top = startY + 'px';
            gameContainer.appendChild(duck);

            playQuackSound();

            let speedMultiplier = currentLevel === 2 ? 1.95 : 1.0;
            if (isGoldenDuck) speedMultiplier *= 1.25;

            let speedX = (fromLeft ? (Math.random() * 2 + 4.5) : -(Math.random() * 2 + 4.5)) * speedMultiplier;
            let speedY = (-(Math.random() * 2 + 2)) * speedMultiplier; 

            let missedTracked = false;

            duckMoveInterval = setInterval(() => {
                if(!gameActive) { clearCurrentDuck(); return; }
                startX += speedX; startY += speedY;
                duck.style.left = startX + 'px'; duck.style.top = startY + 'px';

                if (startX > 1300 || startX < -200 || startY < -100) { 
                    if(!missedTracked) {
                        missedTracked = true;
                        resetCombo(); 
                    }
                    clearCurrentDuck(); nextDuckManager(); 
                }
            }, 20);

            duck.addEventListener('mousedown', (e) => {
                if(!gameActive || duckHitProcessed) return;
                if(ammoLeft <= 0) { playEmptySound(); return; }
                
                e.stopPropagation();
                duckHitProcessed = true; 

                ammoLeft--;
                ammoDisplay.textContent = `Güllə: ${ammoLeft}/3`;
                comboCount++;

                let calculatedPoints = 0;
                let isComboActive = comboCount >= 3;

                if (isComboActive) {
                    comboDisplay.style.display = 'block';
                    comboDisplay.textContent = `Kombi: X${comboCount} 🔥`;
                    
                    if(comboCount === 3) triggerComboVisual("SUPER!");
                    else if(comboCount === 5) triggerComboVisual("MÜKƏMMƏL!");
                }

                if (isGoldenDuck) {
                    playGoldenHitSound();
                    calculatedPoints = isComboActive ? 50 : 25; 
                    score += calculatedPoints;
                    timeLeft += 5; 
                    timerDisplay.textContent = `Vaxt: ${timeLeft}`;
                    
                    bonusPopup.style.left = e.clientX - gameContainer.getBoundingClientRect().left + 'px';
                    bonusPopup.style.top = e.clientY - gameContainer.getBoundingClientRect().top + 'px';
                    bonusPopup.style.display = 'block';
                    
                    setTimeout(() => { bonusPopup.style.display = 'none'; }, 1200);
                } else {
                    playDuckHitSound(); 
                    calculatedPoints = isComboActive ? 10 : 5; 
                    score += calculatedPoints; 
                    setTimeout(() => { playFallingSound(); }, 80);
                }

                duck.classList.add('hit'); 
                ducksHit++;
                scoreDisplay.textContent = `Xal: ${score}`;
                
                clearInterval(duckMoveInterval);
                const wing = duck.querySelector('.duck-wing');
                if (wing) wing.style.animation = 'none';
                
                duck.style.transform = fromLeft ? 'rotate(135deg)' : 'scaleX(-1) rotate(135deg)';

                let fallY = startY;
                duckFallInterval = setInterval(() => {
                    fallY += 12; 
                    duck.style.top = fallY + 'px';

                    if (fallY > 450) {
                        clearCurrentDuck();
                        nextDuckManager(); 
                    }
                }, 20);
            });
        }

        function getMedalByScore(points) {
            const pts = Number(points) || 0;
            if (pts >= 551) return '🥇 Qızıl';
            if (pts >= 500) return '🥈 Gümüş';
            if (pts >= 470) return '🥉 Bürünc';
            return '';
        }

        async function saveScoreFirebase(name, pts, missed) {
            const hunterId = window.currentHunterId;
            const scoreRef = database.ref('scores/' + hunterId);
            const medal = getMedalByScore(pts);

            const snapshot = await scoreRef.once('value');
            if (snapshot.exists()) {
                if (pts > Number(snapshot.val().points || 0)) {
                    await scoreRef.set({ hunterId: hunterId, name: hunterId, points: pts, missedCount: missed, medal: medal });
                }
            } else {
                await scoreRef.set({ hunterId: hunterId, name: hunterId, points: pts, missedCount: missed, medal: medal });
            }
        }

        function getRankTitle(missedCount) {
            if (missedCount === 0) return "Snayper 🎯";
            if (missedCount <= 2) return "Usta Ovçu ⭐";
            if (missedCount <= 5) return "Gənc Ovçu 🏹";
            return "Həvəskar 🌲";
        }

        function updateScoreboardView(scores) {
            // Yalnız minimum 300 xal nəticələri göstərilir.
            scores = (scores || []).filter(s => Number(s.points) >= 300);
            scoreRowsContainer.innerHTML = "";
            
            if(!scores || scores.length === 0) {
                scoreRowsContainer.innerHTML = "<div style='color:#999; text-align:center; padding:10px;'>Hələ rekord yoxdur</div>";
                return;
            }

            scores.forEach((s, index) => {
                const medal = getMedalByScore(s.points);
                const medalVisual = medal ? medal.split(' ')[0] : "—";

                const rankTitle = getRankTitle(s.missedCount);

                const safeHunterId = /^Ovçu-ID\d{5}$/.test(s.hunterId || '')
                    ? s.hunterId
                    : (/^Ovçu-ID\d{5}$/.test(s.name || '') ? s.name : 'Ovçu-ID');

                const row = document.createElement('div');
                row.className = 'score-row';
                row.innerHTML = `
                    <div class="col-num"><span class="num-slot">${index + 1}</span></div>
                    <div class="col-name"><span class="score-name">${safeHunterId}</span></div>
                    <div class="col-title"><span class="score-title-cell">${rankTitle}</span></div>
                    <div class="col-score"><span class="score-points">${s.points}</span></div>
                    <div class="col-medal"><span class="medal-slot">${medalVisual}</span></div>
                `;
                scoreRowsContainer.appendChild(row);
            });
        }

        function initGameplayPage() {
            const storedPlayerName = sessionStorage.getItem('duckHunterPlayerName');
            const storedHunterId = sessionStorage.getItem('duckHunterId');

            if (!storedPlayerName || !storedHunterId) {
                window.location.href = 'index.html';
                return;
            }

            playerName = storedPlayerName;
            window.currentHunterId = storedHunterId;

            if (playerDisplay) {
                playerDisplay.innerHTML = `<div>Ovçu: ${playerName}</div><div class="player-id-line">SİZİN İD: ${window.currentHunterId}</div>`;
            }

            score = 0;
            ducksHit = 0;
            totalDucksSpawned = 0;
            currentLevel = 1;
            resetCombo();
            startLevel(1);
        }

        if (isGameplayPage) {
            initGameplayPage();
        }

