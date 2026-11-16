/**
 * Детерминированный генератор случайных чисел.
 * Чистые функции от seed + rand — нужны, чтобы тесты повторяли один и тот же маршрут.
 */

/** mulberry32: маленький быстрый PRNG, состояние живёт в замыкании. */
export const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Случайное целое в диапазоне [min, max]. */
export const randInt = (min: number, max: number, rand: () => number): number =>
  min + Math.floor(rand() * (max - min + 1));

/** Случайный элемент непустого массива. */
export const pick = <T>(items: readonly T[], rand: () => number): T => {
  if (items.length === 0) throw new Error("pick: пустой список");
  return items[Math.floor(rand() * items.length)] as T;
};

/** Взвешенный выбор: чем больше вес, тем чаще выпадает вариант. */
export const pickWeighted = <T>(
  items: readonly T[],
  weightOf: (item: T) => number,
  rand: () => number,
): T => {
  const total = items.reduce((sum, item) => sum + Math.max(0, weightOf(item)), 0);
  if (total <= 0) return pick(items, rand);
  let threshold = rand() * total;
  for (const item of items) {
    threshold -= Math.max(0, weightOf(item));
    if (threshold <= 0) return item;
  }
  return items[items.length - 1] as T;
};

/** Перемешивание копии массива (Фишер—Йетс). */
export const shuffle = <T>(items: readonly T[], rand: () => number): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const a = out[i] as T;
    const b = out[j] as T;
    out[i] = b;
    out[j] = a;
  }
  return out;
};
