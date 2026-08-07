import { useOrbStore } from "@/stores/orb-store";
import { useUiStore } from "@/stores/ui-store";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Demo-only sequence that exercises every orb state and opens Intelligence Mode,
 * standing in for the real voice → intent → orchestration pipeline (Phase 4/5).
 * Explicitly labeled "Demo" wherever it's triggered — see spec §42 on not faking
 * production audio-reactivity.
 */
export async function runGlobalBriefDemo() {
  const { setVoiceStatus, setAudioAmplitude, forceOrbState } = useOrbStore.getState();
  const { setMode } = useUiStore.getState();

  setVoiceStatus("listening");
  await wait(600);

  setMode("intelligence");
  setVoiceStatus("thinking");
  await wait(700);

  forceOrbState("searching");
  await wait(900);

  forceOrbState("executing");
  await wait(900);

  setVoiceStatus("speaking");
  const speakingStart = Date.now();
  const speakingDuration = 2600;
  await new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - speakingStart;
      const amplitude = 0.35 + Math.abs(Math.sin(elapsed / 220)) * 0.5;
      setAudioAmplitude(amplitude);
      if (elapsed >= speakingDuration) {
        clearInterval(interval);
        resolve();
      }
    }, 60);
  });
  setAudioAmplitude(0);

  forceOrbState("success");
  await wait(700);

  setVoiceStatus("ready");
}
