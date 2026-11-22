import { describe, it, expect } from "vitest";
import { Midi } from "@tonejs/midi";
import { drumExportKey, exportTimelineDrums, exportTimelineChords, exportTimelineBass, midiFileName } from "../MidiExporter";
import { DRUM_GM_KEY } from "../dispatch";
import { classifyDrumTrack } from "../trackMapping";
import { buildStudioTimeline } from "../../core/timeline";
import { BRICKS } from "../../core/bricks";

/**
 * VMU-217 — the MIDI export for Ableton Live: one name per file, and the
 * drum rows on their own GM keys (the export only; playback is unchanged).
 */

const BPM = 120;

/** The drum notes of the file a style exports: GM key -> number of hits. */
function drumKeys(index, theme) {
  const midi = new Midi(exportTimelineDrums(buildStudioTimeline({ brickIndex: index, theme }), BPM));
  const hits = {};
  midi.tracks[0].notes.forEach((note) => {
    hits[note.midi] = (hits[note.midi] || 0) + 1;
  });
  return hits;
}

const indexOfStyle = (en) => BRICKS.findIndex((brick) => brick.name.en === en);

describe("midiFileName", () => {
  const base = { styleName: "Bossa Nova", key: { rootValue: 7 }, lang: "fr", bpm: 130, variation: "A", part: "drums" };

  it("follows VMU_<style>_<key>_<bpm>bpm_<A|B>_<part>.mid", () => {
    expect(midiFileName(base)).toBe("VMU_Bossa-Nova_Sol_130bpm_A_Batterie.mid");
  });

  it("names the three parts and both variations differently", () => {
    const names = ["drums", "chords", "bass"].flatMap((part) => ["A", "B"].map((variation) => midiFileName({ ...base, part, variation })));
    expect(new Set(names).size).toBe(6);
    expect(midiFileName({ ...base, part: "chords", variation: "B" })).toBe("VMU_Bossa-Nova_Sol_130bpm_B_Accords.mid");
    expect(midiFileName({ ...base, part: "bass" })).toBe("VMU_Bossa-Nova_Sol_130bpm_A_Basse.mid");
  });

  it("puts the key and the part in the interface language", () => {
    expect(midiFileName({ ...base, lang: "en" })).toBe("VMU_Bossa-Nova_G_130bpm_A_Drums.mid");
    expect(midiFileName({ ...base, lang: "pt", part: "bass" })).toBe("VMU_Bossa-Nova_Sol_130bpm_A_Baixo.mid");
    expect(midiFileName({ ...base, lang: "zh", part: "chords" })).toBe("VMU_Bossa-Nova_G_130bpm_A_和弦.mid");
    expect(midiFileName({ ...base, key: { rootValue: 1 } })).toBe("VMU_Bossa-Nova_Do#_130bpm_A_Batterie.mid");
  });

  it("removes what Windows forbids, keeps accents, turns spaces into '-'", () => {
    expect(midiFileName({ ...base, styleName: "Rock / Blues (Basic)" })).toBe("VMU_Rock-Blues-(Basic)_Sol_130bpm_A_Batterie.mid");
    expect(midiFileName({ ...base, styleName: 'R&B / Neo-Soul: "v2"?*' })).toBe("VMU_R&B-Neo-Soul-v2_Sol_130bpm_A_Batterie.mid");
    expect(midiFileName({ ...base, styleName: "Boucle  Électro" })).toBe("VMU_Boucle-Électro_Sol_130bpm_A_Batterie.mid");
    expect(midiFileName({ ...base, styleName: "a<b>c|d\\e" })).toBe("VMU_abcde_Sol_130bpm_A_Batterie.mid");
  });

  it("never yields a character Windows forbids, for every style in every language", () => {
    for (const lang of ["fr", "en", "pt", "zh"]) {
      for (const brick of BRICKS) {
        const name = midiFileName({ ...base, styleName: brick.name[lang], key: { rootValue: brick.rootValue }, lang });
        // eslint-disable-next-line no-control-regex
        expect(name).not.toMatch(/[<>:"/\\|?*\u0000-\u001f]/);
        expect(name).toMatch(/^VMU_.+_\d+bpm_A_.+\.mid$/);
        expect(name).not.toMatch(/\s/);
      }
    }
  });

  it("falls back on a missing style, key or variation", () => {
    expect(midiFileName({ bpm: 90, part: "bass" })).toBe("VMU_Studio_90bpm_A_Basse.mid");
  });
});

describe("drumExportKey — GM keys by row name", () => {
  it("maps the GM drum kit", () => {
    const expected = {
      Kick: 36, Rim: 37, Snare: 38, Clap: 39, Hat: 42, "Closed Hat": 42, "Open Hat": 46, "Pedal Hat": 44,
      "Low Tom": 41, "Floor Tom": 41, "Mid Tom": 45, Tom: 45, "High Tom": 48, Crash: 49, Ride: 51,
    };
    for (const [name, key] of Object.entries(expected)) expect(drumExportKey(name, -1), name).toBe(key);
  });

  it("maps every drum row name bricks.json holds", () => {
    const names = new Set();
    BRICKS.forEach((brick) => [...(brick.drumTracks || []), ...(brick.drumTracksVariation || [])].forEach((t) => names.add(t.name)));
    // VMU-226 lot 1: Disco Funk's backbeat is a Clap (its description says so), key 39.
    expect([...names].sort()).toEqual(["Clap", "Crash", "Hat", "Kick", "Rim", "Snare"]);
    const keys = { Kick: 36, Snare: 38, Hat: 42, Rim: 37, Clap: 39, Crash: 49 };
    names.forEach((name) => expect(drumExportKey(name, -1), name).toBe(keys[name]));
  });

  it("keeps the playback voice's key for a name it does not know", () => {
    expect(drumExportKey("Perc", DRUM_GM_KEY.hat)).toBe(42);
    expect(drumExportKey("Shake it", 38)).toBe(38);
    expect(drumExportKey(undefined, 36)).toBe(36);
  });

  it("leaves playback alone: Rim still plays the snare voice, Crash the hat voice", () => {
    expect(classifyDrumTrack("Rim")).toBe("snare");
    expect(classifyDrumTrack("Crash")).toBe("hat");
  });
});

describe("exported drum file — Rim and Crash keep their sound", () => {
  const reggae = indexOfStyle("Joyful Reggae"); // theme A: Kick, Rim, Hat
  const grooveMetal = indexOfStyle("Groove Metal"); // theme A: Kick, Snare, Crash
  const pop = indexOfStyle("Modern Pop (4 Chords)"); // Kick, Snare, Hat only

  it("Rim goes to 37, no longer to the snare's 38 (before: 4 hits on 38)", () => {
    const hits = drumKeys(reggae, "A");
    expect(hits[37]).toBe(4);
    expect(hits[38]).toBeUndefined();
  });

  it("Crash goes to 49, no longer to the closed hat's 42 (before: 4 hits on 42)", () => {
    const hits = drumKeys(grooveMetal, "A");
    expect(hits[49]).toBe(4);
    expect(hits[42]).toBeUndefined();
    expect(hits[38]).toBe(8);
  });

  it("a Kick/Snare/Hat style is unchanged: 36, 38, 42 only", () => {
    expect(Object.keys(drumKeys(pop, "A")).map(Number).sort((a, b) => a - b)).toEqual([36, 38, 42]);
  });
});

describe("exported drum notes, every style and theme", () => {
  // VMU-226 lot 1 added two: 18:A (the ballad's side stick, Rim) and 19:A (Disco Funk's Clap).
  it("only the styles with a Rim, a Clap or a Crash row leave 36/38/42", () => {
    const moved = [];
    BRICKS.forEach((brick, index) => {
      ["A", "B"].forEach((theme) => {
        const keys = Object.keys(drumKeys(index, theme)).map(Number);
        if (keys.some((key) => ![36, 38, 42].includes(key))) moved.push(`${index}:${theme} ${brick.name.en}`);
      });
    });
    expect(moved).toEqual([
      "7:B Epic Metal",
      "8:A Joyful Reggae",
      "8:B Joyful Reggae",
      "13:B 60s Rock",
      "15:B House",
      "16:A Groove Metal",
      "17:A Middle Eastern",
      "17:B Middle Eastern",
      "18:A Modern Pop (Ballad)",
      "19:A Disco Funk",
      "19:B Disco Funk",
      "20:B Classic Rock",
      "21:A Bossa Nova",
      "21:B Bossa Nova",
      "25:B Afrobeat",
    ]);
  });

  it("the chord and bass files are not touched by the key map", () => {
    const doc = buildStudioTimeline({ brickIndex: 0, theme: "A" });
    expect(new Midi(exportTimelineChords(doc, BPM)).tracks[0].notes.length).toBeGreaterThan(0);
    expect(new Midi(exportTimelineBass(doc, BPM)).tracks[0].notes.length).toBeGreaterThan(0);
  });
});
