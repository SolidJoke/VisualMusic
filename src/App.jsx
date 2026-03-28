import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import PianoKeyboard from "./components/Instruments/PianoKeyboard";
import Fretboard from "./components/Instruments/Fretboard";
import PianoRoll from "./components/Sequencer/PianoRoll";
import DAWHelper from "./components/Sequencer/DAWHelper";

import {
  getScaleNotes,
  generateChordsFromNNS,
  MODES,
  NOTES,
  getClosestInversion,
  getAbsoluteNoteValue,
} from "./core/theory";
import { BRICKS } from "./core/bricks";
import * as Tone from "tone";

import {
  chordSynth,
  kickSynth,
  snareSynth,
  hatSynth,
  bassSynth,
  applyGenrePreset,
  initPianoSampler,
  getPianoSynth,
} from "./audio/AudioEngine";

const noteNamesArray = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

const toRoman = (nnsStr) => {
  const map = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI", 7: "VII" };
  const baseNum = nnsStr.match(/[1-7]/)?.[0] || "1";
  let roman = map[baseNum];
  const isMinor = nnsStr.includes("-");
  const isDim = nnsStr.includes("°") || nnsStr.includes("b5");

  if (isMinor || isDim) roman = roman.toLowerCase();

  let prefix =
    nnsStr.includes("b") && !nnsStr.includes("b5")
      ? "b"
      : nnsStr.includes("#")
        ? "#"
        : "";
  let suffix = isDim ? "°" : isMinor ? "m" : "";

  return prefix + roman + suffix;
};

const translations = {
  fr: {
    title: "🎛️ Vmu : VisualMusic Coach",
    about: "ℹ️ À propos",
    studioMode: "🎛️ Mode Studio (Genres)",
    dictMode: "📖 Mode Dictionnaire",
    enableAudio: "🔊 ACTIVER L'AUDIO",
    stopAudio: "⏹️ STOP AUDIO",
    masterVol: "🔊 Volume",
    tempoBpm: "⏱️ Tempo (BPM)",
    styleSelection: "1. Sélection du Style",
    theme: "Thème (Rythme & Accords) :",
    varA: "Variation A",
    varB: "Variation B",
    magicProg: "Progression Magique :",
    backRoot: "🔄 Revenir à la base",
    showAll: "👁️ Tout afficher",
    focusMode: "🔍 Mode Focus",
    tabDrums: "🥁 Séquenceurs",
    tabPiano: "🎹 Piano",
    tabGuitars: "🎸 Guitares",
    freeExplorer: "📖 Explorateur Libre",
    rootNote: "Note de base (Fondamentale)",
    structType: "Type de structure",
    singleNote: "Note Unique (Apprendre le manche)",
    chordMaj: "Accord Majeur (1-3-5)",
    chordMin: "Accord Mineur (1-b3-5)",
    scaleMaj: "Gamme Majeure (Ionian)",
    scaleMin: "Gamme Mineure (Aeolian)",
    chord: "🎸 Accord",
    scale: "🎹 Gamme",
    guitarPos: "Position Guitare :",
    posAll: "Toutes les cases",
    posOpen: "Ouverte (0-4)",
    posMid: "Milieu (5-9)",
    posHigh: "Aiguë (10-14)",
    drumMachine: "🥁 Boîte à Rythmes",
    melodicSeq: "🎹 Séquenceur Mélodique",
    labelRoot: "Fondamentale",
    labelThird: "Tierce",
    labelFifth: "Quinte",
    labelScale: "Gamme",
    labelTarget: "Note Magique (Target)",
    aboutDesc:
      "Une application web interactive conçue pour aider les musiciens à comprendre la théorie musicale, à visualiser les gammes et les accords, et à s'entraîner sur des rythmes générés en temps réel.",
    createdBy: "Créé et développé par Gabriel Resende.",
    kofi: "☕ M'offrir un café sur Ko-fi",
    github: "💻 Voir le code sur GitHub",
    listen: "🎵 Écouter",
    guideTheoryBtn: "💡 Guide & Théorie",
    theoryModalTitle: "📖 Théorie Musicale & Guide",
    guideTitle: "💡 Guide d'Improvisation (La Méthode du Drone)",
    guide1:
      "Étape 1 (Le Drone) : Joue la Fondamentale (Rouge) dans les graves et laisse-la résonner. Cela crée ton centre de gravité musical.",
    guide2:
      "Étape 2 (L'Exploration) : Avec l'autre main, promène-toi librement sur les notes de la Gamme (Bleu-gris). Écoute comment chaque note sonne par rapport à ta fondamentale.",
    guide3:
      "Étape 3 (La Couleur) : Insiste sur la Note Magique (Dorée) ! C'est la note caractéristique qui donne à ce mode son émotion unique.",
    modesEmotionTitle: "🎭 Topographie des Émotions (Les Modes)",
    modeIonian: "Majeur Joyeux, Triomphant, Lumineux.",
    modeDorian: "Mineur Nostalgique, Héroïque, Jazzy.",
    modePhrygian: "Mineur Sombre, Exotique, Flamenco.",
    modeLydian: "Majeur Magique, Flottant, Rêveur.",
    modeMixolydian: "Majeur Bluesy, Rock, Entraînant.",
    modeAeolian: "Mineur Triste, Mélancolique, Épique.",
    modeLocrian: "Diminué Tendu, Instable, Cauchemardesque.",
    displayStandard: "Noms d'Accords",
    displayNNS: "Degrés Romains",
    invRoot: "Accord joué : État fondamental",
    invFirst: "Accord joué : 1er renversement (Tierce à la basse)",
    invSecond: "Accord joué : 2ème renversement (Quinte à la basse)",
    invUnknown: "Accord joué : Voicing personnalisé",
  },
  en: {
    title: "🎛️ Vmu: VisualMusic Coach",
    about: "ℹ️ About",
    studioMode: "🎛️ Studio Mode (Genres)",
    dictMode: "📖 Dictionary Mode",
    enableAudio: "🔊 ENABLE AUDIO",
    stopAudio: "⏹️ STOP AUDIO",
    masterVol: "🔊 Volume",
    tempoBpm: "⏱️ Tempo (BPM)",
    styleSelection: "1. Style Selection",
    theme: "Theme (Rhythm & Chords):",
    varA: "Variation A",
    varB: "Variation B",
    magicProg: "Magic Progression:",
    backRoot: "🔄 Back to root",
    showAll: "👁️ Show All",
    focusMode: "🔍 Focus Mode",
    tabDrums: "🥁 Sequencers",
    tabPiano: "🎹 Piano",
    tabGuitars: "🎸 Guitars",
    freeExplorer: "📖 Free Explorer",
    rootNote: "Root Note",
    structType: "Structure Type",
    singleNote: "Single Note (Fretboard learning)",
    chordMaj: "Major Chord (1-3-5)",
    chordMin: "Minor Chord (1-b3-5)",
    scaleMaj: "Major Scale (Ionian)",
    scaleMin: "Minor Scale (Aeolian)",
    chord: "🎸 Chord",
    scale: "🎹 Scale",
    guitarPos: "Guitar Position:",
    posAll: "All frets",
    posOpen: "Open (0-4)",
    posMid: "Mid (5-9)",
    posHigh: "High (10-14)",
    drumMachine: "🥁 Drum Machine",
    melodicSeq: "🎹 Melodic Sequencer",
    labelRoot: "Root",
    labelThird: "Third",
    labelFifth: "Fifth",
    labelScale: "Scale",
    labelTarget: "Magic Note (Target)",
    aboutDesc:
      "An interactive web app designed to help musicians understand music theory, visualize scales and chords, and practice over real-time generated rhythms.",
    createdBy: "Created and developed by Gabriel Resende.",
    kofi: "☕ Buy me a coffee on Ko-fi",
    github: "💻 View code on GitHub",
    listen: "🎵 Listen",
    guideTheoryBtn: "💡 Guide & Theory",
    theoryModalTitle: "📖 Music Theory & Guide",
    guideTitle: "💡 Improvisation Guide (The Drone Method)",
    guide1:
      "Step 1 (The Drone): Play the Root Note (Red) in the low register and let it ring. This creates your musical center of gravity.",
    guide2:
      "Step 2 (Exploration): With your other hand, wander freely over the Scale notes (Blue-grey). Listen to how each note sounds against your root.",
    guide3:
      "Step 3 (The Color): Emphasize the Magic Note (Gold)! This is the Character Tone that gives this mode its unique emotion.",
    modesEmotionTitle: "🎭 Topography of Emotions (Modes)",
    modeIonian: "Major Happy, Triumphant, Bright.",
    modeDorian: "Minor Nostalgic, Heroic, Jazzy.",
    modePhrygian: "Minor Dark, Exotic, Flamenco.",
    modeLydian: "Major Magic, Floating, Dreamy.",
    modeMixolydian: "Major Bluesy, Rock, Driving.",
    modeAeolian: "Minor Sad, Melancholic, Epic.",
    modeLocrian: "Diminished Tense, Unstable, Nightmarish.",
    displayStandard: "Chord Names",
    displayNNS: "Roman Numerals",
    invRoot: "Current Voicing: Root Position",
    invFirst: "Current Voicing: 1st Inversion (Third in bass)",
    invSecond: "Current Voicing: 2nd Inversion (Fifth in bass)",
    invUnknown: "Current Voicing: Custom",
  },
  pt: {
    title: "🎛️ Vmu: VisualMusic Coach",
    about: "ℹ️ Sobre",
    studioMode: "🎛️ Modo Estúdio (Gêneros)",
    dictMode: "📖 Modo Dicionário",
    enableAudio: "🔊 ATIVAR ÁUDIO",
    stopAudio: "⏹️ PARAR ÁUDIO",
    masterVol: "🔊 Volume",
    tempoBpm: "⏱️ Tempo (BPM)",
    styleSelection: "1. Seleção de Estilo",
    theme: "Tema (Ritmo e Acordes):",
    varA: "Variação A",
    varB: "Variação B",
    magicProg: "Progressão Mágica:",
    backRoot: "🔄 Voltar à tônica",
    showAll: "👁️ Mostrar Tudo",
    focusMode: "🔍 Modo Foco",
    tabDrums: "🥁 Sequenciadores",
    tabPiano: "🎹 Piano",
    tabGuitars: "🎸 Guitarras",
    freeExplorer: "📖 Explorador Livre",
    rootNote: "Nota Fundamental (Tônica)",
    structType: "Tipo de estrutura",
    singleNote: "Nota Única (Aprender o braço)",
    chordMaj: "Acorde Maior (1-3-5)",
    chordMin: "Acorde Menor (1-b3-5)",
    scaleMaj: "Escala Maior (Jônio)",
    scaleMin: "Escala Menor (Eólio)",
    chord: "🎸 Acorde",
    scale: "🎹 Escala",
    guitarPos: "Posição da Guitarra:",
    posAll: "Todas as casas",
    posOpen: "Aberta (0-4)",
    posMid: "Meio (5-9)",
    posHigh: "Aguda (10-14)",
    drumMachine: "🥁 Caixa de Ritmos",
    melodicSeq: "🎹 Sequenciador Melódico",
    labelRoot: "Tônica",
    labelThird: "Terça",
    labelFifth: "Quinta",
    labelScale: "Escala",
    labelTarget: "Nota Mágica (Alvo)",
    aboutDesc:
      "Um aplicativo web interativo projetado para ajudar músicos a entender a teoria musical, visualizar escalas e acordes e praticar sobre ritmos gerados em tempo real.",
    createdBy: "Criado e desenvolvido por Gabriel Resende.",
    kofi: "☕ Pague-me um café no Ko-fi",
    github: "💻 Ver código no GitHub",
    listen: "🎵 Ouvir",
    guideTheoryBtn: "💡 Guia e Teoria",
    theoryModalTitle: "📖 Teoria Musical e Guia",
    guideTitle: "💡 Guia de Improvisação (Método Drone)",
    guide1:
      "Passo 1 (O Drone): Toque a Nota Fundamental (Vermelha) nos graves e deixe soar. Isso cria seu centro de gravidade musical.",
    guide2:
      "Passo 2 (A Exploração): Com a outra mão, passeie livremente pelas notas da Escala (Azul-acinzentado). Ouça como cada nota soa em relação à tônica.",
    guide3:
      "Passo 3 (A Cor): Destaque a Nota Mágica (Dourada)! É a nota característica que dá a esse modo sua emoção única.",
    modesEmotionTitle: "🎭 Topografia das Emoções (Modos)",
    modeIonian: "Maior Alegre, Triunfante, Brilhante.",
    modeDorian: "Menor Nostálgico, Heróico, Jazzy.",
    modePhrygian: "Menor Sombrio, Exótico, Flamenco.",
    modeLydian: "Maior Mágico, Flutuante, Sonhador.",
    modeMixolydian: "Maior Bluesy, Rock, Animado.",
    modeAeolian: "Menor Triste, Melancólico, Épico.",
    modeLocrian: "Diminuto Tenso, Instável.",
    displayStandard: "Nomes dos Acordes",
    displayNNS: "Graus Romanos",
    invRoot: "Acorde atual: Estado fundamental",
    invFirst: "Acorde atual: 1ª Inversão (Terça no baixo)",
    invSecond: "Acorde atual: 2ª Inversão (Quinta no baixo)",
    invUnknown: "Acorde atual: Voicing personalizado",
  },
  zh: {
    title: "🎛️ Vmu: 视觉音乐教练",
    about: "ℹ️ 关于",
    studioMode: "🎛️ 工作室模式 (流派)",
    dictMode: "📖 字典模式",
    enableAudio: "🔊 开启音频",
    stopAudio: "⏹️ 停止音频",
    masterVol: "🔊 音量",
    tempoBpm: "⏱️ 速度 (BPM)",
    styleSelection: "1. 风格选择",
    theme: "主题 (节奏与和弦):",
    varA: "变体 A",
    varB: "变体 B",
    magicProg: "魔法和弦进行:",
    backRoot: "🔄 返回根音",
    showAll: "👁️ 显示全部",
    focusMode: "🔍 专注模式",
    tabDrums: "🥁 音序器",
    tabPiano: "🎹 钢琴",
    tabGuitars: "🎸 吉他",
    freeExplorer: "📖 自由探索器",
    rootNote: "根音 (Root)",
    structType: "结构类型",
    singleNote: "单音 (学习指板)",
    chordMaj: "大三和弦 (1-3-5)",
    chordMin: "小三和弦 (1-b3-5)",
    scaleMaj: "大调音阶 (Ionian)",
    scaleMin: "小调音阶 (Aeolian)",
    chord: "🎸 和弦",
    scale: "🎹 音阶",
    guitarPos: "吉他把位:",
    posAll: "所有品格",
    posOpen: "开放把位 (0-4)",
    posMid: "中把位 (5-9)",
    posHigh: "高把位 (10-14)",
    drumMachine: "🥁 鼓机",
    melodicSeq: "🎹 旋律音序器",
    labelRoot: "根音",
    labelThird: "三音",
    labelFifth: "五音",
    labelScale: "音阶",
    labelTarget: "魔法音符 (目标)",
    aboutDesc:
      "一个互动的Web应用程序，旨在帮助音乐家理解音乐理论，可视化音阶和和弦，并跟随实时生成的节奏进行练习。",
    createdBy: "由 Gabriel Resende 创建和开发。",
    kofi: "☕ 在 Ko-fi 上请我喝杯咖啡",
    github: "💻 在 GitHub 上查看代码",
    listen: "🎵 听",
    guideTheoryBtn: "💡 指南与理论",
    theoryModalTitle: "📖 音乐理论与指南",
    guideTitle: "💡 即兴演奏指南 (持续音方法)",
    guide1:
      "第一步 (持续音): 在低音区弹奏根音 (红色) 并让它持续发声。这创造了你的音乐重心。",
    guide2:
      "第二步 (探索): 用另一只手在音阶音符 (蓝灰色) 上自由游走。聆听每个音符与根音的碰撞。",
    guide3:
      "第三步 (色彩): 强调魔法音符 (金色)！这是赋予该调式独特情感的特征音。",
    modesEmotionTitle: "🎭 情感地形图 (调式)",
    modeIonian: "大调 快乐，凯旋，明亮。",
    modeDorian: "小调 怀旧，英雄，爵士。",
    modePhrygian: "小调 黑暗，异国情调，弗拉门戈。",
    modeLydian: "大调 神奇，漂浮，梦幻。",
    modeMixolydian: "大调 蓝调，摇滚，驱动。",
    modeAeolian: "小调 悲伤，忧郁，史诗。",
    modeLocrian: "减音阶 紧张，不稳定，噩梦般。",
    displayStandard: "和弦名称",
    displayNNS: "罗马数字",
    invRoot: "当前和弦: 原位",
    invFirst: "当前和弦: 第一转位 (三音在低音)",
    invSecond: "当前和弦: 第二转位 (五音在低音)",
    invUnknown: "当前和弦: 自定义",
  },
};

function App() {
  const [lang, setLang] = useState("fr");
  const txt = translations[lang];

  const [appMode, setAppMode] = useState("studio");
  const [notation, setNotation] = useState("us");
  const [chordDisplayMode, setChordDisplayMode] = useState("standard");
  const [showAbout, setShowAbout] = useState(false);
  const [showTheory, setShowTheory] = useState(false);

  const [isAudioReady, setIsAudioReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [masterVolume, setMasterVolume] = useState(-12);
  const [currentBpm, setCurrentBpm] = useState(120);
  const [currentStep, setCurrentStep] = useState(-1);

  const [currentBrickIndex, setCurrentBrickIndex] = useState(0);
  const [displayMode, setDisplayMode] = useState("chord");
  const [clickedChord, setClickedChord] = useState(null);
  const [layoutMode, setLayoutMode] = useState("all");
  const [activeTab, setActiveTab] = useState("sequencer");
  const [currentTheme, setCurrentTheme] = useState("A");
  const [currentAbsoluteNotes, setCurrentAbsoluteNotes] = useState([]);
  const [currentlyPlayingNotes, setCurrentlyPlayingNotes] = useState([]);

  const [chordOctaveOffset, setChordOctaveOffset] = useState(0);
  const [contextualScaleAbsoluteValues, setContextualScaleAbsoluteValues] =
    useState([]);
  const [lastClickedContext, setLastClickedContext] = useState(null);
  const [singlePlayContext, setSinglePlayContext] = useState(null);

  const [dictRoot, setDictRoot] = useState(0);
  const [dictType, setDictType] = useState("single_note");
  const [fretboardZone, setFretboardZone] = useState("all");

  const activeBrick = BRICKS.at(Number(currentBrickIndex));

  const activeDrums =
    currentTheme === "B" && activeBrick.drumTracksVariation
      ? activeBrick.drumTracksVariation
      : activeBrick.drumTracks;
  const activeMelody =
    currentTheme === "B" && activeBrick.melodyTracksVariation
      ? activeBrick.melodyTracksVariation
      : activeBrick.melodyTracks;
  const activeProgression =
    currentTheme === "B" && activeBrick.nnsProgressionVariation
      ? activeBrick.nnsProgressionVariation
      : activeBrick.nnsProgression;

  let activeNotes = [];
  let currentRootValue = 0;
  let targetValue = -1;

  if (appMode === "studio") {
    const scaleNotes = getScaleNotes(
      activeBrick.rootValue,
      activeBrick.modeName,
    );
    const modeData = Reflect.get(MODES, activeBrick.modeName);

    if (displayMode === "scale") {
      activeNotes = scaleNotes;
    } else {
      if (clickedChord) {
        activeNotes = currentAbsoluteNotes.map((val, idx) => ({
          value: val % 12,
          order: idx + 1,
          absoluteValue: val,
        }));
      } else {
        const n1 = scaleNotes.at(0).value;
        const n2 = scaleNotes.at(2).value;
        const n3 = scaleNotes.at(4).value;
        activeNotes.push(
          { value: n1, order: 1, absoluteValue: n1 + 48 },
          { value: n2, order: 2, absoluteValue: n2 + (n2 < n1 ? 60 : 48) },
          { value: n3, order: 3, absoluteValue: n3 + (n3 < n1 ? 60 : 48) },
        );
      }
    }
    currentRootValue = clickedChord
      ? clickedChord.rootNote.value
      : activeBrick.rootValue;
    targetValue = !clickedChord
      ? (activeBrick.rootValue + modeData.targetInterval) % 12
      : -1;
  } else {
    currentRootValue = Number(dictRoot);
    if (dictType === "scale_major")
      activeNotes = getScaleNotes(currentRootValue, "Ionian");
    else if (dictType === "scale_minor")
      activeNotes = getScaleNotes(currentRootValue, "Aeolian");
    else if (dictType === "chord_major")
      activeNotes.push(
        { value: currentRootValue, order: 1 },
        { value: (currentRootValue + 4) % 12, order: 3 },
        { value: (currentRootValue + 7) % 12, order: 5 },
      );
    else if (dictType === "chord_minor")
      activeNotes.push(
        { value: currentRootValue, order: 1 },
        { value: (currentRootValue + 3) % 12, order: "b3" },
        { value: (currentRootValue + 7) % 12, order: 5 },
      );
    else if (dictType === "single_note")
      activeNotes.push({ value: currentRootValue, order: null });
  }

  let inversionText = "";
  if (clickedChord && currentAbsoluteNotes.length > 0) {
    const bassNoteClass = currentAbsoluteNotes[0] % 12;
    const rootVal = clickedChord.rootNote.value;
    const isMinor = clickedChord.nns.includes("-");
    const isDim =
      clickedChord.nns.includes("°") || clickedChord.nns.includes("b5");

    const thirdVal = (rootVal + (isMinor || isDim ? 3 : 4)) % 12;
    const fifthVal = (rootVal + (isDim ? 6 : 7)) % 12;

    if (bassNoteClass === rootVal) inversionText = txt.invRoot;
    else if (bassNoteClass === thirdVal) inversionText = txt.invFirst;
    else if (bassNoteClass === fifthVal) inversionText = txt.invSecond;
    else inversionText = txt.invUnknown;
  }

  const drumRef = useRef(activeDrums);
  const melodyRef = useRef(activeMelody);
  const rootRef = useRef(currentRootValue);
  const appModeRef = useRef(appMode);

  drumRef.current = activeDrums;
  melodyRef.current = activeMelody;
  rootRef.current = currentRootValue;
  appModeRef.current = appMode;

  useEffect(() => {
    if (appMode === "studio") {
      document.documentElement.style.setProperty(
        "--theme-primary",
        activeBrick.theme.primary,
      );
      document.documentElement.style.setProperty(
        "--theme-bg",
        activeBrick.theme.bg,
      );
      setCurrentBpm(activeBrick.bpm);
      Tone.Transport.bpm.value = activeBrick.bpm;
      // Apply genre-specific instrument presets
      applyGenrePreset(activeBrick._group);
    } else {
      document.documentElement.style.setProperty("--theme-primary", "#ffd700");
      document.documentElement.style.setProperty("--theme-bg", "#1a1a1a");
    }
    setClickedChord(null);
    setCurrentAbsoluteNotes([]);
    setCurrentTheme("A");
  }, [currentBrickIndex, appMode, activeBrick]);

  useEffect(() => {
    Tone.Destination.volume.value = masterVolume;
  }, [masterVolume]);

  useEffect(() => {
    let stepCounter = 0;

    const repeat = (time) => {
      Tone.Draw.schedule(() => setCurrentStep(stepCounter), time);

      if (appModeRef.current === "dictionary") {
        stepCounter = (stepCounter + 1) % 16;
        return;
      }

      const drums = drumRef.current;
      const melodies = melodyRef.current;
      const rootVal = rootRef.current;

      if (drums && drums.length > 0) {
        drums.forEach((track) => {
          if (track.activeSteps.includes(stepCounter)) {
            let vel =
              track.lowVelocitySteps &&
              track.lowVelocitySteps.includes(stepCounter)
                ? 0.3
                : 0.8;
            let name = track.name.toLowerCase();

            if (name.includes("kick")) {
              kickSynth.triggerAttackRelease("C1", "8n", time, vel);
            } else if (
              name.includes("snare") ||
              name.includes("clap") ||
              name.includes("rim")
            ) {
              snareSynth.triggerAttackRelease("16n", time, vel);
            } else {
              hatSynth.triggerAttackRelease("32n", time, vel);
            }
          }
        });
      }

      if (melodies && melodies.length > 0) {
        melodies.forEach((track) => {
          if (track.activeSteps.includes(stepCounter)) {
            let vel =
              track.lowVelocitySteps &&
              track.lowVelocitySteps.includes(stepCounter)
                ? 0.4
                : 0.9;
            let octave = track.name.toLowerCase().includes("bass") ? 2 : 4; // Adjusted octaves
            let noteName = `${noteNamesArray[rootVal % 12]}${octave}`;
            bassSynth.triggerAttackRelease(noteName, "16n", time, vel);
            Tone.Draw.schedule(() => {
              const absNote = getAbsoluteNoteValue(noteName);
              setCurrentlyPlayingNotes([absNote]);
              setTimeout(() => setCurrentlyPlayingNotes([]), 150);
            }, time);
          }
        });
      }

      stepCounter = (stepCounter + 1) % 16;
    };

    if (isPlaying) {
      Tone.Transport.scheduleRepeat(repeat, "16n");
    } else {
      Tone.Transport.cancel();
      setCurrentStep(-1);
      stepCounter = 0;
    }

    return () => Tone.Transport.cancel();
  }, [isPlaying]);

  const togglePlayback = async () => {
    if (!isAudioReady) {
      await Tone.start();
      Tone.Destination.volume.value = masterVolume;
      Tone.Transport.bpm.value = currentBpm;
      initPianoSampler();
      if (appMode === "studio") applyGenrePreset(activeBrick._group);
      setIsAudioReady(true);
    }
    if (isPlaying) {
      Tone.Transport.pause();
      setIsPlaying(false);
    } else {
      Tone.Transport.start();
      setIsPlaying(true);
    }
  };

  const handleBpmChange = (e) => {
    const newBpm = Number(e.target.value);
    setCurrentBpm(newBpm);
    Tone.Transport.bpm.value = newBpm;
  };

  const handleChordClick = async (c, chordIndexInProgression) => {
    setClickedChord(c);
    if (!isAudioReady) {
      await Tone.start();
      Tone.Destination.volume.value = masterVolume;
      setIsAudioReady(true);
    }
    const rootVal = c.rootNote.value;
    const isMinor = c.nns.includes("-");
    const isDim = c.nns.includes("°") || c.nns.includes("b5");
    let thirdInterval = isMinor || isDim ? 3 : 4;
    let fifthInterval = isDim ? 6 : 7;

    // Reset voice-leading on first chord of progression to prevent octave drift
    const prevNotes = chordIndexInProgression === 0 ? [] : currentAbsoluteNotes;

    const nextNotes = getClosestInversion(
      prevNotes,
      rootVal,
      thirdInterval,
      fifthInterval,
    );
    const notesToPlay = nextNotes.map(
      (n) => `${noteNamesArray[n % 12]}${Math.floor(n / 12) - 1}`,
    );

    getPianoSynth().triggerAttackRelease(notesToPlay, "2n");
    setCurrentAbsoluteNotes(nextNotes);
    setCurrentlyPlayingNotes(nextNotes);
    setTimeout(() => setCurrentlyPlayingNotes([]), 500); // Duration of animation
  };

  const playDictionaryAudio = async () => {
    if (!isAudioReady) {
      await Tone.start();
      Tone.Destination.volume.value = masterVolume;
      setIsAudioReady(true);
    }

    let notesToPlay = [];
    let absolutePitches = [];

    if (dictType.includes("scale")) {
      const modeName = dictType === "scale_major" ? "Ionian" : "Aeolian";
      const intervals = MODES[modeName].intervals;
      let currentPitch = Number(dictRoot) + 4 * 12; // Start scale at octave 4
      absolutePitches.push(currentPitch);

      intervals.forEach((interval) => {
        currentPitch += interval;
        absolutePitches.push(currentPitch);
      });

      for (let i = absolutePitches.length - 2; i >= 0; i--) {
        absolutePitches.push(absolutePitches[i]);
      }

      notesToPlay = absolutePitches.map(
        (p) => `${noteNamesArray[p % 12]}${Math.floor(p / 12)}`,
      );
    } else {
      const baseOctave = 4;
      absolutePitches = activeNotes.map((n) => n.value + baseOctave * 12);
      notesToPlay = absolutePitches.map(
        (p) => `${noteNamesArray[p % 12]}${Math.floor(p / 12)}`,
      );
    }

    if (dictType.includes("chord")) {
      getPianoSynth().triggerAttackRelease(notesToPlay, "2n");
      setCurrentlyPlayingNotes(absolutePitches);
      setTimeout(() => setCurrentlyPlayingNotes([]), 500);
    } else if (dictType.includes("scale")) {
      const now = Tone.now();
      const noteDuration = 60 / currentBpm;
      const stepTime = noteDuration / 2;
      absolutePitches.forEach((pitch, index) => {
        const noteName = `${noteNamesArray[pitch % 12]}${Math.floor(pitch / 12)}`;
        getPianoSynth().triggerAttackRelease(noteName, "8n", now + index * stepTime);
        Tone.Draw.schedule(
          () => {
            setCurrentlyPlayingNotes([pitch]);
            setTimeout(
              () => setCurrentlyPlayingNotes([]),
              Math.max(stepTime * 1000 - 50, 50),
            );
          },
          now + index * stepTime,
        );
      });
    } else {
      // Single note
      const noteName = `${noteNamesArray[currentRootValue % 12]}4`;
      const absNote = getAbsoluteNoteValue(noteName);
      getPianoSynth().triggerAttackRelease(noteName, "2n");
      setCurrentlyPlayingNotes([absNote]);
      setTimeout(() => setCurrentlyPlayingNotes([]), 500);
    }
  };

  const playSingleNote = async (noteName, context = null) => {
    if (!isAudioReady) {
      await Tone.start();
      Tone.Destination.volume.value = masterVolume;
      setIsAudioReady(true);
    }

    const absNote = getAbsoluteNoteValue(noteName);

    if (appMode === "dictionary" && dictType.includes("scale")) {
      if (absNote % 12 === Number(dictRoot)) {
        const modeName = dictType === "scale_major" ? "Ionian" : "Aeolian";
        const intervals = MODES[modeName].intervals;
        let currentPitch = absNote;
        const absolutePitches = [currentPitch];
        intervals.forEach((interval) => {
          currentPitch += interval;
          absolutePitches.push(currentPitch);
        });
        for (let i = absolutePitches.length - 2; i >= 0; i--) {
          absolutePitches.push(absolutePitches[i]);
        }

        const noteDuration = 60 / currentBpm;
        const stepTime = noteDuration / 2;
        const scaleObjs = absolutePitches
          .slice(0, Math.floor(absolutePitches.length / 2) + 1)
          .map((p, i) => ({ absoluteValue: p, order: i + 1 }));
        setContextualScaleAbsoluteValues(scaleObjs);
        setLastClickedContext(context);
        setSinglePlayContext(null); // scale playback: path logic handles highlighting

        const now = Tone.now();
        absolutePitches.forEach((pitch, index) => {
          const nName = `${noteNamesArray[pitch % 12]}${Math.floor(pitch / 12)}`;
          getPianoSynth().triggerAttackRelease(nName, "8n", now + index * stepTime);
          Tone.Draw.schedule(
            () => {
              setCurrentlyPlayingNotes([pitch]);
              setTimeout(
                () => setCurrentlyPlayingNotes([]),
                Math.max(stepTime * 1000 - 50, 50),
              );
            },
            now + index * stepTime,
          );
        });
        return;
      }
    }

    getPianoSynth().triggerAttackRelease(noteName, "8n");
    setContextualScaleAbsoluteValues([]);
    setLastClickedContext(null);
    setSinglePlayContext(context ?? null); // remember exact fret position
    setCurrentlyPlayingNotes([absNote]);
    setTimeout(() => {
      setCurrentlyPlayingNotes([]);
      setSinglePlayContext(null);
    }, 500);
  };

  return (
    <div
      className="app-container"
      style={{
        maxWidth: "2560px",
        margin: "0 auto",
        padding: "0 20px",
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        position: "relative",
      }}
    >
      {showAbout && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.85)",
            zIndex: 1000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backdropFilter: "blur(5px)",
          }}
        >
          <div
            style={{
              backgroundColor: "#1a1a1a",
              padding: "40px",
              borderRadius: "12px",
              border: "1px solid var(--theme-primary)",
              maxWidth: "500px",
              width: "90%",
              textAlign: "center",
              position: "relative",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            }}
          >
            <button
              onClick={() => setShowAbout(false)}
              style={{
                position: "absolute",
                top: "15px",
                right: "15px",
                background: "transparent",
                border: "none",
                color: "#fff",
                fontSize: "24px",
                cursor: "pointer",
              }}
            >
              ✖
            </button>
            <h2 style={{ color: "var(--theme-primary)", marginTop: 0 }}>
              Vmu : VisualMusic Coach
            </h2>
            <p style={{ color: "#ccc", lineHeight: "1.6", fontSize: "16px" }}>
              {txt.aboutDesc}
            </p>
            <p style={{ color: "#fff", fontWeight: "bold", margin: "20px 0" }}>
              {txt.createdBy}
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "15px",
                marginTop: "30px",
              }}
            >
              <a
                href="https://ko-fi.com/gabrielgsdresende"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  backgroundColor: "#FF5E5B",
                  color: "#fff",
                  padding: "12px 20px",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: "bold",
                  fontSize: "18px",
                  transition: "transform 0.2s",
                }}
                onMouseOver={(e) => (e.target.style.transform = "scale(1.05)")}
                onMouseOut={(e) => (e.target.style.transform = "scale(1)")}
              >
                {txt.kofi}
              </a>
              <a
                href="https://github.com/SolidJoke/VisualMusic"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  backgroundColor: "#333",
                  color: "#fff",
                  padding: "12px 20px",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: "bold",
                  fontSize: "18px",
                  border: "1px solid #555",
                  transition: "transform 0.2s",
                }}
                onMouseOver={(e) => (e.target.style.transform = "scale(1.05)")}
                onMouseOut={(e) => (e.target.style.transform = "scale(1)")}
              >
                {txt.github}
              </a>
            </div>
          </div>
        </div>
      )}

      {showTheory && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.85)",
            zIndex: 1000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backdropFilter: "blur(5px)",
          }}
        >
          <div
            style={{
              backgroundColor: "#1a1a1a",
              padding: "30px",
              borderRadius: "12px",
              border: "1px solid var(--theme-primary)",
              maxWidth: "600px",
              width: "90%",
              position: "relative",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <button
              onClick={() => setShowTheory(false)}
              style={{
                position: "absolute",
                top: "15px",
                right: "15px",
                background: "transparent",
                border: "none",
                color: "#fff",
                fontSize: "24px",
                cursor: "pointer",
              }}
            >
              ✖
            </button>
            <h2
              style={{
                color: "var(--theme-primary)",
                marginTop: 0,
                textAlign: "center",
              }}
            >
              {txt.theoryModalTitle}
            </h2>

            <div
              style={{
                backgroundColor: "#222",
                padding: "15px",
                borderRadius: "8px",
                marginBottom: "20px",
                borderLeft: "4px solid #90caf9",
              }}
            >
              <h3 style={{ margin: "0 0 10px 0", color: "#90caf9" }}>
                {txt.guideTitle}
              </h3>
              <ul
                style={{
                  color: "#e3f2fd",
                  margin: 0,
                  paddingLeft: "20px",
                  lineHeight: "1.6",
                  fontSize: "14px",
                }}
              >
                <li style={{ marginBottom: "8px" }}>{txt.guide1}</li>
                <li style={{ marginBottom: "8px" }}>{txt.guide2}</li>
                <li>{txt.guide3}</li>
              </ul>
            </div>

            <h3
              style={{
                color: "#fff",
                borderBottom: "1px solid #444",
                paddingBottom: "10px",
              }}
            >
              {txt.modesEmotionTitle}
            </h3>
            <ul
              style={{
                listStyleType: "none",
                padding: 0,
                color: "#ccc",
                lineHeight: "1.8",
              }}
            >
              <li>
                <strong style={{ color: "#fff" }}>Ionian :</strong>{" "}
                {txt.modeIonian}
              </li>
              <li>
                <strong style={{ color: "#fff" }}>Dorian :</strong>{" "}
                {txt.modeDorian}
              </li>
              <li>
                <strong style={{ color: "#fff" }}>Phrygian :</strong>{" "}
                {txt.modePhrygian}
              </li>
              <li>
                <strong style={{ color: "#fff" }}>Lydian :</strong>{" "}
                {txt.modeLydian}
              </li>
              <li>
                <strong style={{ color: "#fff" }}>Mixolydian :</strong>{" "}
                {txt.modeMixolydian}
              </li>
              <li>
                <strong style={{ color: "#fff" }}>Aeolian :</strong>{" "}
                {txt.modeAeolian}
              </li>
              <li>
                <strong style={{ color: "#fff" }}>Locrian :</strong>{" "}
                {txt.modeLocrian}
              </li>
            </ul>
          </div>
        </div>
      )}

      <div style={{ flex: 1 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "15px",
          }}
        >
          <h1 style={{ color: "#fff", margin: 0 }}>{txt.title}</h1>

          <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
            <button
              onClick={() => setShowTheory(true)}
              style={{
                padding: "8px 15px",
                backgroundColor: "#1a237e",
                color: "#90caf9",
                border: "1px solid #3949ab",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.backgroundColor = "#283593")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.backgroundColor = "#1a237e")
              }
            >
              {txt.guideTheoryBtn}
            </button>

            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                backgroundColor: "#222",
                color: "#fff",
                border: "1px solid var(--theme-primary)",
                cursor: "pointer",
                fontWeight: "bold",
                outline: "none",
              }}
            >
              <option value="fr">🇫🇷 FR</option>
              <option value="en">🇬🇧 EN</option>
              <option value="pt">🇵🇹 PT</option>
              <option value="zh">🇨🇳 ZH</option>
            </select>

            <button
              onClick={() => setShowAbout(true)}
              style={{
                padding: "8px 15px",
                backgroundColor: "transparent",
                color: "var(--theme-primary)",
                border: "1px solid var(--theme-primary)",
                borderRadius: "20px",
                cursor: "pointer",
                fontWeight: "bold",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "var(--theme-primary)";
                e.target.style.color = "#000";
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "transparent";
                e.target.style.color = "var(--theme-primary)";
              }}
            >
              {txt.about}
            </button>
          </div>
        </div>

        <div className="main-layout-grid">
          {/* --- LEFT COLUMN --- */}
          <div className="layout-col layout-left">
            {appMode === "studio" && (
              <div
                className="dashboard-panel"
                style={{
                  textAlign: "center",
                  width: "100%",
                  boxSizing: "border-box",
                  maxWidth: "none",
                  margin: "0",
                }}
              >
                <h2 style={{ margin: "0 0 15px 0", color: "#fff" }}>
                  {txt.styleSelection}
                </h2>

                <select
                  value={currentBrickIndex}
                  onChange={(e) => setCurrentBrickIndex(e.target.value)}
                  style={{
                    padding: "10px",
                    fontSize: "18px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    backgroundColor: "#222",
                    color: "var(--theme-primary)",
                    border: "1px solid var(--theme-primary)",
                    fontWeight: "bold",
                    width: "100%",
                  }}
                >
                  <optgroup label="🎷 Jazz & Bossa">
                    {BRICKS.map((brick, index) => brick._group === 'jazz' && <option key={index} value={index}>{brick.name[lang]}</option>)}
                  </optgroup>
                  <optgroup label="🌍 World & Groove">
                    {BRICKS.map((brick, index) => brick._group === 'world' && <option key={index} value={index}>{brick.name[lang]}</option>)}
                  </optgroup>
                  <optgroup label="🎤 Urban & Hip-Hop">
                    {BRICKS.map((brick, index) => brick._group === 'urban' && <option key={index} value={index}>{brick.name[lang]}</option>)}
                  </optgroup>
                  <optgroup label="🎹 Pop & Funk">
                    {BRICKS.map((brick, index) => brick._group === 'pop' && <option key={index} value={index}>{brick.name[lang]}</option>)}
                  </optgroup>
                  <optgroup label="🎸 Rock & Metal">
                    {BRICKS.map((brick, index) => brick._group === 'rock' && <option key={index} value={index}>{brick.name[lang]}</option>)}
                  </optgroup>
                  <optgroup label="🎧 Electronic">
                    {BRICKS.map((brick, index) => brick._group === 'electronic' && <option key={index} value={index}>{brick.name[lang]}</option>)}
                  </optgroup>
                </select>

                <div style={{ marginTop: "15px" }}>
                  <span className="info-badge">
                    🎵 Mode: {activeBrick.modeName}
                  </span>
                  <span className="info-badge">
                    🎸 Tuning: {activeBrick.tuning}
                  </span>
                </div>

                <div className="effects-text">
                  💡 {activeBrick.effects[lang]}
                </div>
                {activeBrick.inspiration?.[lang] && (
                  <div style={{ color: '#888', fontSize: '13px', marginTop: '6px', fontStyle: 'italic', paddingLeft: '12px' }}>
                    {activeBrick.inspiration[lang]}
                  </div>
                )}
                <div
                  style={{
                    color: "#aaa",
                    fontSize: "13px",
                    marginTop: "5px",
                    fontStyle: "italic",
                    textAlign: "left",
                    paddingLeft: "12px",
                  }}
                >
                  🎧 {activeBrick.examples[lang]}
                </div>

                <div
                  style={{
                    marginTop: "20px",
                    color: "#fff",
                    fontSize: "15px",
                    backgroundColor: "#111",
                    padding: "15px",
                    borderRadius: "4px",
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "15px",
                      marginBottom: "15px",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          color: "#ccc",
                          marginRight: "10px",
                          fontSize: "16px",
                        }}
                      >
                        {txt.theme}
                      </span>
                      <br />
                      <br />
                      <button
                        onClick={() => setCurrentTheme("A")}
                        style={{
                          padding: "8px 15px",
                          marginRight: "5px",
                          backgroundColor:
                            currentTheme === "A"
                              ? "var(--theme-primary)"
                              : "#222",
                          color: currentTheme === "A" ? "#000" : "#fff",
                          border: "1px solid #555",
                          cursor: "pointer",
                          borderRadius: "4px",
                          fontWeight: "bold",
                        }}
                      >
                        {txt.varA}
                      </button>
                      <button
                        onClick={() => setCurrentTheme("B")}
                        style={{
                          padding: "8px 15px",
                          backgroundColor:
                            currentTheme === "B"
                              ? "var(--theme-primary)"
                              : "#222",
                          color: currentTheme === "B" ? "#000" : "#fff",
                          border: "1px solid #555",
                          cursor: "pointer",
                          borderRadius: "4px",
                          fontWeight: "bold",
                        }}
                      >
                        {txt.varB}
                      </button>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          color: "#ccc",
                          fontSize: "14px",
                          fontWeight: "bold",
                        }}
                      >
                        Octave Base:
                      </span>
                      <select
                        value={chordOctaveOffset}
                        onChange={(e) => {
                          setChordOctaveOffset(Number(e.target.value));
                          setCurrentAbsoluteNotes([]);
                        }}
                        style={{
                          padding: "6px",
                          fontSize: "13px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          backgroundColor: "#222",
                          color: "#fff",
                          border: "1px solid #555",
                        }}
                      >
                        <option value={-2}>-2 Oct.</option>
                        <option value={-1}>-1 Oct.</option>
                        <option value={0}>C4</option>
                        <option value={1}>+1 Oct.</option>
                        <option value={2}>+2 Oct.</option>
                      </select>
                    </div>
                  </div>
                  <strong>{txt.magicProg} </strong> <br />
                  <br />
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "center",
                      gap: "5px",
                    }}
                  >
                    {generateChordsFromNNS(
                      activeBrick.rootValue,
                      activeBrick.modeName,
                      activeProgression,
                    ).map((c, i) => {
                      const isSelected =
                        clickedChord && clickedChord.nns === c.nns;
                      const chordText =
                        chordDisplayMode === "nns"
                          ? toRoman(c.nns)
                          : notation === "us"
                            ? c.chordNameUS
                            : c.chordNameEU;

                      return (
                        <span
                          key={i}
                          style={{ display: "flex", alignItems: "center" }}
                        >
                          <button
                            onClick={() => handleChordClick(c, i)}
                            style={{
                              background: isSelected
                                ? "var(--theme-primary)"
                                : "#222",
                              color: isSelected
                                ? "#000"
                                : "var(--theme-primary)",
                              border: "2px solid var(--theme-primary)",
                              borderRadius: "6px",
                              padding: "6px 12px",
                              cursor: "pointer",
                              fontWeight: "bold",
                              fontSize: "16px",
                              transition: "all 0.2s",
                              flexShrink: 0,
                            }}
                          >
                            {chordText}
                          </button>
                          {i < activeProgression.length - 1 ? (
                            <span style={{ margin: "0 5px" }}>➜</span>
                          ) : (
                            ""
                          )}
                        </span>
                      );
                    })}
                  </div>
                  {clickedChord && (
                    <div style={{ marginTop: "15px" }}>
                      <button
                        onClick={() => {
                          setClickedChord(null);
                          setCurrentAbsoluteNotes([]);
                        }}
                        style={{
                          padding: "5px 10px",
                          fontSize: "12px",
                          cursor: "pointer",
                          backgroundColor: "#444",
                          color: "#fff",
                          border: "none",
                          borderRadius: "4px",
                        }}
                      >
                        {txt.backRoot}
                      </button>
                    </div>
                  )}
                  {inversionText && (
                    <div
                      style={{
                        marginTop: "15px",
                        fontSize: "14px",
                        color: "#90caf9",
                        fontStyle: "italic",
                      }}
                    >
                      🎹 {inversionText}
                    </div>
                  )}
                </div>
              </div>
            )}

            {appMode === "dictionary" && (
              <div
                className="dashboard-panel"
                style={{
                  textAlign: "center",
                  backgroundColor: "#2a2a2a",
                  border: "1px solid var(--theme-primary)",
                  width: "100%",
                  boxSizing: "border-box",
                  maxWidth: "none",
                  margin: "0",
                }}
              >
                <h2
                  style={{
                    margin: "0 0 15px 0",
                    color: "var(--theme-primary)",
                  }}
                >
                  {txt.freeExplorer}
                </h2>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "stretch",
                    gap: "20px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        color: "#ccc",
                        marginBottom: "5px",
                      }}
                    >
                      {txt.rootNote}
                    </label>
                    <select
                      value={dictRoot}
                      onChange={(e) => setDictRoot(e.target.value)}
                      style={{
                        padding: "10px",
                        fontSize: "18px",
                        width: "100%",
                        borderRadius: "4px",
                        cursor: "pointer",
                        backgroundColor: "#111",
                        color: "#fff",
                        border: "1px solid #555",
                        boxSizing: "border-box",
                      }}
                    >
                      {NOTES.map((n) => (
                        <option key={n.value} value={n.value}>
                          {notation === "us" ? n.us : n.eu}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        color: "#ccc",
                        marginBottom: "5px",
                      }}
                    >
                      {txt.structType}
                    </label>
                    <select
                      value={dictType}
                      onChange={(e) => setDictType(e.target.value)}
                      style={{
                        padding: "10px",
                        fontSize: "18px",
                        width: "100%",
                        borderRadius: "4px",
                        cursor: "pointer",
                        backgroundColor: "#111",
                        color: "#fff",
                        border: "1px solid #555",
                        boxSizing: "border-box",
                      }}
                    >
                      <option value="single_note">{txt.singleNote}</option>
                      <option value="chord_major">{txt.chordMaj}</option>
                      <option value="chord_minor">{txt.chordMin}</option>
                      <option value="scale_major">{txt.scaleMaj}</option>
                      <option value="scale_minor">{txt.scaleMin}</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={playDictionaryAudio}
                  style={{
                    marginTop: "25px",
                    padding: "12px",
                    width: "100%",
                    fontSize: "16px",
                    fontWeight: "bold",
                    borderRadius: "8px",
                    cursor: "pointer",
                    backgroundColor: "var(--theme-primary)",
                    color: "#000",
                    border: "none",
                    transition: "transform 0.1s",
                  }}
                  onMouseDown={(e) =>
                    (e.target.style.transform = "scale(0.95)")
                  }
                  onMouseUp={(e) => (e.target.style.transform = "scale(1)")}
                >
                  {txt.listen}
                </button>
              </div>
            )}

            {/* NEW LEFT CONTROL PANEL ADDED HERE */}
            <div
              className="dashboard-panel"
              style={{
                padding: "15px",
                display: "flex",
                flexDirection: "column",
                gap: "15px",
                backgroundColor: "#1a1a1a",
                border: "1px solid #333",
                width: "100%",
                boxSizing: "border-box",
                maxWidth: "none",
                margin: "0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                <button
                  onClick={() => setNotation("us")}
                  style={{
                    padding: "8px 16px",
                    cursor: "pointer",
                    borderRadius: "4px",
                    border: "none",
                    fontWeight: "bold",
                    backgroundColor:
                      notation === "us" ? "var(--theme-primary)" : "#333",
                    color: notation === "us" ? "#000" : "#fff",
                  }}
                >
                  US (A,B,C)
                </button>
                <button
                  onClick={() => setNotation("eu")}
                  style={{
                    padding: "8px 16px",
                    cursor: "pointer",
                    borderRadius: "4px",
                    border: "none",
                    fontWeight: "bold",
                    backgroundColor:
                      notation === "eu" ? "var(--theme-primary)" : "#333",
                    color: notation === "eu" ? "#000" : "#fff",
                  }}
                >
                  EU (Do,Ré)
                </button>
              </div>
              {appMode === "studio" && (
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                    justifyContent: "center",
                  }}
                >
                  <button
                    onClick={() => setChordDisplayMode("standard")}
                    style={{
                      padding: "8px 16px",
                      cursor: "pointer",
                      borderRadius: "4px",
                      border: "none",
                      fontWeight: "bold",
                      backgroundColor:
                        chordDisplayMode === "standard"
                          ? "var(--theme-primary)"
                          : "#333",
                      color: chordDisplayMode === "standard" ? "#000" : "#fff",
                    }}
                  >
                    {txt.displayStandard}
                  </button>
                  <button
                    onClick={() => setChordDisplayMode("nns")}
                    style={{
                      padding: "8px 16px",
                      cursor: "pointer",
                      borderRadius: "4px",
                      border: "none",
                      fontWeight: "bold",
                      backgroundColor:
                        chordDisplayMode === "nns"
                          ? "var(--theme-primary)"
                          : "#333",
                      color: chordDisplayMode === "nns" ? "#000" : "#fff",
                    }}
                  >
                    {txt.displayNNS}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* --- CENTER COLUMN --- */}
          <div
            className="layout-col layout-center"
            style={{ alignItems: "center" }}
          >
            {layoutMode === "tabs" && (
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  gap: "10px",
                  marginBottom: "20px",
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={() => setActiveTab("sequencer")}
                  style={{
                    padding: "10px",
                    fontWeight: "bold",
                    backgroundColor:
                      activeTab === "sequencer"
                        ? "var(--theme-primary)"
                        : "#333",
                    color: activeTab === "sequencer" ? "#000" : "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  {txt.tabDrums}
                </button>
                <button
                  onClick={() => setActiveTab("piano")}
                  style={{
                    padding: "10px",
                    fontWeight: "bold",
                    backgroundColor:
                      activeTab === "piano" ? "var(--theme-primary)" : "#333",
                    color: activeTab === "piano" ? "#000" : "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  {txt.tabPiano}
                </button>
                <button
                  onClick={() => setActiveTab("guitars")}
                  style={{
                    padding: "10px",
                    fontWeight: "bold",
                    backgroundColor:
                      activeTab === "guitars" ? "var(--theme-primary)" : "#333",
                    color: activeTab === "guitars" ? "#000" : "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  {txt.tabGuitars}
                </button>
              </div>
            )}

            {appMode === "studio" &&
              (layoutMode === "all" || activeTab === "sequencer") && (
                <div
                  style={{
                    width: "100%",
                    marginBottom: "30px",
                    backgroundColor: "#1a1a1a",
                    padding: "15px",
                    borderRadius: "8px",
                    border: "1px solid #333",
                    boxSizing: "border-box",
                  }}
                >
                  <h3 style={{ color: "var(--theme-primary)", marginTop: 0 }}>
                    {txt.drumMachine}
                  </h3>
                  <div className="scrollable-instrument">
                    <PianoRoll
                      tracks={activeDrums}
                      totalSteps={16}
                      currentStep={currentStep}
                    />
                  </div>
                  <h3
                    style={{ color: "var(--theme-primary)", marginTop: "30px" }}
                  >
                    {txt.melodicSeq}
                  </h3>
                  <div className="scrollable-instrument">
                    <PianoRoll
                      tracks={activeMelody}
                      totalSteps={16}
                      currentStep={currentStep}
                    />
                  </div>
                  <DAWHelper
                    drumTracks={activeDrums}
                    melodyTracks={activeMelody}
                    bpm={currentBpm}
                    genreName={activeBrick.name[lang] || activeBrick.name.en}
                    lang={lang}
                  />
                </div>
              )}

            {(appMode === "dictionary" ||
              layoutMode === "all" ||
              activeTab === "piano" ||
              activeTab === "guitars") && (
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "center",
                  gap: "20px",
                  flexWrap: "wrap",
                  padding: "15px",
                  backgroundColor: "#1e1e1e",
                  borderRadius: "8px",
                  border: "1px solid #333",
                  marginBottom: "15px",
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      backgroundColor: "#cf6679",
                      borderRadius: "50%",
                    }}
                  ></div>
                  <span style={{ color: "#ccc", fontSize: "14px" }}>
                    {txt.labelRoot}
                  </span>
                </div>
                {dictType !== "single_note" && (
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <div
                        style={{
                          width: "16px",
                          height: "16px",
                          backgroundColor: "#64b5f6",
                          borderRadius: "50%",
                        }}
                      ></div>
                      <span style={{ color: "#ccc", fontSize: "14px" }}>
                        {txt.labelThird}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <div
                        style={{
                          width: "16px",
                          height: "16px",
                          backgroundColor: "#81c784",
                          borderRadius: "50%",
                        }}
                      ></div>
                      <span style={{ color: "#ccc", fontSize: "14px" }}>
                        {txt.labelFifth}
                      </span>
                    </div>
                  </>
                )}
                {(appMode === "studio" && displayMode === "scale") ||
                (dictType && dictType.includes("scale")) ? (
                  <>
                    {appMode === "studio" && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginLeft: "20px",
                        }}
                      >
                        <div
                          style={{
                            width: "16px",
                            height: "16px",
                            backgroundColor: "#ffd700",
                            borderRadius: "50%",
                            boxShadow: "0 0 10px #ffd700",
                          }}
                        ></div>
                        <span
                          style={{
                            color: "#ffd700",
                            fontSize: "14px",
                            fontWeight: "bold",
                          }}
                        >
                          {txt.labelTarget}
                        </span>
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <div
                        style={{
                          width: "16px",
                          height: "16px",
                          backgroundColor: "#78909c",
                          borderRadius: "50%",
                        }}
                      ></div>
                      <span style={{ color: "#ccc", fontSize: "14px" }}>
                        {txt.labelScale}
                      </span>
                    </div>
                  </>
                ) : null}
              </div>
            )}

            {(appMode === "dictionary" ||
              layoutMode === "all" ||
              activeTab === "piano") && (
              <div className="scrollable-instrument" style={{ width: "100%" }}>
                <PianoKeyboard
                  activeNotes={activeNotes}
                  numOctaves={3}
                  notation={notation}
                  rootValue={currentRootValue}
                  targetValue={targetValue}
                  onNoteClick={playSingleNote}
                  currentlyPlayingNotes={currentlyPlayingNotes}
                  contextualScaleAbsoluteValues={contextualScaleAbsoluteValues}
                  dictType={appMode === "dictionary" ? dictType : null}
                />
              </div>
            )}

            {(appMode === "dictionary" ||
              layoutMode === "all" ||
              activeTab === "guitars") && (
              <div className="scrollable-instrument" style={{ width: "100%" }}>
                <Fretboard
                  instrument="guitar"
                  activeNotes={activeNotes}
                  notation={notation}
                  stringTuning={activeBrick.guitarStrings}
                  rootValue={currentRootValue}
                  targetValue={targetValue}
                  fretboardZone={fretboardZone}
                  onNoteClick={playSingleNote}
                  currentlyPlayingNotes={currentlyPlayingNotes}
                  contextualScaleAbsoluteValues={contextualScaleAbsoluteValues}
                  dictType={appMode === "dictionary" ? dictType : null}
                  lastClickedContext={lastClickedContext}
                  singlePlayContext={singlePlayContext}
                />
                <br />
                <Fretboard
                  instrument="bass"
                  activeNotes={activeNotes}
                  notation={notation}
                  stringTuning={activeBrick.bassStrings}
                  rootValue={currentRootValue}
                  targetValue={targetValue}
                  fretboardZone={fretboardZone}
                  onNoteClick={playSingleNote}
                  currentlyPlayingNotes={currentlyPlayingNotes}
                  contextualScaleAbsoluteValues={contextualScaleAbsoluteValues}
                  dictType={appMode === "dictionary" ? dictType : null}
                  lastClickedContext={lastClickedContext}
                  singlePlayContext={singlePlayContext}
                />
              </div>
            )}
          </div>

          {/* --- RIGHT COLUMN --- */}
          <div className="layout-col layout-right">
            <div
              className="dashboard-panel"
              style={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "15px",
                backgroundColor: "#111",
                width: "100%",
                boxSizing: "border-box",
                maxWidth: "none",
                margin: "0",
              }}
            >
              <button
                onClick={() => setAppMode("studio")}
                style={{
                  padding: "15px",
                  fontSize: "16px",
                  fontWeight: "bold",
                  borderRadius: "8px",
                  cursor: "pointer",
                  backgroundColor:
                    appMode === "studio" ? "var(--theme-primary)" : "#222",
                  color: appMode === "studio" ? "#000" : "#fff",
                  border: "none",
                  transition: "all 0.3s",
                  width: "100%",
                }}
              >
                {txt.studioMode}
              </button>
              <button
                onClick={() => setAppMode("dictionary")}
                style={{
                  padding: "15px",
                  fontSize: "16px",
                  fontWeight: "bold",
                  borderRadius: "8px",
                  cursor: "pointer",
                  backgroundColor:
                    appMode === "dictionary" ? "var(--theme-primary)" : "#222",
                  color: appMode === "dictionary" ? "#000" : "#fff",
                  border: "none",
                  transition: "all 0.3s",
                  width: "100%",
                }}
              >
                {txt.dictMode}
              </button>
            </div>

            <div
              className="dashboard-panel"
              style={{
                padding: "25px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "25px",
                backgroundColor: "#1a1a1a",
                border: `1px solid ${isPlaying ? "#4CAF50" : "#333"}`,
                boxShadow: isPlaying
                  ? "0 0 15px rgba(76, 175, 80, 0.4)"
                  : "none",
                width: "100%",
                boxSizing: "border-box",
                maxWidth: "none",
                margin: "0",
              }}
            >
              <button
                onClick={togglePlayback}
                style={{
                  padding: "15px",
                  width: "100%",
                  fontSize: "18px",
                  cursor: "pointer",
                  backgroundColor: isPlaying ? "#e53935" : "#4CAF50",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  display: "flex",
                  justifyContent: "center",
                  transition: "all 0.2s",
                  boxShadow: isPlaying
                    ? "0 0 15px rgba(229, 57, 53, 0.4)"
                    : "none",
                }}
              >
                {isPlaying ? txt.stopAudio : txt.enableAudio}
              </button>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "25px",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                  }}
                >
                  <label
                    style={{
                      color: "#ccc",
                      fontSize: "14px",
                      marginBottom: "8px",
                      fontWeight: "bold",
                    }}
                  >
                    {txt.masterVol} ({masterVolume} dB)
                  </label>
                  <input
                    type="range"
                    min="-40"
                    max="0"
                    value={masterVolume}
                    onChange={(e) => setMasterVolume(e.target.value)}
                    style={{ cursor: "pointer", width: "100%" }}
                  />
                </div>

                {(
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                    }}
                  >
                    <label
                      style={{
                        color: "var(--theme-primary)",
                        fontSize: "14px",
                        marginBottom: "8px",
                        fontWeight: "bold",
                      }}
                    >
                      {txt.tempoBpm} : {currentBpm}
                    </label>
                    <input
                      type="range"
                      min="60"
                      max="200"
                      value={currentBpm}
                      onChange={handleBpmChange}
                      style={{
                        cursor: "pointer",
                        width: "100%",
                        accentColor: "var(--theme-primary)",
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* NEW RIGHT CONTROL PANEL ADDED HERE */}
            <div
              className="dashboard-panel"
              style={{
                padding: "15px",
                display: "flex",
                flexDirection: "column",
                gap: "20px",
                backgroundColor: "#1a1a1a",
                border: "1px solid #333",
                width: "100%",
                boxSizing: "border-box",
                maxWidth: "none",
                margin: "0",
              }}
            >
              {appMode === "studio" && (
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    justifyContent: "center",
                  }}
                >
                  <button
                    onClick={() => setDisplayMode("chord")}
                    style={{
                      padding: "8px 16px",
                      cursor: "pointer",
                      borderRadius: "4px",
                      border: "none",
                      fontWeight: "bold",
                      backgroundColor:
                        displayMode === "chord"
                          ? "var(--theme-primary)"
                          : "#333",
                      color: displayMode === "chord" ? "#000" : "#fff",
                    }}
                  >
                    {txt.chord}
                  </button>
                  <button
                    onClick={() => setDisplayMode("scale")}
                    style={{
                      padding: "8px 16px",
                      cursor: "pointer",
                      borderRadius: "4px",
                      border: "none",
                      fontWeight: "bold",
                      backgroundColor:
                        displayMode === "scale"
                          ? "var(--theme-primary)"
                          : "#333",
                      color: displayMode === "scale" ? "#000" : "#fff",
                    }}
                  >
                    {txt.scale}
                  </button>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  justifyContent: "center",
                }}
              >
                <button
                  onClick={() => setLayoutMode("all")}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "20px",
                    border: "1px solid #777",
                    backgroundColor: layoutMode === "all" ? "#555" : "#222",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  {txt.showAll}
                </button>
                <button
                  onClick={() => setLayoutMode("tabs")}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "20px",
                    border: "1px solid #777",
                    backgroundColor: layoutMode === "tabs" ? "#555" : "#222",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  {txt.focusMode}
                </button>
              </div>

              {(appMode === "dictionary" ||
                layoutMode === "all" ||
                activeTab === "guitars") && (
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: "#ccc", fontWeight: "bold" }}>
                    {txt.guitarPos}
                  </span>
                  <select
                    value={fretboardZone}
                    onChange={(e) => setFretboardZone(e.target.value)}
                    style={{
                      padding: "8px",
                      fontSize: "14px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      backgroundColor: "#222",
                      color: "#fff",
                      border: "1px solid #555",
                    }}
                  >
                    <option value="all">{txt.posAll}</option>
                    <option value="open">{txt.posOpen}</option>
                    <option value="mid">{txt.posMid}</option>
                    <option value="high">{txt.posHigh}</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <footer
        style={{
          marginTop: "60px",
          padding: "20px 0",
          borderTop: "1px solid #333",
          textAlign: "center",
          color: "#666",
          fontSize: "14px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          title="Licence MIT"
          style={{ cursor: "help", transition: "color 0.3s" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#ccc")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#666")}
        >
          © 2026 Gabriel Resende • Vmu (VisualMusic Coach)
        </div>
      </footer>
    </div>
  );
}

export default App;
