import { Chart, registerables } from "chart.js";
import type { Graph, Incident } from "../types.ts";
import { COHORTS, COHORT_COLORS, COHORT_TITLES, cohortsByNode, defaultFilters, tooltipFor, type DashboardFilters } from "../core/analytics.ts";
import { renderDashboard } from "./dashboard-render.ts";

Chart.register(...registerables);

let chart: Chart | null = null;

interface TooltipContext {
  readonly tooltip?: {
    readonly opacity: number;
    readonly caretX: number;
    readonly caretY: number;
    readonly dataPoints: readonly { readonly dataIndex: number }[];
  };
}

/** Экран «Дашборд когорт»: стековые столбцы по узлам, внешний тултип, фильтры и список заявок. */
export const mountDashboard = (root: HTMLElement, graph: Graph, incidents: readonly Incident[]): void => {
  let filters = defaultFilters();

  const paint = (): void => {
    if (chart) {
      chart.destroy();
      chart = null;
    }
    root.innerHTML = renderDashboard(graph, incidents, filters);
    const canvas = root.querySelector("#chart") as HTMLCanvasElement | null;
    if (!canvas) return;
    const buckets = cohortsByNode(graph, incidents);
    chart = new Chart(canvas, {
      type: "bar",
      data: {
        labels: buckets.map((bucket) => bucket.nodeId),
        datasets: COHORTS.map((cohort) => ({
          label: COHORT_TITLES[cohort],
          data: buckets.map((bucket) => bucket.byCohort[cohort]),
          backgroundColor: COHORT_COLORS[cohort],
          stack: "cohorts",
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          x: { stacked: true, ticks: { color: "#9aa4b2", font: { size: 10 } }, grid: { display: false } },
          y: { stacked: true, beginAtZero: true, ticks: { color: "#9aa4b2", precision: 0 }, grid: { color: "#2b3440" } },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: false,
            external: (context: TooltipContext) => {
              const element = root.querySelector("#tt") as HTMLElement | null;
              const tip = context.tooltip;
              if (!element) return;
              if (!tip || tip.opacity === 0) {
                element.classList.remove("on");
                return;
              }
              const bucket = buckets[tip.dataPoints[0]?.dataIndex ?? 0];
              element.textContent = bucket ? tooltipFor(bucket) : "";
              element.style.left = tip.caretX + 12 + "px";
              element.style.top = Math.max(0, tip.caretY - 14) + "px";
              element.classList.add("on");
            },
          },
        },
        onClick: (_event: unknown, elements: readonly { index: number }[]) => {
          const index = elements[0]?.index;
          if (index === undefined) return;
          const nodeId = buckets[index]?.nodeId ?? "";
          filters = { ...filters, nodeId: filters.nodeId === nodeId ? "" : nodeId };
          paint();
        },
      },
    });
  };

  const showTooltip = (nodeId: string): void => {
    const element = root.querySelector("#tt") as HTMLElement | null;
    const bucket = cohortsByNode(graph, incidents).find((item) => item.nodeId === nodeId);
    if (!element || !bucket) return;
    element.textContent = tooltipFor(bucket);
    element.classList.add("on");
  };

  root.addEventListener("change", (event) => {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    if (target.dataset.f === "role") {
      filters = { ...filters, role: target.value as DashboardFilters["role"] };
      paint();
    }
    if (target.dataset.cohort) {
      filters = { ...filters, cohort: target.dataset.cohort as DashboardFilters["cohort"] };
      paint();
    }
  });

  root.addEventListener("mouseover", (event) => {
    const cell = (event.target as HTMLElement | null)?.closest("[data-node]") as HTMLElement | null;
    if (cell?.dataset.node) showTooltip(cell.dataset.node);
  });

  root.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    const cell = target?.closest("[data-node]") as HTMLElement | null;
    if (cell?.dataset.node) {
      filters = { ...filters, nodeId: filters.nodeId === cell.dataset.node ? "" : cell.dataset.node };
      paint();
      return;
    }
    if (target?.closest('[data-action="reset"]')) {
      filters = defaultFilters();
      paint();
    }
  });

  paint();
};
