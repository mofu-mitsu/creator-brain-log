// ==========================================
// ⚙️ システム・状態管理
// ==========================================
// 共有用URLの設定
const SHARE_URL = "https://mofu-mitsu.github.io/creator-brain-log";

let scores = { D: 0, F: 0, C: 0, E: 0, I: 0, M: 0, L: 0, A: 0 };
let currentQ = 0;
let qStartTime = 0;
let timerInterval = null;
let shuffledQuestions = [];
let historyStack = [];
let actionLogs = []; // 行動ログ保存用

// マウス迷い計測用
let mouseDistance = 0;
let lastMousePos = { x: 0, y: 0 };

// マウスの動きを常時監視して距離を積算
document.addEventListener('mousemove', (e) => {
    if (lastMousePos.x !== 0 && lastMousePos.y !== 0) {
        let dx = e.clientX - lastMousePos.x;
        let dy = e.clientY - lastMousePos.y;
        mouseDistance += Math.sqrt(dx * dx + dy * dy);
    }
    lastMousePos = { x: e.clientX, y: e.clientY };
});

function addLog(msg) {
    actionLogs.push(msg);
    console.log("[LOG]", msg);
}

function shuffleArray(arr) {
    return [...arr].sort(() => Math.random() - 0.5);
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// ==========================================
// 🚀 タイトル画面・初期化
// ==========================================
document.getElementById('list-btn').addEventListener('click', () => {
    const cont = document.getElementById('type-list-container');
    cont.innerHTML = Object.keys(resultsData).map(k => `
        <div style="margin-bottom:15px; padding:10px; background:rgba(255,255,255,0.05); border-radius:10px;">
            <strong style="color:#ffb8d1;">${k} : ${resultsData[k].title}</strong><br>
            <span style="font-size:0.8em; color:#ddd;">${resultsData[k].desc}</span>
        </div>
    `).join('');
    showScreen('list-screen');
});

document.getElementById('close-list-btn').addEventListener('click', () => showScreen('start-screen'));

document.getElementById('start-btn').addEventListener('click', () => {
    scores = { D: 0, F: 0, C: 0, E: 0, I: 0, M: 0, L: 0, A: 0 };
    currentQ = 0;
    actionLogs = ["観測開始プロトコル起動..."];
    historyStack = [];
    shuffledQuestions = shuffleArray(questionsData);
    // 最初の芋虫をタイマーセット
    setTimeout(spawnCaterpillar, Math.random() * 5000 + 5000);
    showScreen('color-screen');
});

// 最初のカラーピッカー確定
document.getElementById('color-submit').addEventListener('click', () => {
    const hex = document.getElementById('free-color-picker').value;
    addLog(`最初のオーラ色に ${hex} を選択`);
    let r = parseInt(hex.substring(1,3), 16), g = parseInt(hex.substring(3,5), 16), b = parseInt(hex.substring(5,7), 16);
    if (r > g && r > b) { scores.A += 2; scores.I += 1; }
    else if (b > r && b > g) { scores.L += 2; scores.M += 1; }
    else if (g > r && g > b) { scores.F += 2; scores.C += 1; }
    else { scores.D += 2; }
    showQuestion();
});

// ==========================================
// 🧩 質問描画メインロジック
// ==========================================
function showQuestion() {
    if (currentQ >= shuffledQuestions.length) return calculateResult();
    if(timerInterval) clearInterval(timerInterval);

    showScreen('question-screen');
    const q = shuffledQuestions[currentQ];
    document.getElementById('q-number').innerText = `Q.${currentQ + 1} / ${shuffledQuestions.length}`;
    document.getElementById('question-text').innerText = q.text;
    document.getElementById('question-text').style.color = q.type === 'event_collapse' ? '#ff5e62' : '#ffb8d1';
    document.getElementById('question-sub').innerText = q.subText || "";

    const container = document.getElementById('input-container');
    container.innerHTML = '';
    
    qStartTime = Date.now();
    mouseDistance = 0; // マウス迷い距離リセット

    // --- 各タイプ別の描画ロジック ---

    // ① 通常選択 ＆ イベント崩壊（2択）
    if (q.type === 'choice' || q.type === 'event_collapse') {
        q.choices.forEach(c => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.innerText = c.text;
            btn.onclick = () => {
                if (mouseDistance > 3000) { scores.M += 1; addLog(`マウス迷い検知(${Math.floor(mouseDistance)}px): 計画性(M)加算`); }
                else if (mouseDistance < 500) { scores.I += 1; addLog(`即決検知(${Math.floor(mouseDistance)}px): 衝動性(I)加算`); }
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
                for (let key in c.scores) scores[key] += c.scores[key];
                document.getElementById('question-text').innerText = c.deep.text;
                container.innerHTML = '';
                c.deep.choices.forEach(dc => {
                    const dbtn = document.createElement('button');
                    dbtn.className = 'choice-btn';
                    dbtn.innerText = dc.text;
                    dbtn.onclick = () => nextQuestion(dc.scores);
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
                if(time < 2000) { scores.I += 1; addLog(`空の色: 即決で${s.text}を選択`); }
                else { scores.M += 1; addLog(`空の色: 迷った末に${s.text}を選択`); }
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
                if(!selectedOrder.includes(item)) {
                    selectedOrder.push(item);
                    el.classList.add('selected');
                    el.innerText += ` [${selectedOrder.length}]`;
                    if(selectedOrder.length === q.items.length) {
                        addLog(`構成順: ${selectedOrder[0]}を最重要視`);
                        let s = {};
                        if(selectedOrder[0].includes("手紙")) s.A = 2; else s.L = 2;
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
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.innerText = "解析を開始";
        btn.onclick = () => {
            addLog(`記述完了: ${text.value.length}文字入力`);
            let s = {};
            if(text.value.length > 30) s.F = 2; else s.D = 1;
            nextQuestion(s);
        };
        container.append(text, document.createElement('br'), btn);
    }
    // ⑥ 脳内タブ（複数選択）
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
                if(item.chk.checked) {
                    count++;
                    for(let k in item.scores) add[k] = (add[k]||0) + item.scores[k];
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
            addLog(`残り${timeLeft}秒でプロット作成`);
            let s = { I: 2 };
            if(text.value.length > 10) s.F = 1;
            nextQuestion(s);
        };
        container.append(timerDisplay, text, document.createElement('br'), btn);
    }
    // ⑧ 脳内割合（スライダー）
    else if (q.type === 'slider') {
        const labels = document.createElement('div');
        labels.className = 'slider-container';
        const spanL = document.createElement('span'); spanL.innerText = q.leftLabel;
        const spanR = document.createElement('span'); spanR.innerText = q.rightLabel;
        labels.append(spanL, spanR);

        const slider = document.createElement('input');
        slider.type = 'range'; slider.min = '0'; slider.max = '100'; slider.value = '50';
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.innerText = "決定";
        
        btn.onclick = () => {
            let val = parseInt(slider.value);
            let s = {};
            addLog(`スライダー調整: ${val}%`);
            if (val < 40) s[q.leftAttr] = 2; else if (val > 60) s[q.rightAttr] = 2;
            nextQuestion(s);
        };
        container.append(labels, slider, btn);
    }
    // ⑨ 無意識お絵描き（キャンバス）
    else if (q.type === 'draw') {
        const canvas = document.createElement('canvas');
        canvas.width = 280; canvas.height = 150;
        const ctx = canvas.getContext('2d');
        // キャンバスを白く初期化
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        let isDrawing = false, strokes = 0;
        ctx.strokeStyle = '#ffb8d1'; ctx.lineWidth = 3; ctx.lineCap = 'round';

        canvas.onmousedown = (e) => { isDrawing = true; strokes++; ctx.beginPath(); ctx.moveTo(e.offsetX, e.offsetY); };
        canvas.onmousemove = (e) => { if(isDrawing) { ctx.lineTo(e.offsetX, e.offsetY); ctx.stroke(); } };
        canvas.onmouseup = () => { isDrawing = false; };

        // 自由色ピッカー
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
            if (strokes > 10) { s.I = 2; s.D = 1; } else { s.M = 2; s.F = 1; }
            nextQuestion(s);
        };
        container.append(canvas, tools, btn);

        // カラーピッカーのリアルタイム反映
        setTimeout(() => {
            const pc = document.getElementById('draw-color');
            if(pc) pc.addEventListener('input', (e) => { ctx.strokeStyle = e.target.value; addLog(`> ペン色変更: ${e.target.value}`); });
        }, 100);
    }
}

// 質問遷移・ナビゲーション
function nextQuestion(addScores = {}) {
    historyStack.push({ index: currentQ, scores: { ...scores }, logs: [...actionLogs] });
    for (let k in addScores) scores[k] += addScores[k];
    currentQ++;
    showQuestion();
}

// 戻るボタン
document.getElementById('back-btn').addEventListener('click', () => {
    if (historyStack.length > 0) {
        if(timerInterval) clearInterval(timerInterval);
        const last = historyStack.pop();
        currentQ = last.index;
        scores = last.scores;
        actionLogs = last.logs;
        showQuestion();
    }
});

// 退出ボタン
document.getElementById('quit-btn').addEventListener('click', () => {
    if(timerInterval) clearInterval(timerInterval);
    showScreen('start-screen');
});

// パス・わからないボタン
document.getElementById('skip-btn').addEventListener('click', () => {
    addLog("質問をパスしました");
    nextQuestion({});
});

// ==========================================
// 📊 結果計算・表示・共有
// ==========================================
function calculateResult() {
    const type = (scores.D >= scores.F ? 'D' : 'F') + (scores.C >= scores.E ? 'C' : 'E') + (scores.I >= scores.M ? 'I' : 'M') + (scores.L >= scores.A ? 'L' : 'A');
    showScreen('result-screen');
    
    const res = resultsData[type] || { title: "特異点", desc: "解析不能な創作脳です。", danger: "不明", best: "未知" };
    
    document.getElementById('result-type').innerText = type;
    document.getElementById('result-title').innerText = res.title;
    document.getElementById('result-desc').innerText = res.desc;
    document.getElementById('result-danger').innerText = res.danger;
    document.getElementById('result-best').innerText = res.best;
    
    addLog(`最終解析完了。プロトコル: [${type}]`);
    
    // 行動ログの書き出し
    const logList = document.getElementById('action-log-list');
    logList.innerHTML = actionLogs.map(log => `<div>> ${log}</div>`).join('');
}

// ログのコピー機能
document.getElementById('copy-log-btn').addEventListener('click', () => {
    const logText = actionLogs.join('\n');
    navigator.clipboard.writeText(logText).then(() => {
        alert("深層ログをクリップボードにコピーしました！");
    });
});

// 画像として保存 (html2canvas使用)
document.getElementById('save-img-btn').addEventListener('click', () => {
    html2canvas(document.getElementById('capture-area'), { 
        backgroundColor: "#1e1432",
        scale: 2 
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `CreatorBrainLog_${document.getElementById('result-type').innerText}.png`;
        link.href = canvas.toDataURL();
        link.click();
    });
});

// SNS共有
document.getElementById('share-btn').addEventListener('click', () => {
    const type = document.getElementById('result-type').innerText;
    const title = document.getElementById('result-title').innerText;
    const text = `私の創作深層心理タイプは【${type}：${title}】でした！\n創作時の脳内の癖まで暴かれるヤバい診断です…🧠🧪\n\n#創作16タイプ診断 #CreatorBrainLog\n`;
    
    if (navigator.share) {
        navigator.share({ title: '創作16タイプ診断', text: text, url: SHARE_URL });
    } else {
        alert("お使いのブラウザは共有機能に対応していません😭\nURL: " + SHARE_URL);
    }
});

// もう一度診断
document.getElementById('restart-btn').addEventListener('click', () => {
    showScreen('start-screen');
});

// ==========================================
// 🚨 ランダムギミック群（アラート・芋虫・Glitch）
// ==========================================
const alerts = [
    { text: "今、新しいキャラを追加したくなりましたか？", yes: () => { scores.D+=2; addLog("衝動検知: 新キャラ追加の欲求"); }, no: () => { scores.F+=2; addLog("維持検知: 既存構成の重視"); } },
    { text: "設定に致命的な矛盾を発見しました！直しますか？", yes: () => { scores.M+=2; addLog("論理検知: 整合性へのこだわり"); }, no: () => { scores.I+=2; addLog("衝動検知: 勢いの重視"); } },
    { text: "作品のテーマを、今すぐ誰かに語りたくなりましたか？", yes: () => { scores.A+=2; addLog("感情検知: 表出への欲求"); }, no: () => { scores.L+=2; addLog("論理検知: 内面での完結"); } }
];

function spawnAlert() {
    // 質問画面中かつポップアップが出ていない時のみ
    if(!document.getElementById('question-screen').classList.contains('active') || document.getElementById('impulse-popup')) return;
    
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
    
    // 5秒で自動消滅
    setTimeout(() => { if(document.body.contains(pop)) pop.remove(); }, 5000);
}
setInterval(() => { if(Math.random() < 0.2) spawnAlert(); }, 15000);

// Glitch演出
function triggerGlitch() {
    if(!document.getElementById('question-screen').classList.contains('active')) return;
    document.body.classList.add('glitch-active');
    let reacted = false;
    const reactHandler = () => { reacted = true; scores.I += 2; addLog("ノイズに対する即時反応を確認(I+2)"); };
    document.addEventListener('click', reactHandler, { once: true });
    
    setTimeout(() => {
        document.body.classList.remove('glitch-active');
        document.removeEventListener('click', reactHandler);
        if(!reacted) { scores.M += 2; addLog("ノイズを冷静に観測(M+2)"); }
    }, 1500);
}
setInterval(() => { if(Math.random() < 0.15) triggerGlitch(); }, 25000);

// 🐛 芋虫ギミック (LSI-Ni)
let bugHits = 0;
function spawnCaterpillar() {
    // 質問画面中のみ
    if(document.getElementById('caterpillar') || !document.getElementById('question-screen').classList.contains('active')) return;

    const bug = document.createElement('div');
    bug.id = 'caterpillar';
    bug.innerText = '🐛';
    bug.style.animation = 'crawl 18s linear forwards';
    
    const speech = document.createElement('div');
    speech.id = 'caterpillar-speech';
    bug.appendChild(speech);

    const quotes = ["Tiの構造が乱れている…", "SLE、また貴様か…！", "Seの暴力はやめたまえ…", "Niが告げている…もうすぐ潰されると…"];

    bug.addEventListener('click', () => {
        bugHits++;
        bug.style.transform = `scale(${1 - bugHits*0.02})`;
        speech.innerText = quotes[Math.floor(Math.random() * quotes.length)];
        speech.style.opacity = 1;
        setTimeout(() => speech.style.opacity = 0, 1500);
        
        if (bugHits >= 30) {
            bug.innerText = '💥';
            speech.innerText = "システム崩壊…！！";
            scores.I += 3; scores.E += 2;
            addLog("芋虫を粉砕。外部干渉と破壊衝動を確認 (I+3, E+2)");
            setTimeout(() => bug.remove(), 1000);
        }
    });
    
    document.body.appendChild(bug);
    
    bug.addEventListener('animationend', () => {
        if(bugHits < 30) bug.remove();
        bugHits = 0;
        // 次の出現をセット
        setTimeout(spawnCaterpillar, Math.random() * 20000 + 10000);
    });
}