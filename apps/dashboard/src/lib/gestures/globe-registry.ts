/** The subset of three-stdlib's OrbitControls we actually use — avoids depending
 *  on three-stdlib's types directly (it's a transitive dep of drei, not ours). */
interface ResettableControls {
  reset: () => void;
}

/**
 * Globe.tsx registers its live OrbitControls instance here while mounted, so
 * gesture-controller.ts (and anything else) can drive it imperatively — e.g. an
 * "open palm" gesture resetting the view — without prop-drilling a ref through
 * the whole component tree.
 */
let controls: ResettableControls | null = null;

export function registerGlobeControls(instance: ResettableControls | null) {
  controls = instance;
}

export function resetGlobeView() {
  controls?.reset();
}

export function getGlobeCanvas(): HTMLCanvasElement | null {
  return document.querySelector('[data-gesture-target="globe"] canvas');
}
