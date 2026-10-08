const $ = id => document.getElementById(id);
const formatter = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });
const precise = value => formatter.format(value);
const fmtS = value => precise(value) + " s";
const fmtPercent = value => precise(value * 100) + " %";
const fmtCost = value => "$" + new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 2, maximumFractionDigits: 4,
}).format(value);
const POLICY = [
  { id: "round_robin", label: "Round Robin", short: "Round Robin", className: "rr" },
  { id: "least_loaded", label: "Least Loaded", short: "Least Loaded", className: "ll" },
  { id: "ecodispatch", label: "EcoDispatch", short: "EcoDispatch", className: "eco" },
];
const PRESETS = {
  normal: { count: 1000, rate: 0.22, largeShare: 20, lambdaFuture: 0.6 },
  overload: { count: 2000, rate: 0.45, largeShare: 20, lambdaFuture: 0.6 },
  large: { count: 1000, rate: 0.22, largeShare: 60, lambdaFuture: 0.6 },
};

let activeWorker = null;
let latest = null;
let nextRunId = 0;

function element(tag, className, textValue) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (textValue !== undefined) node.textContent = textValue;
  return node;
}
function svgEl(tag, attributes = {}, text) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attributes)) el.setAttribute(key, String(value));
  if (text !== undefined) el.textContent = text;
  return el;
}

function formConfig() {
  return {
    count: Number($("count").value),
    rate: Number($("rate").value),
    largeShare: Number($("largeShare").value) / 100,
    lambdaFuture: Number($("lambdaFuture").value),
    seeds: Number($("seeds").value),
    seed: Number($("seed").value),
    costWeight: 0,
  };
}
function updateLabels() {
  $("count-out").value = new Intl.NumberFormat("es-ES").format(Number($("count").value));
  $("rate-out").value = Number($("rate").value).toFixed(2).replace(".", ",") + " req/s";
  $("largeShare-out").value = $("largeShare").value + " %";
  $("lambdaFuture-out").value = "λ = " + precise(Number($("lambdaFuture").value));
}

function setPreset(name) {
  const preset = PRESETS[name];
  if (!preset) return;
  for (const [key, value] of Object.entries(preset)) $(key).value = String(value);
  document.querySelectorAll(".preset-button").forEach(button => {
    const selected = button.dataset.preset === name;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  updateLabels();
}
function clearPresets() {
  document.querySelectorAll(".preset-button").forEach(button => {
    button.classList.remove("selected");
    button.setAttribute("aria-pressed", "false");
  });
}
function status(message, processing = false) {
  $("run-status").replaceChildren();
  const dot = element("i", "status-indicator");
  dot.style.background = processing ? "#e3c07d" : "#76e4bd";
  $("run-status").append(dot, document.createTextNode(" " + message));
  $("run-button").disabled = processing;
  $("run-button").textContent = processing ? "◌ Simulando…" : "▶ Ejecutar experimento";
}

function runSimulation() {
  if (activeWorker) activeWorker.terminate();
  const current = ++nextRunId;
  let config;
  try {
    config = formConfig();
    if (!Number.isInteger(config.seed) || config.seed < 0 || config.seed > 1000000) {
      throw new Error("La semilla debe ser un entero entre 0 y 1.000.000");
    }
  } catch (error) {
    status("Error: " + error.message);
    return;
  }
  status("Calculando escenarios…", true);
  const worker = new Worker(new URL("./worker.mjs", import.meta.url), { type: "module" });
  activeWorker = worker;
  worker.onmessage = event => {
    if (current !== nextRunId) return;
    worker.terminate();
    activeWorker = null;
    if (!event.data?.ok) {
      status("Error: " + (event.data?.error || "sin detalles"));
      return;
    }
    latest = event.data.result;
    $("export-button").disabled = false;
    try {
      render(latest);
      status("Simulación completada · " + latest.config.seeds + " semillas");
    } catch (error) {
      status("Error al mostrar los resultados");
      console.error(error);
    }
  };
  worker.onerror = error => {
    if (current !== nextRunId) return;
    worker.terminate();
    activeWorker = null;
    status("Error al ejecutar la simulación");
    console.error(error);
  };
  worker.postMessage(config);
}

function renderCards(report) {
  const container = $("policy-cards");
  container.replaceChildren();
  for (const [index, policy] of POLICY.entries()) {
    const metric = report.summary[policy.id];
    const card = element("article", "policy-card" + (policy.id === "ecodispatch" ? " accent" : ""));
    card.append(
      element("span", "policy-name", "0" + (index + 1) + " / " + policy.label.toUpperCase()),
      element("strong", "policy-number", fmtPercent(metric.miss)),
      element("span", "policy-label", "Solicitudes fuera de SLA"),
      element("div", "policy-meta", "P95 " + fmtS(metric.p95) + "  ·  " + fmtCost(metric.cost))
    );
    container.append(card);
  }
}

function renderBars(id, report, field, format) {
  const chart = $(id);
  chart.className = "bar-chart";
  chart.replaceChildren();
  const max = Math.max(...POLICY.map(p => report.summary[p.id][field]), 0.000001);
  for (const policy of POLICY) {
    const value = report.summary[policy.id][field];
    const row = element("div", "chart-bar-row");
    const label = element("div", "chart-bar-label");
    label.append(element("span", null, policy.short), element("strong", null, format(value)));
    const track = element("div", "chart-track");
    const fill = element("div", "chart-fill " + policy.className);
    fill.style.width = (100 * value / max).toFixed(3) + "%";
    track.append(fill);
    row.append(label, track);
    chart.append(row);
  }
}

function renderInsight(report) {
  const baseline = report.summary.least_loaded;
  const eco = report.summary.ecodispatch;
  const deltaSla = 100 * (eco.miss - baseline.miss);
  const deltaP95 = baseline.p95 > 0 ? 100 * (eco.p95 / baseline.p95 - 1) : 0;
  const change = deltaSla < -0.00001 ? "menos" : deltaSla > 0.00001 ? "más" : "prácticamente los mismos";
  let first;
  if (change === "prácticamente los mismos") {
    first = "EcoDispatch presenta prácticamente el mismo porcentaje de incumplimientos SLA que Least Loaded";
  } else {
    first = "EcoDispatch registra " + precise(Math.abs(deltaSla)) +
      " puntos porcentuales " + change + " de incumplimientos SLA que Least Loaded";
  }
  let p95;
  if (Math.abs(deltaP95) < 0.01) p95 = "y una latencia P95 prácticamente igual.";
  else p95 = "y una latencia P95 " + precise(Math.abs(deltaP95)) +
    " % " + (deltaP95 < 0 ? "menor" : "mayor") + ".";
  $("insight-text").textContent =
    "Con esta carga sintética, " + first + " " + p95 +
    " Es una observación exploratoria; no demuestra superioridad en sistemas reales.";
}

function renderGpu(report) {
  const target = $("gpu-chart");
  target.replaceChildren();
  for (const worker of report.cluster) {
    const value = Math.max(0, Math.min(1, report.summary.ecodispatch.workerUtilization[worker.id]));
    const row = element("div", "gpu-row");
    const track = element("div", "gpu-track");
    const fill = element("div", "gpu-fill" + (worker.models.includes("large") ? "" : " small-only"));
    fill.style.width = (value * 100).toFixed(2) + "%";
    track.append(fill);
    row.append(element("strong", null, worker.id), track, element("span", null, fmtPercent(value)));
    target.append(row);
  }
}

function renderTable(report) {
  const tbody = $("comparison-rows");
  tbody.replaceChildren();
  for (const policy of POLICY) {
    const m = report.summary[policy.id];
    const row = element("tr", policy.id === "ecodispatch" ? "eco-row" : "");
    for (const value of [
      policy.label, fmtS(m.mean), fmtS(m.p95), fmtPercent(m.miss),
      fmtS(m.byModel.large.p95), fmtS(m.byModel.small.p95), fmtCost(m.cost),
    ]) row.append(element("td", null, value));
    tbody.append(row);
  }
}

function renderSensitivity(report) {
  const graph = $("lambda-chart");
  graph.replaceChildren();
  const data = report.sensitivity;
  const left = 56, right = 492, top = 28, bottom = 194;
  const x0 = data[0].lambda, x1 = data[data.length - 1].lambda;
  const values = [...data.map(point => point.p95), report.summary.least_loaded.p95];
  const min = Math.min(...values), max = Math.max(...values);
  const pad = Math.max(1, (max - min) * 0.16);
  const y0 = Math.max(0, min - pad), y1 = max + pad;
  const X = val => left + (val - x0) / Math.max(0.0001, x1 - x0) * (right - left);
  const Y = val => bottom - (val - y0) / Math.max(0.0001, y1 - y0) * (bottom - top);
  for (let i = 0; i <= 4; i++) {
    const value = y0 + (y1 - y0) * i / 4;
    const y = Y(value);
    graph.append(
      svgEl("line", { x1: left, y1: y, x2: right, y2: y, stroke: "#2a4049", "stroke-width": 1 }),
      svgEl("text", { x: left - 11, y: y + 4, fill: "#8ca6ae", "font-size": 11, "text-anchor": "end" }, precise(value))
    );
  }
  const points = data.map(d => [X(d.lambda), Y(d.p95)]);
  const path = points.map(([x,y], i) => (i ? "L " : "M ") + x + " " + y).join(" ");
  const area = path + " L " + X(x1) + " " + bottom + " L " + X(x0) + " " + bottom + " Z";
  graph.append(
    svgEl("path", { d: area, fill: "#76e4bd", "fill-opacity": 0.10 }),
    svgEl("line", { x1: left, y1: Y(report.summary.least_loaded.p95), x2: right, y2: Y(report.summary.least_loaded.p95), stroke: "#e3c07d", "stroke-dasharray": "6 5", "stroke-width": 1.5 }),
    svgEl("path", { d: path, stroke: "#76e4bd", "stroke-width": 3, fill: "none", "stroke-linejoin": "round" })
  );
  for (const point of data) {
    const selected = Math.abs(point.lambda - report.config.lambdaFuture) < 0.0001;
    const circle = svgEl("circle", {
      cx: X(point.lambda), cy: Y(point.p95), r: selected ? 7 : 4.3,
      stroke: "#09251d", "stroke-width": 2, fill: selected ? "#f5d39a" : "#76e4bd",
    });
    circle.append(svgEl("title", {}, "λ=" + point.lambda + " · P95 " + fmtS(point.p95)));
    graph.append(circle, svgEl("text", {
      x: X(point.lambda), y: bottom + 23, fill: selected ? "#e3c07d" : "#8ca6ae",
      "font-size": 11, "text-anchor": "middle",
    }, "λ" + point.lambda));
  }
  graph.append(
    svgEl("line", { x1: 305, y1: 11, x2: 325, y2: 11, stroke: "#e3c07d", "stroke-width": 1.6, "stroke-dasharray": "5 4" }),
    svgEl("text", { x: 332, y: 15, fill: "#9fb5b5", "font-size": 10 }, "P95 Least Loaded")
  );
}

function render(report) {
  renderCards(report);
  renderBars("latency-chart", report, "p95", fmtS);
  renderBars("sla-chart", report, "miss", fmtPercent);
  renderInsight(report);
  renderGpu(report);
  renderTable(report);
  renderSensitivity(report);
}

function exportJson() {
  if (!latest) return;
  const blob = new Blob([JSON.stringify(latest, null, 2) + "\n"], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "ecodispatch-compute-lab-seed-" + latest.config.seed + ".json";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

$("simulation-form").addEventListener("submit", event => {
  event.preventDefault();
  runSimulation();
});
$("export-button").addEventListener("click", exportJson);
$("reset-button").addEventListener("click", () => {
  $("seeds").value = "5";
  $("seed").value = "7";
  setPreset("normal");
  runSimulation();
});
for (const button of document.querySelectorAll(".preset-button")) {
  button.addEventListener("click", () => { setPreset(button.dataset.preset); runSimulation(); });
}
for (const input of document.querySelectorAll('#simulation-form input[type="range"]')) {
  input.addEventListener("input", () => {
    updateLabels();
    clearPresets();
  });
}
updateLabels();
runSimulation();
