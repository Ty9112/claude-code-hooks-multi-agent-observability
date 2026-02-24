// requestAnimationFrame counter animation composable
import { ref, onUnmounted } from 'vue';

export function useAnimatedValue(initial: number = 0, duration: number = 800) {
  const displayValue = ref(initial);
  let animationFrame: number | null = null;
  let startValue = initial;
  let targetValue = initial;
  let startTime = 0;

  function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  function animate(timestamp: number) {
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeOutCubic(progress);

    displayValue.value = Math.round(startValue + (targetValue - startValue) * eased);

    if (progress < 1) {
      animationFrame = requestAnimationFrame(animate);
    } else {
      displayValue.value = targetValue;
      animationFrame = null;
    }
  }

  function animateTo(value: number) {
    if (value === targetValue) return;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    startValue = displayValue.value;
    targetValue = value;
    startTime = performance.now();
    animationFrame = requestAnimationFrame(animate);
  }

  onUnmounted(() => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
  });

  return { displayValue, animateTo };
}
