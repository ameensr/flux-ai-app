import { describe, expect, it } from 'vitest';
import { drawReportHeroScreen } from './reportHeroScreen';

describe('boardroom TV report hero', () => {
  it('draws the report hero with the supplied live report values', () => {
    const labels: string[] = [];
    const gradient = { addColorStop: () => {} };
    const context = {
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
      fillRect: () => {},
      fillText: (value: string) => { labels.push(value); },
      measureText: (value: string) => ({ width: value.length * 20 }),
      beginPath: () => {}, roundRect: () => {}, fill: () => {}, stroke: () => {},
      arc: () => {},
    };
    const canvas = { getContext: () => context, width: 0, height: 0 } as unknown as HTMLCanvasElement;
    drawReportHeroScreen(canvas, {
      projectName: 'Atlas', reportTitle: 'Weekly Status Report',
      weekStart: '2026-11-09', weekEnd: '2026-11-15',
      supportEmails: 7, newFeatures: 4, codeFixes: 2,
      qualityScore: 92, qualityLabel: 'Excellent',
    }, true);
    expect([canvas.width, canvas.height]).toEqual([1400, 500]);
    expect(labels).toContain('ATLAS');
    expect(labels).toContain('Weekly Status Report');
    expect(labels).toContain('7');
    expect(labels).toContain('4');
    expect(labels).toContain('2');
    expect(labels).toContain('92');
    expect(labels).toContain('EXCELLENT');
  });
});
