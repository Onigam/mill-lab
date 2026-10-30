import { readManifest, validateManifest } from '@onigam/lab-kit/narration';
import { describe, expect, it } from 'vitest';
import { PART_CATEGORIES, WORLDS, partIds as partIdsOf, type WorldId } from './part-ids';

// The spoken guide: the scripts (narration/<lang>.json) and the manifests generated from them (public/audio/<lang>) must
// agree with the lab's worlds, parts and modes. The ids come from the frozen contract (src/part-ids.ts), which src/lab.test.ts and
// src/data/data.test.ts hold the lab to. The audio files are only listed, never loaded.

const sceneIds: string[] = [...WORLDS];
const partIds: string[] = WORLDS.flatMap((w) => partIdsOf(w));
const worldOf = (partId: string): WorldId | undefined => WORLDS.find((w) => partId in PART_CATEGORIES[w]);

const CUE = /\[\[([a-z]+)(?::([^\]]*))?\]\]/g;
const BOOLEAN_CUES = ['xray', 'cutaway', 'flows', 'isolate'];
const MODES = ['explore', 'assembly', 'install', 'sim', 'plans', 'lessons'];
const CAMERA_CUES = ['home', 'scene', 'frame', 'select'];
/** Ceiling set by the owner for the spoken characters of one language. */
const BUDGET = 30_000;
/** What the 3D worlds allow (docs/3d.md, WORLD in src/three/index.ts): the section is the hero view of the screw and the generator; the
 * X-ray is only used where it shows an inside (the site needs a selection, the powerhouse has no inside); the current and the water flow in all four. */
const SECTION_IN: WorldId[] = ['screw', 'generator'];
const XRAY_IN: WorldId[] = ['screw', 'generator'];

interface Segment {
  id: string;
  scope: string;
  title: string;
  scene: string;
  text: string;
}
interface Script {
  lang: string;
  segments: Segment[];
}

const langOf = (path: string, folder: RegExp): string => folder.exec(path)![1]!;
const scripts = Object.fromEntries(
  Object.entries(
    import.meta.glob('../narration/*.json', { import: 'default', eager: true }) as Record<string, Script>,
  ).map(([path, script]) => [langOf(path, /\/(\w+)\.json$/), script]),
);
const manifests = Object.fromEntries(
  Object.entries(import.meta.glob('../public/audio/*/manifest.json', { import: 'default', eager: true })).map(
    ([path, raw]) => [langOf(path, /\/audio\/(\w+)\//), raw],
  ),
);
const audioFiles = Object.keys(import.meta.glob('../public/audio/*/*.mp3'));

const spokenOf = (s: Segment): string => s.text.replace(CUE, '');

describe('narration wiring', () => {
  // the lab asks for the manifests only once the audio is generated (the owner approves the credits first)
  it.skipIf(Object.keys(manifests).length === 0)('asks for the manifest of the interface language', async () => {
    const { lab } = await import('./lab');
    expect(lab.narration?.manifest).toBe('audio/{lang}/manifest.json');
  });
});

describe('the contract', () => {
  it('has 4 worlds and 47 parts, so 52 segments per language', () => {
    expect(sceneIds).toHaveLength(4);
    expect(partIds).toHaveLength(47);
    for (const lang of Object.keys(scripts)) expect(scripts[lang]!.segments, lang).toHaveLength(1 + 4 + 47);
  });
});

describe.each(Object.keys(scripts))('narration script %s', (lang) => {
  const script = scripts[lang]!;
  const seg = (id: string): Segment => script.segments.find((s) => s.id === id)!;
  const where = (re: RegExp): string[] => script.segments.filter((s) => re.test(s.text)).map((s) => s.id);

  it('has the lab language and a segment for the intro, every world and every part, once each', () => {
    expect(script.lang).toBe(lang);
    const scopes = script.segments.map((s) => s.scope);
    expect(new Set(scopes).size).toBe(scopes.length);
    expect(new Set(script.segments.map((s) => s.id)).size).toBe(script.segments.length);
    expect([...scopes].sort()).toEqual(
      ['intro', ...sceneIds.map((id) => `scene:${id}`), ...partIds.map((id) => `part:${id}`)].sort(),
    );
  });

  it('names its segments intro, scene-<world> and part-<id>, with a title and the voice settings', () => {
    for (const s of script.segments) {
      const [kind, id = ''] = s.scope.split(':');
      expect(s.id, s.scope).toBe(kind === 'intro' ? 'intro' : `${kind === 'part' ? 'part' : 'scene'}-${id}`);
      expect(s.title.trim().length, s.id).toBeGreaterThan(2);
      expect(s.text.trim().length, s.id).toBeGreaterThan(150);
    }
    expect(script).toHaveProperty('settings.speed', 0.95);
    expect(script).toHaveProperty('voiceLabel.fr');
    expect(script).toHaveProperty('voiceLabel.en');
  });

  it('starts every segment in the right world', () => {
    for (const s of script.segments) {
      const [kind, id = ''] = s.scope.split(':');
      const expected = kind === 'part' ? worldOf(id) : kind === 'scene' ? id : undefined;
      if (expected) expect(s.scene, s.id).toBe(expected);
      expect(sceneIds, s.id).toContain(s.scene);
    }
  });

  it('writes only cues the app knows, on worlds, parts and modes of the lab', () => {
    for (const s of script.segments) {
      for (const [, name = '', arg = ''] of s.text.matchAll(CUE)) {
        const at = `${s.id}: [[${name}${arg ? ':' + arg : ''}]]`;
        if (name === 'home') expect(arg, at).toBe('');
        else if (name === 'scene') expect(sceneIds, at).toContain(arg);
        else if (name === 'frame') for (const id of arg.split(',')) expect(partIds, at).toContain(id);
        else if (name === 'select') expect([...partIds, 'none'], at).toContain(arg);
        else if (name === 'explode') expect(Number(arg), at).toBeGreaterThanOrEqual(0);
        else if (BOOLEAN_CUES.includes(name)) expect(['on', 'off'], at).toContain(arg);
        else if (name === 'mode') expect(MODES, at).toContain(arg);
        else expect.fail(`${at}: unknown cue`);
      }
    }
  });

  it('frames only parts of the current world and switches off what it switches on', () => {
    for (const s of script.segments) {
      let world = s.scene;
      const on = new Set<string>();
      for (const [, name = '', arg = ''] of s.text.matchAll(CUE)) {
        if (name === 'scene') world = arg;
        if (name === 'frame') for (const id of arg.split(',')) expect(worldOf(id), `${s.id}: frame ${id}`).toBe(world);
        if (name === 'select' && arg !== 'none') expect(worldOf(arg), `${s.id}: select ${arg}`).toBe(world);
        if (BOOLEAN_CUES.includes(name)) arg === 'on' ? on.add(name) : on.delete(name);
        if (name === 'explode') arg === '0' ? on.delete(name) : on.add(name);
      }
      expect([...on], `${s.id} leaves cues on`).toEqual([]);
    }
  });

  it('uses the section only in the screw and the generator, and X-ray only where it shows an inside', () => {
    for (const s of script.segments) {
      let world = s.scene as WorldId;
      for (const [, name = '', arg = ''] of s.text.matchAll(CUE)) {
        if (name === 'scene') world = arg as WorldId;
        if (name === 'cutaway' && arg === 'on') expect(SECTION_IN, `${s.id}: cutaway in ${world}`).toContain(world);
        if (name === 'xray' && arg === 'on') expect(XRAY_IN, `${s.id}: xray in ${world}`).toContain(world);
      }
    }
  });

  it('keeps a part segment framed by itself: no camera cue, no change of world', () => {
    for (const s of script.segments.filter((x) => x.scope.startsWith('part:'))) {
      const camera = [...s.text.matchAll(CUE)].filter((m) => CAMERA_CUES.includes(m[1] ?? '') || m[1] === 'mode');
      expect(
        camera.map((m) => m[0]),
        s.id,
      ).toEqual([]);
    }
  });

  it('moves the camera at most once every 35 spoken characters', () => {
    for (const s of script.segments) {
      let last: { at: number; cue: string } | undefined;
      let removed = 0;
      for (const m of s.text.matchAll(CUE)) {
        const at = m.index - removed;
        removed += m[0].length;
        if (!CAMERA_CUES.includes(m[1] ?? '')) continue;
        if (last) expect(at - last.at, `${s.id}: ${last.cue} then ${m[0]}`).toBeGreaterThanOrEqual(35);
        last = { at, cue: m[0] };
      }
    }
  });

  it('hops through the four worlds and the modes in the introduction, and ends on the site, nothing selected', () => {
    const cues = [...seg('intro').text.matchAll(CUE)].map((m) => m[0]);
    for (const w of ['screw', 'generator', 'powerroom', 'site']) expect(cues, w).toContain(`[[scene:${w}]]`);
    const modes = cues.filter((c) => c.startsWith('[[mode:'));
    expect(modes).toEqual(['assembly', 'install', 'sim', 'lessons', 'plans', 'explore'].map((m) => `[[mode:${m}]]`));
    expect(cues.slice(-2)).toEqual(['[[scene:site]]', '[[select:none]]']);
  });

  it('gives each world a home view first and walks through its parts', () => {
    for (const w of sceneIds) {
      const text = seg(`scene-${w}`).text;
      expect(text.trimStart().startsWith('[[home]]'), w).toBe(true);
      const framed = new Set([...text.matchAll(/\[\[frame:([^\]]*)\]\]/g)].flatMap((m) => m[1]!.split(',')));
      expect(framed.size, `${w} frames at least 5 parts`).toBeGreaterThanOrEqual(5);
    }
  });

  it('says its disclaimers once: the reconstruction notice and the generic screw in the intro, the video’s hopes on the house', () => {
    const words = {
      fr: {
        notice: /reconstitution pédagogique|plan officiel|plan de construction/i,
        generic: /la vis est générique/i,
        hedge: /dans le modèle/i,
        smallHope: /deux cents watts/i,
        bigHope: /(?<!virgule )deux kilowatts/i,
        notSimulated: /ne la simule pas/i,
      },
      en: {
        notice: /educational reconstruction|official plan|construction plan/i,
        generic: /the screw is generic/i,
        hedge: /in the model/i,
        smallHope: /two hundred watts/i,
        bigHope: /(?<!point )two kilowatts/i,
        notSimulated: /does not simulate it/i,
      },
    }[lang as 'fr' | 'en'];
    if (!words) return;
    expect(where(words.notice)).toEqual(['intro']);
    expect(where(words.generic)).toEqual(['intro']);
    expect(where(words.hedge).length).toBeLessThanOrEqual(1);
    expect(where(words.smallHope)).toEqual(['part-house-load']);
    expect(where(words.bigHope)).toEqual(['part-house-load']);
    expect(where(words.notSimulated)).toEqual(['part-dump-load']);
  });

  it('says each safety line once, where the gesture is risky', () => {
    const lines: Record<string, Record<string, [RegExp, string]>> = {
      fr: {
        padlock: [/cadenas/i, 'part-intake-gate'],
        alone: [/jamais seul/i, 'part-water-chamber'],
        trough: [/n’entrez jamais/i, 'part-trough'],
        chain: [/happe/i, 'part-chain'],
        disconnect: [/ne débranchez jamais/i, 'part-generator'],
        magnets: [/pince la peau/i, 'part-gen-magnets'],
        live: [/sous tension/i, 'part-gen-terminals'],
        arc: [/\barc\b/i, 'part-dc-breaker'],
        battery: [/chaîne de bijou/i, 'part-battery'],
        mains: [/mortelle/i, 'part-inverter'],
        electrician: [/électricien qualifié/i, 'part-earthing'],
        waterRight: [/droit d’eau/i, 'scene-site'],
      },
      en: {
        padlock: [/padlock/i, 'part-intake-gate'],
        alone: [/never go down alone/i, 'part-water-chamber'],
        trough: [/never step into/i, 'part-trough'],
        chain: [/snatches/i, 'part-chain'],
        disconnect: [/never disconnect/i, 'part-generator'],
        magnets: [/pinches skin/i, 'part-gen-magnets'],
        live: [/are live/i, 'part-gen-terminals'],
        arc: [/\barc\b/i, 'part-dc-breaker'],
        battery: [/jewellery chain/i, 'part-battery'],
        mains: [/lethal/i, 'part-inverter'],
        electrician: [/qualified electrician/i, 'part-earthing'],
        waterRight: [/legal right/i, 'scene-site'],
      },
    };
    const set = lines[lang];
    if (!set) return;
    for (const [hazard, [re, id]] of Object.entries(set)) expect(where(re), hazard).toEqual([id]);
  });

  it('is anonymous: no person, channel, association, company, brand or institution in a text or a title', () => {
    const names =
      /viseta|visetta|archipelle|pelton|paulygones|kaplan|francis|rorres|nagel|simmons|lubitz|dellinger|brada|lashofer|neozone|révolution énergétique|energetic revolution|moulin de bru|youtube|wikipedia|jica|piggott|ram pump|mill lab|labo du moulin/i;
    for (const s of script.segments) expect(`${s.title} ${s.text}`, s.id).not.toMatch(names);
    // the one exception: the usual name of the device, "vis d’Archimède" / "Archimedes screw", is a common noun, not a person
    const device = /vis d[’']Archim[eè]de|Archimedes screw/gi;
    for (const s of script.segments)
      expect(
        `${s.title} ${s.text}`.replace(device, ''),
        `${s.id}: Archimedes only as the name of the device`,
      ).not.toMatch(/archim[eè]de/i);
  });

  it('is spoken text: no digit, symbol, abbreviation or straight quote, one space, no markdown', () => {
    for (const s of script.segments) {
      const spoken = spokenOf(s);
      expect(spoken, s.id).not.toMatch(/[*≈×Ø″%°²³_#<>/\\|]|\d/);
      expect(spoken, s.id).not.toMatch(/\b(kW|kWh|rpm|Hz|mm|cm|km|tr\/min|etc)\b/);
      expect(spoken, s.id).not.toMatch(/['"]/);
      // a cue stands between two spaces (or at an edge), so that taking it out never glues two words together
      expect(s.text, s.id).not.toMatch(/ {2}|\n|^\s|\s$|\S\[\[|\]\]\S/);
      expect(spoken, s.id).not.toMatch(/\.\.(?!\.)|\.{3}/);
    }
  });

  it('keeps the sentences short enough for the subtitles', () => {
    let over120 = 0;
    for (const s of script.segments) {
      for (const sentence of spokenOf(s)
        .replace(/\s+/g, ' ')
        .trim()
        .split(/(?<=[.!?…])\s+/)) {
        expect(sentence.length, `${s.id}: ${sentence.slice(0, 60)}`).toBeLessThanOrEqual(140);
        if (sentence.length > 120) over120++;
      }
    }
    expect(over120).toBeLessThanOrEqual(8);
  });

  it('speaks to the listener the way the series does: "vous", "on", never "tu"', () => {
    if (lang !== 'fr') return;
    const tu = /(?<!\p{L})(tu|ton|ta|tes|toi)(?!\p{L})/iu;
    for (const s of script.segments) expect(spokenOf(s), s.id).not.toMatch(tu);
  });

  it('stays within the budget', () => {
    const total = script.segments.reduce((n, s) => n + spokenOf(s).length, 0);
    expect(total).toBeLessThanOrEqual(BUDGET);
  });
});

describe.each(Object.keys(manifests))('narration audio %s', (lang) => {
  const { manifest, problems } = readManifest(manifests[lang]);

  it('is a usable manifest that agrees with the lab', () => {
    expect(problems).toEqual([]);
    expect(manifest).not.toBeNull();
    expect(validateManifest(manifest!, { scenes: sceneIds, parts: partIds })).toEqual([]);
  });

  it('has an audio file for every segment and none without a segment', () => {
    const files = audioFiles.filter((f) => f.includes(`/audio/${lang}/`)).map((f) => f.split('/').pop());
    expect(files.sort()).toEqual(manifest!.segments.map((s) => s.file).sort());
  });

  it('is the audio of the script of the same language', () => {
    const script = scripts[lang];
    if (!script) return;
    expect(manifest!.segments.map((s) => s.id).sort()).toEqual(script.segments.map((s) => s.id).sort());
  });
});

describe('the private transcripts', () => {
  // docs/transcript-*.md are git-ignored: when they are present on this machine, no run of seven words of the French narration script
  // may be copied from them (the captions only serve to check facts). Absent in CI: skipped. Same rule as the interface strings.
  const transcripts = Object.values(
    import.meta.glob('../docs/transcript-*.md', { query: '?raw', import: 'default', eager: true }) as Record<
      string,
      string
    >,
  );
  const words = (t: string): string[] =>
    t
      .toLowerCase()
      .replace(/\*\*/g, '')
      .replace(/’/g, "'")
      .replace(/[^a-zàâäçéèêëîïôöùûüÿœ0-9' ]+/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  const grams = (w: string[], n: number): string[] =>
    Array.from({ length: Math.max(0, w.length - n + 1) }, (_, i) => w.slice(i, i + n).join(' '));

  it.skipIf(transcripts.length === 0)('copies no seven-word run of the video captions', () => {
    const source = new Set(
      transcripts.flatMap((t) => grams(words(t.replace(/^\d{1,2}(:\d\d){1,2}\s/gm, '').replace(/\n/g, ' ')), 7)),
    );
    const copied = Object.entries(scripts)
      .filter(([lang]) => lang === 'fr')
      .flatMap(([lang, script]) =>
        script.segments.flatMap((s) =>
          grams(words(spokenOf(s)), 7)
            .filter((g) => source.has(g))
            .map((g) => `${lang}/${s.id}: "${g}"`),
        ),
      );
    expect(copied).toEqual([]);
  });
});

describe('narration scripts agree between languages', () => {
  const cues = (text: string) => [...text.matchAll(CUE)].map((m) => m[0]);

  it.skipIf(!scripts.fr || !scripts.en)('have the same segments and the same cues in the same order', () => {
    const [fr, en] = [scripts.fr!, scripts.en!];
    expect(en.segments.map((s) => [s.id, s.scope, s.scene])).toEqual(fr.segments.map((s) => [s.id, s.scope, s.scene]));
    for (const s of fr.segments) expect(cues(en.segments.find((x) => x.id === s.id)!.text), s.id).toEqual(cues(s.text));
  });

  it.skipIf(!scripts.fr || !scripts.en)(
    'put the cues at the same place in the sentence (within a quarter of the segment)',
    () => {
      const [fr, en] = [scripts.fr!, scripts.en!];
      for (const s of fr.segments) {
        const t = en.segments.find((x) => x.id === s.id)!;
        const share = (text: string) => {
          let removed = 0;
          const total = spokenOf({ ...s, text }).length || 1;
          return [...text.matchAll(CUE)].map((m) => {
            const at = m.index - removed;
            removed += m[0].length;
            return at / total;
          });
        };
        const [a, b] = [share(s.text), share(t.text)];
        a.forEach((x, i) => expect(Math.abs(x - b[i]!), `${s.id}: cue ${i}`).toBeLessThanOrEqual(0.25));
      }
    },
  );
});
