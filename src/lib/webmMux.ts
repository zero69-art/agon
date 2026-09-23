/**
 * Minimal WebM (EBML) muxer for a single silent video track (VP8 / VP9).
 * Produced by WebCodecs VideoEncoder for Agon's offline export path.
 */

function vInt(value: number): Uint8Array {
  if (value < 0x7f) return new Uint8Array([value | 0x80]);
  if (value < 0x3fff) return new Uint8Array([(value >> 8) | 0x40, value & 0xff]);
  if (value < 0x1fffff) return new Uint8Array([(value >> 16) | 0x20, (value >> 8) & 0xff, value & 0xff]);
  return new Uint8Array([(value >> 24) | 0x10, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]);
}

function u8(...parts: (number | Uint8Array)[]): Uint8Array {
  const arrays = parts.map((p) => (typeof p === 'number' ? new Uint8Array([p]) : p));
  const len = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const a of arrays) {
    out.set(a, o);
    o += a.length;
  }
  return out;
}

function ebml(id: number[], data: Uint8Array): Uint8Array {
  return u8(...id, vInt(data.length), data);
}

function u16be(n: number) {
  return new Uint8Array([(n >> 8) & 0xff, n & 0xff]);
}
function u32be(n: number) {
  return new Uint8Array([(n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]);
}
function float64be(n: number) {
  const b = new ArrayBuffer(8);
  new DataView(b).setFloat64(0, n, false);
  return new Uint8Array(b);
}

export type WebmCodecId = 'V_VP8' | 'V_VP9';

export class SimpleWebmMuxer {
  private chunks: { data: Uint8Array; tsMs: number; key: boolean }[] = [];
  constructor(
    private width: number,
    private height: number,
    private codec: WebmCodecId,
    private frameRate: number,
  ) {}

  addChunk(data: Uint8Array, timestampUs: number, keyFrame: boolean) {
    this.chunks.push({ data, tsMs: timestampUs / 1000, key: keyFrame });
  }

  finalize(): Blob {
    const duration = this.chunks.length ? this.chunks[this.chunks.length - 1].tsMs + 1000 / this.frameRate : 0;

    const header = ebml(
      [0x1a, 0x45, 0xdf, 0xa3],
      u8(
        ebml([0x42, 0x86], new Uint8Array([1])),
        ebml([0x42, 0xf7], new Uint8Array([1])),
        ebml([0x42, 0xf2], new Uint8Array([4])),
        ebml([0x42, 0xf3], new Uint8Array([8])),
        ebml([0x42, 0x82], new TextEncoder().encode('webm')),
        ebml([0x42, 0x87], new Uint8Array([2])),
        ebml([0x42, 0x85], new Uint8Array([2])),
      ),
    );

    const video = ebml(
      [0xe0],
      u8(
        ebml([0xb0], u16be(this.width)),
        ebml([0xba], u16be(this.height)),
      ),
    );

    const trackEntry = ebml(
      [0xae],
      u8(
        ebml([0xd7], new Uint8Array([1])),
        ebml([0x73, 0xc5], u32be(1)),
        ebml([0x83], new Uint8Array([1])),
        ebml([0x86], new TextEncoder().encode(this.codec)),
        video,
      ),
    );

    const tracks = ebml([0x16, 0x54, 0xae, 0x6b], trackEntry);

    const info = ebml(
      [0x15, 0x49, 0xa9, 0x66],
      u8(
        ebml([0x2a, 0xd7, 0xb1], u32be(1_000_000)),
        ebml([0x44, 0x89], float64be(duration)),
        ebml([0x4d, 0x80], new TextEncoder().encode('Agon')),
        ebml([0x57, 0x41], new TextEncoder().encode('Agon')),
      ),
    );

    const clusterParts: Uint8Array[] = [];
    const clusterTimecode = 0;
    clusterParts.push(ebml([0xe7], u8(clusterTimecode)));

    for (const c of this.chunks) {
      const tc = Math.max(0, Math.min(0x7fff, Math.round(c.tsMs - clusterTimecode)));
      const flags = c.key ? 0x80 : 0x00;
      const blockPayload = u8(0x81, (tc >> 8) & 0xff, tc & 0xff, flags, c.data);
      clusterParts.push(ebml([0xa3], blockPayload));
    }

    const cluster = ebml([0x1f, 0x43, 0xb6, 0x75], u8(...clusterParts));
    const segment = ebml([0x18, 0x53, 0x80, 0x67], u8(info, tracks, cluster));
    const file = u8(header, segment);
    return new Blob([file], { type: 'video/webm' });
  }
}
