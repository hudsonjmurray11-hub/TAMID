import { useEffect, useRef } from 'react';
import type { Tier } from '../../../shared/types';
import { useReducedMotion } from '../ui/kit';
import { JourneyRenderer, type JourneyOptions } from './renderer';

interface Props extends Partial<Omit<JourneyOptions, 'reducedMotion'>> {
  km: number;
  /** Changing this key with a tier triggers a celebration once. */
  celebrate?: { key: string; tier: Tier | null } | null;
  className?: string;
  label?: string;
}

/** React wrapper around the canvas journey. */
export function Journey({ km, celebrate, className, label, focusX = 0.5, horizon = 0.5, vanScale = 1, party = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<JourneyRenderer | null>(null);
  const reduced = useReducedMotion();
  const firstKm = useRef(km);
  const lastCelebrate = useRef<string | null>(null);

  useEffect(() => {
    const r = new JourneyRenderer(canvasRef.current!, { focusX, horizon, vanScale, party, reducedMotion: reduced });
    r.setKmInstant(firstKm.current);
    r.start();
    rendererRef.current = r;
    (window as unknown as { __journey?: JourneyRenderer }).__journey = r;
    const onVis = () => (document.hidden ? r.stop() : r.start());
    document.addEventListener('visibilitychange', onVis);
    if (document.fonts?.ready) document.fonts.ready.then(() => r.resize());
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      r.destroy();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    rendererRef.current?.setOptions({ focusX, horizon, vanScale, party, reducedMotion: reduced });
  }, [focusX, horizon, vanScale, party, reduced]);

  useEffect(() => {
    rendererRef.current?.driveTo(km);
  }, [km]);

  useEffect(() => {
    if (!celebrate || celebrate.key === lastCelebrate.current) return;
    lastCelebrate.current = celebrate.key;
    rendererRef.current?.celebrate(celebrate.tier);
  }, [celebrate]);

  return (
    <canvas
      ref={canvasRef}
      className={`scene-canvas ${className ?? ''}`}
      role="img"
      aria-label={label ?? `A blue van on the coastal road to Tel Aviv, ${km} of 300 game kilometres travelled.`}
    />
  );
}
