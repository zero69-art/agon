/** Feature detection for offline WebCodecs export (worker + OffscreenCanvas + VideoEncoder). */
export function supportsWebCodecsExport(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (
      typeof Worker !== 'undefined' &&
      typeof OffscreenCanvas !== 'undefined' &&
      typeof VideoEncoder !== 'undefined' &&
      typeof VideoFrame !== 'undefined' &&
      typeof VideoEncoder.isConfigSupported === 'function'
    );
  } catch {
    return false;
  }
}

export async function pickVideoCodec(
  width: number,
  height: number,
  bitrate: number,
  framerate: number,
): Promise<{ codec: string; webmCodecId: string } | null> {
  if (typeof VideoEncoder === 'undefined') return null;
  const candidates: { codec: string; webmCodecId: string }[] = [
    { codec: 'vp09.00.10.08', webmCodecId: 'V_VP9' },
    { codec: 'vp8', webmCodecId: 'V_VP8' },
  ];
  for (const c of candidates) {
    try {
      const { supported } = await VideoEncoder.isConfigSupported({
        codec: c.codec,
        width,
        height,
        bitrate,
        framerate,
      });
      if (supported) return c;
    } catch {
      /* try next */
    }
  }
  return null;
}
