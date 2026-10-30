import { describe, expect, it } from 'vitest';
import { WORLDS, partIds } from './part-ids';
import { lab } from './lab';

// The lead's integration checks: the pieces written by different roles must agree with each other.

const sceneIds = lab.scenes.map((s) => s.id);
const module = (id: string) => lab.scenes.find((s) => s.id === id)!.module;

describe('lab definition', () => {
  it('declares the two worlds, the site first', () => {
    expect(sceneIds).toEqual(['site', 'screw']);
    expect([...sceneIds].sort()).toEqual([...WORLDS].sort());
    expect(lab.defaultScene).toBe('site');
  });

  it.each(WORLDS)('world %s registers exactly the frozen and catalogued parts', (id) => {
    const registered = module(id).registry.ids().sort();
    expect(registered).toEqual(partIds(id).sort());
    expect(
      lab.parts
        .filter((p) => p.scene === id)
        .map((p) => p.id)
        .sort(),
    ).toEqual(partIds(id).sort());
  });

  it.each(WORLDS)('world %s has hotspots that point at registered, catalogued parts and existing worlds', (id) => {
    const mod = module(id);
    expect(mod.hotspots.length).toBeGreaterThan(0);
    for (const hs of mod.hotspots) {
      expect(mod.registry.get(hs.partId), `hotspot of ${hs.partId}`).toBeDefined();
      expect(
        lab.parts.some((p) => p.id === hs.partId && p.scene === id),
        `sheet of ${hs.partId}`,
      ).toBe(true);
      if (hs.goto) expect(sceneIds).toContain(hs.goto);
    }
  });

  it('labels a hotspot with the name of its part sheet, in both languages', () => {
    const different: string[] = [];
    for (const id of WORLDS) {
      for (const hs of module(id).hotspots) {
        const part = lab.parts.find((p) => p.id === hs.partId)!;
        if (hs.label.fr !== part.name.fr || hs.label.en !== part.name.en)
          different.push(
            `${hs.partId}: "${hs.label.fr}" / "${hs.label.en}" instead of "${part.name.fr}" / "${part.name.en}"`,
          );
      }
    }
    expect(different).toEqual([]);
  });

  it('plays the guides in the worlds that hold their parts', () => {
    for (const guide of [lab.guides?.assembly, lab.guides?.install]) {
      expect(guide).toBeDefined();
      for (const step of guide!.steps) {
        const world = step.scene ?? guide!.scene;
        expect(sceneIds, `${step.id}: world ${world}`).toContain(world);
        for (const id of step.parts) expect(module(world).registry.get(id), `${step.id} → ${id}`).toBeDefined();
      }
    }
  });

  it('links only existing parts to existing worlds, and overview shortcuts to existing worlds', () => {
    for (const [partId, link] of Object.entries(lab.partLinks ?? {})) {
      expect(
        lab.parts.some((p) => p.id === partId),
        partId,
      ).toBe(true);
      expect(sceneIds).toContain(link.scene);
    }
    for (const scene of lab.scenes) {
      for (const action of scene.overview?.actions ?? []) expect(sceneIds).toContain(action.scene);
    }
  });

  it('links its part sheets into the main video, and hides the modes that have no content yet', () => {
    expect(lab.video?.id).toBe('hM4cDkSSsrQ');
    expect(lab.lessons).toBeUndefined();
    expect(lab.plans).toBeUndefined();
  });
});
