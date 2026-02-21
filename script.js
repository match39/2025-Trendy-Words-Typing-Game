let wordList = [];
let currentWord = "";
let currentRomanPatterns = []; 
let charIndex = 0;
let lastWordIndex = -1;
let score = 0;
let timeLeft = 60;
let isPlaying = false;
let timerId = null;

const targetWordElem = document.getElementById('target-word');
const romanDisplayElem = document.getElementById('roman-display');
const scoreElem = document.getElementById('score');
const timerElem = document.getElementById('timer');

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const sounds = {};

async function loadSound(name, url) {
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        sounds[name] = await audioCtx.decodeAudioData(arrayBuffer);
    } catch (e) {
        console.error(`音源の読み込みに失敗: ${url}`, e);
    }
}

function playSE(name) {
    if (!sounds[name] || audioCtx.state === 'suspended') return;
    const source = audioCtx.createBufferSource();
    source.buffer = sounds[name];
    source.connect(audioCtx.destination);
    source.start(0);
}

// --- 初期化 ---
async function init() {
    try {
        await Promise.all([
            loadWords(),
            loadSound('type', 'type.mp3'),
            loadSound('correct', 'correct.mp3'),
            loadSound('miss', 'miss.mp3'),
            loadSound('finish', 'finish.mp3')
        ]);
        // ここを書き換えました！
        targetWordElem.textContent = "2025年流行語タイピング";
        romanDisplayElem.textContent = "PRESS SPACE TO START";
    } catch (e) {
        targetWordElem.textContent = "LOAD ERROR";
        console.error(e);
    }
}

async function loadWords() {
    const response = await fetch('./words.json');
    if (!response.ok) throw new Error("JSONが見つかりません");
    wordList = await response.json();
}

init();

function setWord() {
    let r;
    do {
        r = Math.floor(Math.random() * wordList.length);
    } while (r === lastWordIndex && wordList.length > 1);
    
    lastWordIndex = r;
    currentWord = wordList[r].kanji;
    currentRomanPatterns = wordList[r].roman.split(',').map(p => p.trim());
    charIndex = 0;
    render();
}

function render() {
    targetWordElem.textContent = currentWord;
    const baseRoman = currentRomanPatterns[0];
    const typed = baseRoman.substring(0, charIndex);
    const untyped = baseRoman.substring(charIndex);
    romanDisplayElem.innerHTML = `<span class="typed">${typed}</span>${untyped}`;
}

function startGame() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    score = 0;
    timeLeft = 60;
    isPlaying = true;
    scoreElem.textContent = score;
    timerElem.textContent = timeLeft;
    setWord();

    if (timerId) clearInterval(timerId);
    timerId = setInterval(() => {
        timeLeft--;
        timerElem.textContent = timeLeft;
        if (timeLeft <= 0) endGame();
    }, 1000);
}

function endGame() {
    isPlaying = false;
    clearInterval(timerId);
    playSE('finish');

    let rank = "";
    if (score >= 2000) rank = "【トレンドの神】";
    else if (score >= 1500) rank = "【界隈の有名人】";
    else if (score >= 1000) rank = "【感度高めな一般人】";
    else if (score >= 500) rank = "【古参ぶる情弱】";
    else rank = "【インターネット老人会】";

    targetWordElem.textContent = "TIME UP!";
    romanDisplayElem.innerHTML = `SCORE: ${score}<br>${rank} - PRESS SPACE`;
}

window.addEventListener('keydown', e => {
    if (wordList.length === 0) return;

    if (!isPlaying && e.code === 'Space') {
        startGame();
        return;
    }

    if (isPlaying) {
        const inputChar = e.key.toLowerCase();
        const ignoreKeys = ["shift", "control", "alt", "capslock", "meta", "tab", "enter"];
        if (ignoreKeys.includes(inputChar)) return;

        const matched = currentRomanPatterns.filter(p => 
            p[charIndex] && p[charIndex].toLowerCase() === inputChar
        );

        if (matched.length > 0) {
            currentRomanPatterns = matched;
            charIndex++;
            
            const isComplete = currentRomanPatterns.some(p => charIndex === p.length);

            if (isComplete) {
                playSE('correct');
                score += currentRomanPatterns[0].length * 10;
                scoreElem.textContent = score;
                setWord();
            } else {
                playSE('type');
                render();
            }
        } else {
            playSE('miss');
        }
    }
});