import { esc } from "./components.ts";

/** Кольцо фаз SLA (вариант A): SVG строкой, геометрия в единицах viewBox, цвета — классами на токенах. */
export interface RingSegment {
  readonly id: string;
  readonly title: string;
  readonly value: number;
}

export interface RingShare extends RingSegment {
  readonly share: number;
}

const RADIUS = 58;
const CENTER = 74;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Доли от суммы. При нулевой сумме все доли нулевые: выдуманных процентов не бывает. */
export const ringShares = (segments: readonly RingSegment[]): readonly RingShare[] => {
  const total = segments.reduce((sum, item) => sum + Math.max(0, item.value), 0);
  return segments.map((item) => ({
    id: item.id,
    title: item.title,
    value: Math.max(0, item.value),
    share: total === 0 ? 0 : Math.round((Math.max(0, item.value) / total) * 100),
  }));
};

/** Кольцо: сегменты с нулём не рисуются, центр показывает итог и подпись. */
export const renderRing = (input: {
  readonly segments: readonly RingSegment[];
  readonly centerValue: string;
  readonly centerLabel: string;
}): string => {
  const shares = ringShares(input.segments);
  const total = shares.reduce((sum, item) => sum + item.value, 0);
  let offset = 0;
  const arcs = shares
    .filter((item) => item.value > 0 && total > 0)
    .map((item) => {
      const length = (item.value / total) * CIRCUMFERENCE;
      const arc =
        '<circle class="ring-seg ring-seg-' + item.id + '" cx="' + CENTER + '" cy="' + CENTER + '" r="' + RADIUS +
        '" fill="none" stroke-width="16" stroke-dasharray="' + length.toFixed(2) + " " + (CIRCUMFERENCE - length).toFixed(2) +
        '" stroke-dashoffset="' + (-offset).toFixed(2) + '" transform="rotate(-90 ' + CENTER + " " + CENTER + ')">' +
        "<title>" + esc(item.title + ": " + item.value) + "</title></circle>";
      offset += length;
      return arc;
    })
    .join("");
  return (
    '<svg class="ring" data-sla-ring viewBox="0 0 148 148" width="148" height="148" role="img" aria-label="' +
    esc("Фазы SLA: " + input.centerValue + " " + input.centerLabel) + '">' +
    '<circle class="ring-track" cx="74" cy="74" r="58" fill="none" stroke-width="16"></circle>' + arcs +
    '<text x="74" y="72" text-anchor="middle" class="ring-value" font-size="20">' + esc(input.centerValue) + "</text>" +
    '<text x="74" y="90" text-anchor="middle" class="ring-sub" font-size="12">' + esc(input.centerLabel) + "</text></svg>"
  );
};
