import { latLonToPixel } from '../src/maps/projection';

describe('latLonToPixel', () => {
  const center = { lat: 43.122, lon: 6.066 };
  const W = 1280;
  const H = 720;

  it('projects the home base to the image center at any zoom', () => {
    for (const z of [14, 15, 16, 17, 18]) {
      const out = latLonToPixel(center, center, z, W, H);
      expect(out.x).toBeCloseTo(W / 2, 5);
      expect(out.y).toBeCloseTo(H / 2, 5);
      expect(out.visible).toBe(true);
    }
  });

  it('moves up (smaller y) when latitude increases', () => {
    const above = { lat: center.lat + 0.001, lon: center.lon };
    const out = latLonToPixel(above, center, 17, W, H);
    expect(out.y).toBeLessThan(H / 2);
  });

  it('marks far points as not visible', () => {
    const far = { lat: center.lat + 5, lon: center.lon + 5 };
    const out = latLonToPixel(far, center, 17, W, H);
    expect(out.visible).toBe(false);
  });
});
