// ==========================================
// ⚙️ システム・状態管理
// ==========================================

// 共有用URLの設定
const SHARE_URL = "https://mofu-mitsu.github.io/creator-brain-log";
// メール送信機能用GASのURL
const GAS_URL = "https://script.google.com/macros/s/AKfycbzeVpe1oYA7GSNMMq7Z3jDCMLhMvjnlktYOpyZFHrhPmzQQPabGQ1Vn9y7FgprNQBsMVA/exec";

// プレイヤーのスコアを保持するオブジェクト
let scores = { D: 0, F: 0, C: 0, E: 0, I: 0, M: 0, L: 0, A: 0 };
let currentQ = 0;
let qStartTime = 0;
let timerInterval = null;
let shuffledQuestions = [];
let historyStack = [];
let actionLogs = []; // 行動ログ保存用
let loadingTimeout = null;
let loadingTarget = "";
// マウス迷い計測用の変数
let mouseDistance = 0;
let lastMousePos = { x: 0, y: 0 };

function playLoading(target, title, text) {
    showScreen('loading-screen');
    document.getElementById('loading-title').innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> ${title}`;
    document.getElementById('loading-text').innerText = text;
    
    const bar = document.getElementById('loading-bar');
    bar.style.width = "0%";
    
    loadingTarget = target;
    
    // 3秒かけてバーが伸びるアニメーション
    let progress = 0;
    const interval = setInterval(() => {
        progress += 2; // 50msごとに2%進む
        bar.style.width = `${progress}%`;
        if (progress >= 100) clearInterval(interval);
    }, 50);

    // 3秒後に自動遷移
    loadingTimeout = setTimeout(() => {
        finishLoading();
    }, 2500);
}

function finishLoading() {
    if (loadingTimeout) clearTimeout(loadingTimeout);
    
    if (loadingTarget === "start") {
        showScreen('color-screen');
    } else if (loadingTarget === "result") {
        calculateResult(); // 本当の計算処理をここで呼ぶ
    }
}

// ⚠️ せっかち（強制スキップ）ボタンの処理！
addEvent('impatient-btn', 'click', () => {
    scores.I += 2; // 衝動(I)に+2点！！
    addLog(`> せっかち検知: ローディングを強制スキップ (I+2)`);
    finishLoading();
});
// マウスの動きを常時監視して移動距離を積算する
document.addEventListener('mousemove', (e) => {
    if (lastMousePos.x !== 0 && lastMousePos.y !== 0) {
        let dx = e.clientX - lastMousePos.x;
        let dy = e.clientY - lastMousePos.y;
        mouseDistance += Math.sqrt(dx * dx + dy * dy);
    }
    lastMousePos = { x: e.clientX, y: e.clientY };
});

// ログを追加する共通関数
function addLog(msg) {
    actionLogs.push(msg);
    console.log("[LOG]", msg);
}

// 配列をシャッフルする共通関数
function shuffleArray(arr) {
    return [...arr].sort(() => Math.random() - 0.5);
}

// 画面を切り替える共通関数
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// ⚠️ 安全にイベントを登録する関数（nullエラーを完全に防止！）
function addEvent(id, type, handler) {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener(type, handler);
    }
}

// ==========================================
// 🚀 タイトル画面・ダッシュボード制御
// ==========================================

// ハンバーガーメニューの開閉
addEvent('menu-btn', 'click', () => {
    document.getElementById('side-menu').classList.toggle('active');
});

// メニューからのナビゲーション
addEvent('nav-title', 'click', () => { 
    showScreen('start-screen'); 
    document.getElementById('side-menu').classList.remove('active'); 
});
addEvent('nav-list', 'click', () => { 
    document.getElementById('btn-list').click(); 
    document.getElementById('side-menu').classList.remove('active'); 
});
addEvent('nav-daily', 'click', () => { 
    document.getElementById('btn-daily').click(); 
    document.getElementById('side-menu').classList.remove('active'); 
});
addEvent('nav-about', 'click', () => { 
    document.getElementById('btn-about').click(); 
    document.getElementById('side-menu').classList.remove('active'); 
});

// 【診断開始】ボタンの処理
addEvent('btn-start', 'click', () => {
    scores = { D: 0, F: 0, C: 0, E: 0, I: 0, M: 0, L: 0, A: 0 };
    currentQ = 0; actionLogs = ["観測開始プロトコル起動..."]; historyStack = [];
    shuffledQuestions = shuffleArray(questionsData);
    
    setTimeout(spawnCaterpillar, Math.random() * 5000 + 5000);
    
    // いきなり color-screen に行かず、ローディングを挟む！
    playLoading("start", "Booting...", "脳波スキャン準備中...");
});

// 【16タイプ図鑑】ボタンの処理
addEvent('btn-list', 'click', () => {
    const cont = document.getElementById('type-list-container');
    const grouped = {};
    
    // データをグループごとに整理する
    for (let key in resultsData) {
        let g = resultsData[key].group || "その他";
        if (!grouped[g]) {
            grouped[g] = [];
        }
        grouped[g].push({ key, ...resultsData[key] });
    }
    
    let html = "";
    for (let g in grouped) {
        html += `<h3 style="color:#a1c4fd; border-bottom:1px solid rgba(255,255,255,0.3); padding-bottom:5px; margin-top:20px;">${g}</h3>`;
        grouped[g].forEach(d => {
            html += `
            <div class="list-item" data-type="${d.key}" style="margin-bottom:10px; padding:15px; background:rgba(255,255,255,0.05); border-radius:10px; cursor:pointer; border:1px solid transparent; transition:0.3s;">
                <strong style="color:#ffb8d1; font-size:1.1em;">${d.key} : ${d.title}</strong><br>
                <span style="font-size:0.8em; color:#ddd;">${d.desc}</span>
            </div>`;
        });
    }
    cont.innerHTML = html;
    
    // リストアイテムにホバーとクリックイベントを追加
    document.querySelectorAll('.list-item').forEach(item => {
        item.addEventListener('mouseenter', () => item.style.borderColor = '#ffb8d1');
        item.addEventListener('mouseleave', () => item.style.borderColor = 'transparent');
        item.addEventListener('click', () => { 
            openDetailModal(item.getAttribute('data-type')); 
        });
    });
    
    showScreen('list-screen');
});

// 【システムマニュアル】ボタンの処理
addEvent('btn-about', 'click', () => {
    document.getElementById('about-title').innerText = aboutData.title;
    document.getElementById('about-desc').innerHTML = aboutData.desc;
    
    const axesHTML = aboutData.axes.map(a => `
        <div style="margin-bottom: 10px; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 8px;">
            <strong style="color: #ffb8d1;">${a.name}</strong><br>
            <span style="font-size: 0.9em;">[ ${a.left} ] vs [ ${a.right} ]</span><br>
            <span style="font-size: 0.8em; color: #ddd;">${a.detail}</span>
        </div>
    `).join('');
    
    document.getElementById('about-axes').innerHTML = axesHTML;
    showScreen('about-screen');
});

// ==========================================
// 📅 本日の創作啓示（日次・観測ターミナル）
// ==========================================
const dailyInspirationData = {
    "DA系統": {
        motifs: ["水没した廃都", "涙でできた宝石", "忘れられた星座", "終わらないお茶会", "割れた鏡の中", "真夜中の遊園地", "燃える手紙", "色褪せたリボン"],
        bgms: ["雨音とピアノ", "オルゴール", "切ないケルト音楽", "無音", "波の音", "ジャズバラード", "アンビエント", "誰かのハミング"],
        scenes: ["すれ違っていた二人が本音をぶつけ合うシーン", "過去のトラウマと向き合い、静かに涙を流すシーン", "言葉を交わさずとも、視線だけで理解し合うシーン"],
        warnings: ["感情移入しすぎて執筆中に泣かないように。", "雰囲気だけで話を進めていませんか？", "キャラが可哀想でも、物語のために容赦なく突き落とす勇気を。", "伏線の回収を忘れないでください。"]
    },
    "DL系統": {
        motifs: ["狂った歯車", "無限回廊", "観測者の眼", "崩壊するパラドックス", "錆びた計算機", "空白の辞書", "星の軌道", "冷たい数式"],
        bgms: ["サイバーパンクなシンセ", "規則的な時計の秒針", "ノイズアンビエント", "重厚なオーケストラ", "環境音(タイピング)", "エレクトロニカ", "無機質なビート", "パイプオルガン"],
        scenes: ["隠されていた世界の真実が、完璧な論理で明かされるシーン", "敵と味方が高度な心理戦・頭脳戦を繰り広げるシーン", "バラバラだった伏線が一気に繋がり、カタルシスを生むシーン"],
        warnings: ["設定の複雑化に脳のリソースを奪われすぎています。本編を進めなさい。", "完璧を求めすぎていませんか？バグもエモさです。", "読者が置いてけぼりになっている可能性があります。", "ツールや相関図を作って満足していませんか？"]
    },
    "FA系統": {
        motifs: ["二人だけの秘密基地", "夕暮れの教室", "飲みかけのコーヒー", "色褪せた写真", "帰り道の坂道", "手作りの料理", "雨上がりのアスファルト", "古い日記帳"],
        bgms: ["カフェの雑踏音", "アコースティックギター", "日常系アニメのサントラ", "穏やかな波の音", "Lo-Fi HipHop", "ボサノバ", "電車のガタンゴトン", "鳥のさえずり"],
        scenes: ["何気ない会話の中で、相手の成長や変化にふと気づくシーン", "美味しいご飯を一緒に食べて、心が満たされるシーン", "喧嘩のあとの、ちょっと不器用な仲直りのシーン"],
        warnings: ["平和な日常描写が長すぎます。そろそろ事件を起こしましょう。", "脇役の過去話に尺を取りすぎていませんか？", "誰も傷つかない物語は美しいですが、時には衝突も必要です。", "起承転結の『転』を意識してください。"]
    },
    "FL系統": {
        motifs: ["精巧な仕掛け武器", "魔法陣の設計図", "冷たい雨と鉄", "プログラムコード", "高層ビルの屋上", "血塗られた剣", "設計図", "実験室のフラスコ"],
        bgms: ["テンポの速いロック", "作業用EDM", "戦闘BGMループ", "オーケストラとコーラス", "ドラムンベース", "インダストリアル", "メタル", "シンセウェイヴ"],
        scenes: ["絶体絶命のピンチを、機転とギミックで論理的に突破するシーン", "長年磨き上げた技術や必殺技を解放するアクションシーン", "冷酷な敵が、主人公の策にハマって崩壊していくシーン"],
        warnings: ["アクションやギミックの描写に夢中で、キャラの心情が疎かになっています。", "設定画を描いて満足していませんか？文章に起こしなさい。", "世界観の解説（ナレーション）を削って、台詞で語らせましょう。", "戦闘以外の日常シーンもたまには書きましょう。"]
    }
};

addEvent('btn-daily', 'click', () => {
    const typeSelect = document.getElementById('daily-type-select');
    if (typeSelect.options.length === 1) { 
        for (let key in resultsData) {
            let opt = document.createElement('option');
            opt.value = key; 
            opt.text = `${key} : ${resultsData[key].title}`;
            typeSelect.appendChild(opt);
        }
    }
    showScreen('daily-screen');
});

addEvent('daily-type-select', 'change', (e) => {
    if (e.target.value !== "") {
        const typeKey = e.target.value;
        const today = new Date();
        document.getElementById('daily-date').innerText = `観測日時: ${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日`;
        
        // 日付 ＋ タイプ文字列 でシード値を生成
        let seedStr = today.getFullYear().toString() + today.getMonth() + today.getDate() + typeKey;
        let seed = 0; 
        for(let i=0; i<seedStr.length; i++) {
            seed += seedStr.charCodeAt(i);
        }
        
        // 疑似乱数ジェネレーター
        const rand = (max) => (seed * 9301 + 49297) % 233280 % max;

        // グループ判定
        let groupKey = "DL系統";
        if (typeKey.includes('D') && typeKey.includes('A')) groupKey = "DA系統";
        else if (typeKey.includes('D') && typeKey.includes('L')) groupKey = "DL系統";
        else if (typeKey.includes('F') && typeKey.includes('A')) groupKey = "FA系統";
        else if (typeKey.includes('F') && typeKey.includes('L')) groupKey = "FL系統";

        const data = dailyInspirationData[groupKey];
        const types = Object.keys(resultsData);
        
        // 💡 1600万色から完全ランダムにHEXカラーを抽出する処理！
        const r = Math.floor(rand(256));
        const g = Math.floor(rand(256) + 50); // 色が変わりやすいように少しオフセット
        const b = Math.floor(rand(256) + 100);
        // RGBをHEX文字列に変換
        const hexColor = "#" + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
        
        document.getElementById('daily-color').innerText = hexColor;
        document.getElementById('daily-color').style.color = hexColor;
        document.getElementById('daily-color').style.textShadow = "1px 1px 2px #000";

        document.getElementById('daily-motif').innerText = data.motifs[Math.floor(rand(data.motifs.length))];
        document.getElementById('daily-bgm').innerText = data.bgms[Math.floor(rand(data.bgms.length))];
        document.getElementById('daily-scene').innerText = data.scenes[Math.floor(rand(data.scenes.length))];
        document.getElementById('daily-warning').innerText = data.warnings[Math.floor(rand(data.warnings.length))];
        
        // 本日の共鳴クリエイター（自分以外のタイプ）
        let luckyType = types[Math.floor(rand(types.length))];
        while (luckyType === typeKey) { 
            seed++; 
            luckyType = types[Math.floor(rand(types.length))]; 
        } 
        document.getElementById('daily-lucky-type').innerText = `${luckyType} (${resultsData[luckyType].title})`;

        document.getElementById('daily-result-box').style.display = "block";
    } else {
        document.getElementById('daily-result-box').style.display = "none";
    }
});

// ==========================================
// 🧠 各種モーダル・ボタン処理
// ==========================================

// 退出確認モーダルの制御
const quitModal = document.getElementById('quit-modal');
addEvent('quit-btn', 'click', () => {
    quitModal.classList.add('active');
});
addEvent('quit-no', 'click', () => {
    quitModal.classList.remove('active');
});
addEvent('quit-yes', 'click', () => {
    if (timerInterval) clearInterval(timerInterval);
    quitModal.classList.remove('active');
    showScreen('start-screen');
});

// 詳細モーダルを開く処理
const detailModal = document.getElementById('type-detail-modal');
function openDetailModal(type) {
    const d = resultsData[type];
    document.getElementById('detail-type').innerText = type;
    document.getElementById('detail-title').innerText = d.title;
    document.getElementById('detail-img').src = d.img || "";
    document.getElementById('detail-quote').innerText = d.quote || "";
    document.getElementById('detail-personality').innerText = d.personality || "";
    document.getElementById('detail-creative').innerText = d.creative_style || "";
    document.getElementById('detail-danger').innerText = d.danger || "";
    detailModal.classList.add('active');
}

addEvent('close-detail-btn', 'click', () => {
    detailModal.classList.remove('active');
});

addEvent('close-list-btn', 'click', () => showScreen('start-screen'));
addEvent('close-about-btn', 'click', () => showScreen('start-screen'));
addEvent('close-daily-btn', 'click', () => showScreen('start-screen'));
addEvent('restart-btn', 'click', () => showScreen('start-screen'));

// ==========================================
// 🎨 無意識カラー選択 ＆ 質問開始
// ==========================================
addEvent('color-submit', 'click', () => {
    const hex = document.getElementById('free-color-picker').value;
    addLog(`最初のオーラ色に ${hex} を選択`);
    
    // 色の成分による初期パラメータ加算
    let r = parseInt(hex.substring(1, 3), 16);
    let g = parseInt(hex.substring(3, 5), 16);
    let b = parseInt(hex.substring(5, 7), 16);
    
    if (r > g && r > b) {
        scores.A += 2;
        scores.I += 1;
    } else if (b > r && b > g) {
        scores.L += 2;
        scores.M += 1;
    } else if (g > r && g > b) {
        scores.F += 2;
        scores.C += 1;
    } else {
        scores.D += 2;
    }
    showQuestion();
});

// ==========================================
// 🧩 質問描画メインロジック (1行圧縮禁止！全展開！)
// ==========================================
function showQuestion() {
    // ★質問がすべて終わった時の処理を変更！
    if (currentQ >= shuffledQuestions.length) {
        if(timerInterval) clearInterval(timerInterval);
        // 結果画面の前にローディングを挟む！
        return playLoading("result", "Analyzing...", "全データをコンパイル中...");
    }
    
    showScreen('question-screen');
    const q = shuffledQuestions[currentQ];
    
    document.getElementById('q-number').innerText = `Q.${currentQ + 1} / ${shuffledQuestions.length}`;
    document.getElementById('question-text').innerText = q.text;
    
    // イベント発生時のみ文字を赤くする
    if (q.type === 'event_collapse') {
        document.getElementById('question-text').style.color = '#ff5e62';
    } else {
        document.getElementById('question-text').style.color = '#ffb8d1';
    }
    
    document.getElementById('question-sub').innerText = q.subText || "";

    const container = document.getElementById('input-container');
    container.innerHTML = '';
    
    qStartTime = Date.now();
    mouseDistance = 0; // マウス迷い距離リセット

    // ① 通常選択 ＆ イベント崩壊（2択）
    if (q.type === 'choice' || q.type === 'event_collapse') {
        q.choices.forEach(c => {
            const btn = document.createElement('button'); btn.className = 'choice-btn'; btn.innerText = c.text;
            btn.onclick = () => {
                const answerTime = Date.now() - qStartTime;
                // ⚠️ 即決判定を厳しく(1.2秒以内)、長考判定を長く(8秒以上)に修正！！
                if (answerTime < 1200) { 
                    scores.I++; 
                    addLog(`> 超速即決検知(${answerTime}ms): 衝動(I)加算`); 
                } else if (answerTime > 8000) { 
                    scores.M++; 
                    addLog(`> 慎重長考検知(${answerTime}ms): 計画(M)加算`); 
                }
                nextQuestion(c.scores);
            };
            container.appendChild(btn);
        });
    } 
    // ② 深掘り（Ni/Ne判定など）
    else if (q.type === 'choice_deep') {
        q.choices.forEach(c => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.innerText = c.text;
            btn.onclick = () => {
                addLog(`思考分岐: [${c.text}] へ潜行`);
                
                // 第一階層のスコアを加算
                for (let key in c.scores) {
                    scores[key] += c.scores[key];
                }
                
                // 画面を深掘り用の質問に切り替え
                document.getElementById('question-text').innerText = c.deep.text;
                container.innerHTML = '';
                
                c.deep.choices.forEach(dc => {
                    const dbtn = document.createElement('button');
                    dbtn.className = 'choice-btn';
                    dbtn.innerText = dc.text;
                    dbtn.onclick = () => {
                        nextQuestion(dc.scores);
                    };
                    container.appendChild(dbtn);
                });
            };
            container.appendChild(btn);
        });
    } 
    // ③ 空の色選択（アイコンギミック）
    else if (q.type === 'color_sky') {
        const p = document.createElement('div');
        p.className = 'sky-palette';
        const skies = [
            { class: 'sky-neon', text: 'ネオン', scores: { D: 1, I: 1 } },
            { class: 'sky-mono', text: 'モノクロ', scores: { F: 1, L: 1 } },
            { class: 'sky-sunset', text: '夕焼け', scores: { A: 2 } },
            { class: 'sky-deep', text: '深海', scores: { M: 1, L: 1 } }
        ];
        skies.forEach(s => {
            const btn = document.createElement('div');
            btn.className = `sky-btn ${s.class}`;
            btn.innerText = s.text;
            btn.onclick = () => {
                let time = Date.now() - qStartTime;
                if (time < 2000) {
                    scores.I += 1;
                    addLog(`空: 即決で${s.text}を選択`);
                } else {
                    scores.M += 1;
                    addLog(`空: 迷って${s.text}を選択`);
                }
                nextQuestion(s.scores);
            };
            p.appendChild(btn);
        });
        container.appendChild(p);
    } 
    // ④ 伏線並び替え（重要度順）
    else if (q.type === 'sortable') {
        let selectedOrder = [];
        const itemsDiv = document.createElement('div');
        q.items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'sort-item';
            el.innerText = item;
            el.onclick = () => {
                if (!selectedOrder.includes(item)) {
                    selectedOrder.push(item);
                    el.classList.add('selected');
                    el.innerText += ` [${selectedOrder.length}]`;
                    
                    // 全て選び終わったら判定
                    if (selectedOrder.length === q.items.length) {
                        addLog(`構成順: ${selectedOrder[0]}優先`);
                        let s = {};
                        if (selectedOrder[0].includes("手紙")) {
                            s.A = 2;
                        } else {
                            s.L = 2;
                        }
                        setTimeout(() => nextQuestion(s), 500);
                    }
                }
            };
            itemsDiv.appendChild(el);
        });
        container.appendChild(itemsDiv);
    } 
    // ⑤ 自由記述（最強武器など）
    else if (q.type === 'text') {
        const text = document.createElement('textarea');
        text.className = 'cyber-textarea'; // デザイン適用
        text.placeholder = "ここに入力してください...";
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.innerText = "解析を開始";
        
        btn.onclick = () => {
            const val = text.value.trim();
            // ★適当入力の判定ロジック（同じ文字の連続、記号のみ、短すぎる等）
            const isRepeated = /^(.)\1+$/.test(val); // 「あああ」「www」など
            const isOnlySymbols = /^[\s、。！？!?,.・…\-_~^wWｗＷ]+$/.test(val); // 記号や空白のみ
            
            let s = {};
            if (val.length === 0 || isRepeated || isOnlySymbols || val.length < 3) {
                addLog(`> 警告: 適当な入力を検知「${val.substring(0, 10)}${val.length>10?'...':''}」 -> 衝動(I)加算`);
                s.I = 2; // 適当に入力＝衝動的
            } else {
                addLog(`> 記述入力完了: 「${val.substring(0, 15)}${val.length>15?'...':''}」(${val.length}文字)`);
                if(val.length > 30) s.F = 2; else s.D = 1;
            }
            nextQuestion(s);
        };
        container.append(text, document.createElement('br'), btn);
    } 
    // ⑥ 脳内タブ（複数選択）はそのまま飛ばして…

    // ⑦ 制限時間プロット（30秒タイマー）
    else if (q.type === 'time_limit_text') {
        const text = document.createElement('textarea');
        text.className = 'cyber-textarea';
        text.placeholder = "タイトルを入力...";
        
        const timerDisplay = document.createElement('div');
        timerDisplay.style.color = '#ffb8d1';
        timerDisplay.style.fontWeight = 'bold';
        timerDisplay.style.marginBottom = '10px';
        
        let timeLeft = 30;
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.innerText = "完成！";
        
        timerInterval = setInterval(() => {
            timeLeft--;
            timerDisplay.innerText = `残り時間: ${timeLeft}秒`;
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                addLog("> 制限時間切れ: 計画性(M)を加点");
                nextQuestion({ M: 2 });
            }
        }, 1000);

        btn.onclick = () => {
            clearInterval(timerInterval);
            const val = text.value.trim();
            const isRepeated = /^(.)\1+$/.test(val);
            const isOnlySymbols = /^[\s、。！？!?,.・…\-_~^wWｗＷ]+$/.test(val);
            
            let s = { I: 2 }; // 間に合わせたので基本はIベース
            if (val.length === 0 || isRepeated || isOnlySymbols || val.length < 2) {
                addLog(`> 残り${timeLeft}秒で適当な入力を検知: 「${val.substring(0,10)}」`);
            } else {
                addLog(`> 残り${timeLeft}秒で作成: 「${val.substring(0,15)}${val.length>15?'...':''}」`);
                if (val.length > 10) s.F = 1; // ちゃんと長く書けていればF追加
            }
            nextQuestion(s);
        };
        container.append(timerDisplay, text, document.createElement('br'), btn);
    }
    // ⑥ 脳内タブ（複数選択チェックボックス）
    else if (q.type === 'multi_select') {
        const checkboxes = [];
        q.choices.forEach((c, idx) => {
            const lbl = document.createElement('label');
            lbl.className = 'multi-choice-label';
            
            const chk = document.createElement('input');
            chk.type = 'checkbox';
            chk.value = idx;
            
            checkboxes.push({ chk: chk, scores: c.scores, text: c.text });
            lbl.appendChild(chk);
            lbl.appendChild(document.createTextNode(c.text));
            container.appendChild(lbl);
        });
        
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.innerText = "決定";
        btn.onclick = () => {
            let add = {};
            let count = 0;
            checkboxes.forEach(item => {
                if (item.chk.checked) {
                    count++;
                    for (let k in item.scores) {
                        add[k] = (add[k] || 0) + item.scores[k];
                    }
                }
            });
            addLog(`脳内タブ: ${count}個同時展開`);
            nextQuestion(add);
        };
        container.append(btn);
    } 
    // ⑦ 制限時間プロット（30秒タイマー）
    else if (q.type === 'time_limit_text') {
        const text = document.createElement('textarea');
        const timerDisplay = document.createElement('div');
        timerDisplay.style.color = '#ffb8d1';
        timerDisplay.style.fontWeight = 'bold';
        timerDisplay.style.marginBottom = '10px';
        
        let timeLeft = 30;
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.innerText = "完成！";
        
        timerInterval = setInterval(() => {
            timeLeft--;
            timerDisplay.innerText = `残り時間: ${timeLeft}秒`;
            
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                addLog("制限時間切れ: 計画性(M)を加点");
                nextQuestion({ M: 2 });
            }
        }, 1000);

        btn.onclick = () => {
            clearInterval(timerInterval);
            addLog(`残り${timeLeft}秒で作成完了`);
            let s = { I: 2 };
            if (text.value.length > 10) {
                s.F = 1;
            }
            nextQuestion(s);
        };
        container.append(timerDisplay, text, document.createElement('br'), btn);
    } 
    // ⑧ 脳内割合（スライダー）
    else if (q.type === 'slider') {
        const labels = document.createElement('div');
        labels.className = 'slider-container';
        
        const spanL = document.createElement('span'); 
        spanL.innerText = q.leftLabel;
        const spanR = document.createElement('span'); 
        spanR.innerText = q.rightLabel;
        labels.append(spanL, spanR);

        const slider = document.createElement('input');
        slider.type = 'range'; 
        slider.min = '0'; 
        slider.max = '100'; 
        slider.value = '50';
        
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.innerText = "決定";
        
        btn.onclick = () => {
            let val = parseInt(slider.value);
            let s = {};
            addLog(`スライダー調整: ${val}%`);
            
            if (val < 40) {
                s[q.leftAttr] = 2;
            } else if (val > 60) {
                s[q.rightAttr] = 2;
            }
            nextQuestion(s);
        };
        container.append(labels, slider, btn);
    } 
    // ⑨ 無意識お絵描き（キャンバス）
    else if (q.type === 'draw') {
        const canvas = document.createElement('canvas');
        canvas.width = 280; 
        canvas.height = 150;
        const ctx = canvas.getContext('2d');
        
        // キャンバスを白く初期化
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        let isDrawing = false;
        let strokes = 0;
        
        ctx.strokeStyle = '#ffb8d1'; 
        ctx.lineWidth = 3; 
        ctx.lineCap = 'round';

        // マウス操作
        canvas.onmousedown = (e) => { 
            isDrawing = true; 
            strokes++; 
            ctx.beginPath(); 
            ctx.moveTo(e.offsetX, e.offsetY); 
        };
        canvas.onmousemove = (e) => { 
            if (isDrawing) { 
                ctx.lineTo(e.offsetX, e.offsetY); 
                ctx.stroke(); 
            } 
        };
        canvas.onmouseup = () => { 
            isDrawing = false; 
        };
        
        // スマホタッチ操作
        canvas.addEventListener('touchstart', (e) => { 
            e.preventDefault(); 
            isDrawing = true; 
            strokes++; 
            ctx.beginPath(); 
            ctx.moveTo(e.touches[0].clientX - canvas.getBoundingClientRect().left, e.touches[0].clientY - canvas.getBoundingClientRect().top); 
        });
        canvas.addEventListener('touchmove', (e) => { 
            e.preventDefault(); 
            if (isDrawing) { 
                ctx.lineTo(e.touches[0].clientX - canvas.getBoundingClientRect().left, e.touches[0].clientY - canvas.getBoundingClientRect().top); 
                ctx.stroke(); 
            } 
        });
        canvas.addEventListener('touchend', () => { 
            isDrawing = false; 
        });

        // パレットとボタンの作成
        const tools = document.createElement('div');
        tools.className = 'canvas-tools';
        tools.innerHTML = `<span>ペン色:</span><div class="mini-color-wrapper"><input type="color" id="draw-color" value="#ffb8d1"></div>`;
        
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.innerText = "完成！";
        btn.onclick = () => {
            const c = document.getElementById('draw-color').value;
            addLog(`お絵描き完了: ${strokes}ストローク, 使用色: ${c}`);
            
            let s = {};
            if (strokes > 10) { 
                s.I = 2; 
                s.D = 1; 
            } else { 
                s.M = 2; 
                s.F = 1; 
            }
            nextQuestion(s);
        };
        container.append(canvas, tools, btn);

        // カラーピッカーのイベント
        setTimeout(() => {
            const pc = document.getElementById('draw-color');
            if (pc) {
                pc.addEventListener('input', (e) => { 
                    ctx.strokeStyle = e.target.value; 
                    addLog(`> ペン色変更: ${e.target.value}`); 
                });
            }
        }, 100);
    }
}

// 質問遷移・ナビゲーション関数
function nextQuestion(addScores = {}) {
    historyStack.push({ 
        index: currentQ, 
        scores: { ...scores }, 
        logs: [...actionLogs] 
    });
    
    for (let k in addScores) {
        scores[k] += addScores[k];
    }
    currentQ++;
    showQuestion();
}

// 戻るボタンの処理
addEvent('back-btn', 'click', () => {
    if (historyStack.length > 0) {
        if (timerInterval) clearInterval(timerInterval);
        const last = historyStack.pop();
        currentQ = last.index;
        scores = last.scores;
        actionLogs = last.logs;
        showQuestion();
    }
});

// パスボタンの処理
addEvent('skip-btn', 'click', () => {
    addLog("質問をパスしました");
    nextQuestion({});
});


// ==========================================
// 📊 結果計算・表示・共有機能
// ==========================================

// 指標バーを生成する関数
function createBarHTML(leftScore, rightScore, leftLabel, rightLabel) {
    let total = leftScore + rightScore;
    let leftPct = total === 0 ? 50 : Math.round((leftScore / total) * 100);
    let rightPct = 100 - leftPct;
    
    return `
        <div class="bar-wrapper">
            <div class="bar-labels">
                <span style="color:#ffb8d1;">${leftLabel} ${leftPct}%</span>
                <span style="color:#89f7fe;">${rightPct}% ${rightLabel}</span>
            </div>
            <div class="bar-container">
                <div class="bar-left" style="width: ${leftPct}%;"></div>
                <div class="bar-right" style="width: ${rightPct}%;"></div>
            </div>
        </div>
    `;
}

// 結果を計算して画面に表示する
function calculateResult() {
    const type = (scores.D >= scores.F ? 'D' : 'F') + 
                 (scores.C >= scores.E ? 'C' : 'E') + 
                 (scores.I >= scores.M ? 'I' : 'M') + 
                 (scores.L >= scores.A ? 'L' : 'A');
                 
    showScreen('result-screen');
    
    const res = resultsData[type] || { 
        title: "特異点", 
        desc: "解析不能な創作脳です。", 
        danger: "不明", 
        best: "未知", 
        quote: "", 
        personality: "", 
        creative_style: "", 
        group: "分類不能" 
    };
    
    // 画像の表示
    const resultImg = document.getElementById('result-img');
    if (resultImg) {
        resultImg.src = res.img || "";
        resultImg.style.display = res.img ? "inline-block" : "none";
    }
    
    // テキストデータの挿入
    document.getElementById('result-group').innerText = res.group || "";
    document.getElementById('result-type').innerText = type;
    document.getElementById('result-title').innerText = res.title;
    document.getElementById('result-quote').innerText = res.quote || "";
    document.getElementById('result-desc').innerText = res.desc || "";
    document.getElementById('result-personality').innerText = res.personality || "";
    document.getElementById('result-creative').innerText = res.creative_style || "";
    document.getElementById('result-danger').innerText = res.danger || "";
    document.getElementById('result-best').innerText = res.best || "";

    // 📊 指標バーの描画
    const barsHTML = 
        createBarHTML(scores.D, scores.F, "D(空想)", "F(構築)") +
        createBarHTML(scores.C, scores.E, "C(人物)", "E(世界)") +
        createBarHTML(scores.I, scores.M, "I(衝動)", "M(計画)") +
        createBarHTML(scores.L, scores.A, "L(論理)", "A(感情)"); 
    document.getElementById('result-bars').innerHTML = barsHTML;

    // ログの最終追記
    actionLogs.push(`--- 最終スコア解析 ---`);
    actionLogs.push(`D:${scores.D} / F:${scores.F}`);
    actionLogs.push(`C:${scores.C} / E:${scores.E}`);
    actionLogs.push(`I:${scores.I} / M:${scores.M}`);
    actionLogs.push(`L:${scores.L} / A:${scores.A}`);
    actionLogs.push(`プロトコル完了: [${type}]`);
    
    const logList = document.getElementById('action-log-list');
    logList.innerHTML = actionLogs.map(log => `<div>> ${log}</div>`).join('');

    // GASへのデータ送信
    if (GAS_URL && GAS_URL !== "ここにGASのURLをいれる") {
        fetch(GAS_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain' }, 
            body: JSON.stringify({ 
                email: "momoka.mimika1122@gmail.com", 
                type: type, 
                title: res.title, 
                logs: actionLogs.join('\n') 
            }) 
        }).catch(e => console.error(e));
    }
}

// シェアボタンの処理
addEvent('share-btn', 'click', () => {
    const type = document.getElementById('result-type').innerText;
    const title = document.getElementById('result-title').innerText;
    
    const getP = (s1, s2) => s1+s2===0 ? 50 : Math.round((s1/(s1+s2))*100);
    const text = `私の創作深層心理は【${type}：${title}】でした！\n\n`
               + `D(空想)${getP(scores.D, scores.F)}% - F(構築)${100-getP(scores.D, scores.F)}%\n`
               + `C(人物)${getP(scores.C, scores.E)}% - E(世界)${100-getP(scores.C, scores.E)}%\n`
               + `I(衝動)${getP(scores.I, scores.M)}% - M(計画)${100-getP(scores.I, scores.M)}%\n`
               + `L(論理)${getP(scores.L, scores.A)}% - A(感情)${100-getP(scores.L, scores.A)}%\n\n`
               + `行動ログまで暴かれるヤバい診断…🧠🧪\n#創作16タイプ診断 #CreatorBrainLog\n`;
               
    if (navigator.share) {
        navigator.share({ title: '創作深層心理診断', text: text, url: SHARE_URL }).catch(e=>{});
    } else {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(SHARE_URL)}`, '_blank');
    }
});

// 画像保存の処理
addEvent('save-img-btn', 'click', () => { 
    html2canvas(document.getElementById('capture-area'), { backgroundColor: "#1e1432", scale: 2 }).then(canvas => { 
        const link = document.createElement('a'); 
        link.download = `CreatorBrainLog_${document.getElementById('result-type').innerText}.png`; 
        link.href = canvas.toDataURL(); 
        link.click(); 
    }); 
});

// ログコピー処理
addEvent('copy-log-btn', 'click', () => { 
    navigator.clipboard.writeText(actionLogs.join('\n')).then(() => alert("深層ログをコピーしました！")); 
});

// リスタート処理
addEvent('restart-btn', 'click', () => {
    showScreen('start-screen');
});

// ==========================================
// 🚨 ランダムギミック群（アラート・芋虫・Glitch）
// ==========================================

const alerts = [
    { text: "今、新しいキャラを追加したくなりましたか？", yes: () => { scores.D+=2; addLog("衝動検知: 新キャラ追加の欲求"); }, no: () => { scores.F+=2; addLog("維持検知: 既存構成の重視"); } },
    { text: "設定に致命的な矛盾を発見しました！直しますか？", yes: () => { scores.M+=2; addLog("論理検知: 整合性へのこだわり"); }, no: () => { scores.I+=2; addLog("衝動検知: 勢いの重視"); } },
    { text: "作品のテーマを、今すぐ誰かに語りたくなりましたか？", yes: () => { scores.A+=2; addLog("感情検知: 表出への欲求"); }, no: () => { scores.L+=2; addLog("論理検知: 内面での完結"); } },
    { text: "今、眠いですか？（創作Si観測）", yes: () => { addLog("Si: 疲労を検知"); }, no: () => { addLog("Si: 覚醒状態を確認"); } },
    { text: "新キャラを唐突に死なせたくなりましたか？", yes: () => { scores.I += 2; addLog("破壊的衝動を確認"); }, no: () => { scores.M += 2; addLog("物語の安定性を重視"); } },
    { text: "タイトルを今すぐオシャレな英単語に変えたい？", yes: () => { scores.D += 2; addLog("表層的直感を検知"); }, no: () => { scores.F += 2; addLog("構造的本質を維持"); } },
    { text: "読者の反応が怖くなってきましたか？", yes: () => { scores.A += 2; addLog("外部評価への敏感性"); }, no: () => { scores.L += 2; addLog("自己完結的論理性"); } }
];

// アラートの定期実行（15秒ごと）
setInterval(() => {
    if (!document.getElementById('question-screen').classList.contains('active') || document.getElementById('impulse-popup')) return;
    if (Math.random() > 0.2) return;
    
    const al = alerts[Math.floor(Math.random() * alerts.length)];
    const pop = document.createElement('div'); 
    pop.id = 'impulse-popup'; 
    pop.className = 'popup-log';
    pop.innerHTML = `
        <p style="font-size:0.9em; margin-bottom:10px;">⚠️ 観測ログ: ${al.text}</p>
        <div style="display:flex; gap:10px; justify-content:center;">
            <button id="pop-yes" class="sub-btn" style="color:#fff; border-color:#fff;">YES</button>
            <button id="pop-no" class="sub-btn" style="color:#fff; border-color:#fff;">NO</button>
        </div>
    `;
    document.body.appendChild(pop);
    
    document.getElementById('pop-yes').onclick = () => { al.yes(); pop.remove(); };
    document.getElementById('pop-no').onclick = () => { al.no(); pop.remove(); };
    
    setTimeout(() => { if (document.body.contains(pop)) pop.remove(); }, 5000);
}, 15000);

// Glitch（ノイズ）演出の定期実行（20秒ごと）
setInterval(() => {
    if (!document.getElementById('question-screen').classList.contains('active') || Math.random() > 0.15) return;
    
    document.body.classList.add('glitch-active');
    let reacted = false; 
    
    const reactHandler = () => { 
        reacted = true; 
        scores.I += 2; 
        addLog("Glitchに即反応(I+2)"); 
    };
    
    document.addEventListener('click', reactHandler, { once: true });
    
    setTimeout(() => { 
        document.body.classList.remove('glitch-active'); 
        document.removeEventListener('click', reactHandler); 
        if (!reacted) { 
            scores.M += 2; 
            addLog("Glitchを冷静にスルー(M+2)"); 
        } 
    }, 1500);
}, 20000);

// 芋虫（システムバグ）の処理
let globalBugHits = 0; 
function spawnCaterpillar() {
    if (document.getElementById('caterpillar') || !document.getElementById('question-screen').classList.contains('active')) return;
    
    const bug = document.createElement('div'); 
    bug.id = 'caterpillar'; 
    bug.innerText = '🐛'; 
    bug.style.animation = 'crawl 15s linear forwards';
    
    const speech = document.createElement('div'); 
    speech.id = 'caterpillar-speech'; 
    bug.appendChild(speech);
    
    const quotes = ["システムの構築には時間が必要だ…", "Tiの構造が乱れている…", "SLE、また貴様か…！", "Seの暴力はやめたまえ…", "Niが告げている…"];
    
    const hitBug = (e) => {
        e.preventDefault(); 
        globalBugHits++; 
        bug.style.transform = `scale(${1 - globalBugHits*0.03})`;
        speech.innerText = quotes[Math.floor(Math.random() * quotes.length)]; 
        speech.style.opacity = 1; 
        
        setTimeout(() => speech.style.opacity = 0, 1500);
        addLog(`> 芋虫に攻撃 (累計 ${globalBugHits}回目)`);
        
        if (globalBugHits >= 30) {
            bug.innerText = '💥'; 
            speech.innerText = "システム崩壊…！！"; 
            speech.style.opacity = 1; 
            scores.I += 3; 
            scores.E += 2;
            addLog("芋虫を完全に粉砕した (I+3, E+2)"); 
            globalBugHits = 0; 
            setTimeout(() => bug.remove(), 1000);
        }
    };
    
    bug.addEventListener('mousedown', hitBug); 
    bug.addEventListener('touchstart', hitBug);
    document.body.appendChild(bug);
    
    bug.addEventListener('animationend', () => {
        if (globalBugHits > 0 && globalBugHits < 30) {
            addLog(`> 芋虫は逃げ切った(現在 被弾${globalBugHits}回)`);
        }
        bug.remove(); 
        setTimeout(spawnCaterpillar, Math.random() * 20000 + 10000);
    });
}
