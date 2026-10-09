const $ = id => document.getElementById(id);
const fmt = (value, digits = 2) => new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: digits, maximumFractionDigits: digits,
}).format(value);
const percent = fraction => fmt(fraction * 100) + " %";
const points = fraction => (fraction > 0 ? "+" : "") + fmt(fraction * 100, 3) + " pp";
const seconds = time => fmt(time) + " s";
const money = value => "$" + fmt(value, 4);
const policyOrder = [
  "round_robin", "least_loaded", "lambda_0", "lambda_0.2",
  "lambda_0.6", "lambda_1", "lambda_3",
];
const lambdaPolicies = ["lambda_0.2", "lambda_0.6", "lambda_1", "lambda_3"];
let worker = null, last = null, currentRun = 0, chosen = null;

function div(className, text) {
  const node = document.createElement("div");
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function svg(tag, attrs, text) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, val] of Object.entries(attrs || {})) el.setAttribute(key, String(val));
  if (text !== undefined) el.textContent = text;
  return el;
}
function setStatus(message, working = false) {
  $("validation-status").textContent = message;
  $("status-dot").style.background = working ? "#e3c07d" : "#76e4bd";
  $("run-validation").disabled = working;
  $("run-validation").textContent = working ? "◌ Calculando…" : "▶ Ejecutar validación";
}

function start() {
  if (worker) worker.terminate();
  const run = ++currentRun;
  last = null;
  chosen = null;
  const stage = $("stage").value;
  const scenario = $("scenario").value;
  $("download-validation").disabled = true;
  setStatus("Preparando simulaciones sintéticas pareadas…", true);
  try {
    worker = new Worker(new URL("./validation-worker.mjs", import.meta.url), { type: "module" });
    worker.onmessage = event => {
      if (run !== currentRun) return;
      const message = event.data;
      if (message.type === "progress") {
        const p = message.progress;
        setStatus("Procesando " + p.scenario + " · " + p.completed + "/" + p.total + " semillas…", true);
      } else if (message.type === "result") {
        last = message.result;
        chosen = last.scenarios.find(s => s.id === "stressed")?.id || last.scenarios[0].id;
        worker.terminate();
        worker = null;
        render(last);
        $("download-validation").disabled = false;
        setStatus("Evaluación completada · " + last.label + " · datos sintéticos");
      } else if (message.type === "error") {
        worker.terminate();
        worker = null;
        setStatus("Error: " + message.error);
      }
    };
    worker.onerror = error => {
      if (run !== currentRun) return;
      console.error(error);
      worker.terminate();
      worker = null;
      setStatus("No se pudo ejecutar el motor de simulación.");
    };
    worker.postMessage({ stage, scenario: scenario === "all" ? null : scenario });
  } catch (error) {
    setStatus("Error al iniciar: " + error.message);
  }
}

function addTabs(report) {
  const host = $("scenario-tabs");
  host.replaceChildren();
  host.hidden = report.scenarios.length <= 1;
  for (const scenario of report.scenarios) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "scenario-tab" + (scenario.id === chosen ? " selected" : "");
    button.textContent = scenario.label;
    button.setAttribute("aria-pressed", String(scenario.id === chosen));
    button.addEventListener("click", () => {
      chosen = scenario.id;
      render(last);
    });
    host.append(button);
  }
}

function render(report) {
  addTabs(report);
  const selected = report.scenarios.find(s => s.id === chosen) || report.scenarios[0];
  const data = selected.comparisons["lambda_0.6"].slaMiss;
  $("key-delta").textContent = points(data.meanDelta);
  $("key-ci").textContent = "[" + points(data.ci95[0]) + "; " + points(data.ci95[1]) + "]";
  $("key-n").textContent = String(data.n);
  $("key-range").textContent = selected.firstSeed + "–" + (selected.firstSeed + selected.n - 1);
  drawBars(selected);
  drawDelta(selected);
  drawOutcomes(data);
  drawTable(selected);
  const primary = selected.id === "stressed";
  const criterion = data.meanDelta < 0 && data.ci95[1] < 0;
  const negative = data.meanDelta < 0;
  let title, explanation, tag;
  if (report.stage === "reserved" && primary) {
    title = criterion ? "Criterio cumplido en el simulador" : "No se cumple el criterio fijado";
    explanation = criterion ?
      "El intervalo pareado del cambio en SLA queda por debajo de cero para las semillas reservadas. Es evidencia interna de este escenario sintético, no de mejora en GPU reales." :
      "La diferencia y su intervalo no satisfacen la regla fijada antes del análisis. No se puede declarar ganadora la política λ=0,6.";
    tag = criterion ? "EVIDENCIA SINTÉTICA" : "NO CONFIRMADO";
  } else {
    title = negative ? "Mejora media descriptiva" :
      data.meanDelta > 0 ? "Empeoramiento medio descriptivo" : "Empate medio descriptivo";
    explanation = "Este resultado es secundario o exploratorio. La pregunta primaria está fijada para saturación y 60 semillas reservadas; no elijas λ o escenarios retroactivamente según qué tabla sea favorable.";
    tag = "EXPLORATORIO";
  }
  $("verdict-title").textContent = title;
  $("verdict-text").textContent = explanation;
  $("verdict-tag").textContent = tag;
}

function drawBars(data) {
  const host = $("validation-bars");
  host.replaceChildren();
  const max = Math.max(0.000001, ...policyOrder.map(key => data.aggregate[key].miss));
  for (const key of policyOrder) {
    const policy = data.aggregate[key];
    const row = div("vbar");
    row.append(div("", policy.label));
    const track = div("vbar-track");
    const fill = div("vbar-fill" + (key === "lambda_0.6" ? " eco" : key === "lambda_0" ? " base" : ""));
    fill.style.width = (100 * policy.miss / max).toFixed(3) + "%";
    track.append(fill);
    row.append(track, div("", percent(policy.miss)));
    row.lastElementChild.style.textAlign = "right";
    host.append(row);
  }
}

function drawOutcomes(data) {
  const host = $("outcomes");
  host.replaceChildren();
  for (const item of [
    { text: "Mejora", key: "wins", css: "win" },
    { text: "Empata", key: "ties", css: "tie" },
    { text: "Empeora", key: "losses", css: "loss" },
  ]) {
    const row = div("outcome-row");
    row.append(div("", item.text));
    const track = div("outcome-track");
    const fill = div("outcome-fill " + item.css);
    fill.style.width = (data[item.key] / data.n * 100).toFixed(2) + "%";
    track.append(fill);
    row.append(track);
    const number = document.createElement("strong");
    number.textContent = String(data[item.key]) + "/" + data.n;
    row.append(number);
    host.append(row);
  }
}

function drawTable(data) {
  const tbody = $("validation-table");
  tbody.replaceChildren();
  for (const key of policyOrder) {
    const m = data.aggregate[key];
    const row = document.createElement("tr");
    if (key === "lambda_0.6") row.className = "target";
    for (const value of [
      m.label, percent(m.miss), seconds(m.p95),
      seconds(m.byModel.large.p95), percent(m.byModel.large.miss), money(m.cost),
    ]) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    }
    tbody.append(row);
  }
}

function drawDelta(data) {
  const element = $("delta-chart");
  element.replaceChildren();
  const series = [
    { x: 0, d: { meanDelta: 0, ci95: [0, 0] } },
    ...lambdaPolicies.map(key => ({
      x: Number(key.slice(7)), d: data.comparisons[key].slaMiss,
    })),
  ];
  const margin = { left: 63, right: 490, top: 26, bottom: 197 };
  const extent = series.flatMap(p => p.d.ci95);
  const bottomVal = Math.min(...extent, 0), topVal = Math.max(...extent, 0);
  const padding = Math.max(0.001, (topVal - bottomVal) * 0.18);
  const low = bottomVal - padding, high = topVal + padding;
  const X = x => margin.left + x / 3 * (margin.right - margin.left);
  const Y = y => margin.bottom - (y - low) / (high - low) * (margin.bottom - margin.top);
  for (let i = 0; i <= 4; i++) {
    const value = low + (high - low) * i / 4;
    const y = Y(value);
    element.append(
      svg("line", { x1: margin.left, y1: y, x2: margin.right, y2: y,
        stroke: Math.abs(value) < (high - low) / 9 ? "#526a71" : "#263c45",
        "stroke-width": 1 }),
      svg("text", { x: margin.left - 10, y: y + 4, fill: "#899fa5",
        "font-size": 11, "text-anchor": "end" }, fmt(value * 100, 2))
    );
  }
  element.append(svg("line", { x1: margin.left, y1: Y(0), x2: margin.right,
    y2: Y(0), stroke: "#d9bd7e", "stroke-width": 1.7, "stroke-dasharray": "5 4" }));
  const d = series.map((p, i) => (i ? "L " : "M ") + X(p.x) + " " + Y(p.d.meanDelta)).join(" ");
  element.append(svg("path", { d, fill: "none", stroke: "#76e4bd", "stroke-width": 2.5 }));
  for (const p of series) {
    const x = X(p.x), y = Y(p.d.meanDelta);
    element.append(svg("line", { x1: x, y1: Y(p.d.ci95[0]), x2: x, y2: Y(p.d.ci95[1]),
      stroke: "#7fafa1", "stroke-width": 2 }));
    for (const ci of p.d.ci95) {
      element.append(svg("line", { x1: x - 5, y1: Y(ci), x2: x + 5,
        y2: Y(ci), stroke: "#7fafa1", "stroke-width": 2 }));
    }
    const dot = svg("circle", { cx: x, cy: y, r: p.x === 0.6 ? 6 : 4,
      fill: p.x === 0.6 ? "#e3c07d" : "#76e4bd", stroke: "#142b2d",
      "stroke-width": 2 });
    dot.append(svg("title", {}, "λ " + p.x + " · Δ SLA " + points(p.d.meanDelta)));
    element.append(dot, svg("text", { x, y: margin.bottom + 24,
      fill: "#9ab0b1", "font-size": 11, "text-anchor": "middle" }, "λ" + p.x));
  }
  element.append(svg("text", { x: 270, y: 13, fill: "#879da6",
    "font-size": 10, "text-anchor": "middle" }, "Media e IC95% · diferencia frente a λ=0"));
}

$("run-validation").addEventListener("click", start);
$("download-validation").addEventListener("click", () => {
  if (!last) return;
  const blob = new Blob([JSON.stringify(last, null, 2) + "\n"], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "compute-validation-v0.4-" + last.stage + ".json";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
