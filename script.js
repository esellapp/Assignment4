// ----------------------------------------------------------------------------- 
// CONFIG
// -----------------------------------------------------------------------------

const DATA_FILE = "data.csv";
const REGIONS_FILE = "regions.csv";

// Regions required by the assignment
const REGION_LIST = [
  "Americas",
  "East Asia & Pacific",
  "Europe & Central Asia",
  "Middle East & North Africa",
  "South Asia",
  "Sub-Saharan Africa"
];

// Metrics to plot (must match data.csv column names)
const METRICS = [
  { key: "GINI index", label: "GINI Index", higherBetter: false },
  { key: "happy planet index", label: "Happy Planet Index", higherBetter: true },
  { key: "human development index", label: "Human Development Index", higherBetter: true },
  {
    key: "sustainable economic development assessment (SEDA)",
    label: "SEDA Score",
    higherBetter: true
  },
  { key: "GDP growth\n(annual %)", label: "GDP Growth (% / yr)", higherBetter: true },
  { key: "GDP per capita in $ (PPP)", label: "GDP per Capita (PPP)", higherBetter: true },
  {
    key: "health expenditure \n% of GDP",
    label: "Health Exp. (% of GDP)",
    higherBetter: true
  },
  {
    key: "health expenditure \nper person",
    label: "Health Exp. per Person",
    higherBetter: true
  },
  { key: "infant mortality", label: "Infant Mortality", higherBetter: false },
  {
    key: "education expenditure\n% of GDP",
    label: "Education Exp. (% of GDP)",
    higherBetter: true
  },
  { key: "unemployment (%)", label: "Unemployment (%)", higherBetter: false },
  {
    key: "% of population in extreme poverty",
    label: "Extreme Poverty (%)",
    higherBetter: false
  },
  {
    key: "% of population with access to electricity",
    label: "Electricity Access (%)",
    higherBetter: true
  },
  {
    key: "political stability & absence of violence",
    label: "Political Stability",
    higherBetter: true
  },
  { key: "government effectiveness", label: "Gov. Effectiveness", higherBetter: true },
  { key: "rule of law", label: "Rule of Law", higherBetter: true },
  { key: "control of corruption", label: "Control of Corruption", higherBetter: true },
  {
    key: "overall economic freedom score",
    label: "Economic Freedom",
    higherBetter: true
  },
  { key: "CO2e emissions per capita", label: "CO₂ Emissions per Capita", higherBetter: false },
  {
    key: "share of electricity from renewables generation",
    label: "Renewables Share (%)",
    higherBetter: true
  },
  {
    key: "% of seats held by women in national parliaments",
    label: "Women in Parliament (%)",
    higherBetter: true
  },
  {
    key: "Military Spending as % of GDP",
    label: "Military Spending (% of GDP)",
    higherBetter: false
  }
];

// -----------------------------------------------------------------------------
// GLOBAL STATE + SVG SETUP
// -----------------------------------------------------------------------------

let countries = [];
let selectedRegion = "Americas";
let metricsData = [];

const svg = d3.select("#radial-chart");
const width = +svg.attr("width");
const height = +svg.attr("height");

svg.attr("viewBox", `0 0 ${width} ${height}`);

const centerX = width / 2;
const centerY = height / 2;
const innerRadius = 150;
const outerRadius = 350;

const g = svg.append("g")
  .attr("transform", `translate(${centerX}, ${centerY})`);

const tooltip = d3.select("#tooltip");

// background metric wedges
const metricArcGen = d3.arc()
  .innerRadius(innerRadius - 20)
  .outerRadius(outerRadius + 30);

// purple arc
const greyArcGen = d3.arc()
  .innerRadius(outerRadius + 38)
  .outerRadius(outerRadius + 41);

const greyArcPath = g.append("path")
  .attr("class", "grey-arc")
  .attr("d", greyArcGen({ startAngle: 0, endAngle: 2 * Math.PI }));

const strengthArcGen = d3.arc()
  .innerRadius(outerRadius + 38)
  .outerRadius(outerRadius + 41);

const strengthArcPath = g.append("path")
  .attr("class", "strength-arc");

// center summary
const summaryGroup = g.append("g").attr("class", "summary-group");
summaryGroup.append("text")
  .attr("class", "summary-text")
  .attr("y", -10);
summaryGroup.append("text")
  .attr("class", "summary-subtext")
  .attr("y", 18);

// groups
const arcsGroup = g.append("g").attr("class", "metric-arcs");
const metricsGroup = g.append("g").attr("class", "metrics");

// -----------------------------------------------------------------------------
// UTILITIES
// -----------------------------------------------------------------------------

function parseNumber(value) {
  if (value == null) return NaN;
  let s = String(value).trim();
  if (!s || s === "-" || s === "..." || s === "NaN") return NaN;
  s = s.replace(/,/g, "").replace(/%/g, "");
  const num = +s;
  return isNaN(num) ? NaN : num;
}

function mean(values) {
  const valid = values.filter(v => !isNaN(v));
  return valid.length ? d3.mean(valid) : NaN;
}


// -----------------------------------------------------------------------------
// WRAP TEXT FUNCTION FOR CENTER SUMMARY
// -----------------------------------------------------------------------------

function wrapCenterText(selection, textString, maxChars = 32) {
  selection.selectAll("tspan").remove();

  const words = textString.split(" ");
  let line = [];
  let lineNumber = 0;
  const lineHeight = 16;

  words.forEach(word => {
    const test = [...line, word].join(" ");
    if (test.length > maxChars) {
      selection.append("tspan")
        .attr("x", 0)
        .attr("dy", lineNumber === 0 ? 0 : lineHeight)
        .text(line.join(" "));
      line = [word];
      lineNumber++;
    } else {
      line.push(word);
    }
  });

  selection.append("tspan")
    .attr("x", 0)
    .attr("dy", lineNumber === 0 ? 0 : lineHeight)
    .text(line.join(" "));
}


// -----------------------------------------------------------------------------
// DATA LOADING
// -----------------------------------------------------------------------------

Promise.all([
  d3.csv(DATA_FILE),
  d3.csv(REGIONS_FILE)
])
  .then(([rawData, regionMapRaw]) => {
    const regionByIso = new Map(
      regionMapRaw.map(d => [d["ISO Country code"], d.Region])
    );

    const filtered = rawData.filter(d =>
      d.indicator !== "source" &&
      d.indicator !== "URL" &&
      d.indicator !== "notes" &&
      d.indicator !== "data year"
    );

    countries = filtered
      .map(d => ({
        ...d,
        region: regionByIso.get(d["ISO Country code"])
      }))
      .filter(d => REGION_LIST.includes(d.region));

    d3.select("#metric-count").text(METRICS.length);

    initUI();
    update(selectedRegion);
  })
  .catch(err => {
    console.error("Error loading data:", err);
  });


// -----------------------------------------------------------------------------
// UI
// -----------------------------------------------------------------------------

function initUI() {
  const select = d3.select("#region-select");

  select.selectAll("option")
    .data(REGION_LIST)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d);

  select.property("value", selectedRegion);

  select.on("change", (event) => {
    selectedRegion = event.target.value;
    update(selectedRegion);
  });
}


// -----------------------------------------------------------------------------
// MAIN UPDATE
// -----------------------------------------------------------------------------

function update(regionName) {
  // 1. Aggregate per metric per region
  const regionAveragesByMetric = METRICS.map(metric => {
    const valuesPerRegion = REGION_LIST.map(region => {
      const vals = countries
        .filter(c => c.region === region)
        .map(c => parseNumber(c[metric.key]));

      return { region, value: mean(vals) };
    });

    const map = new Map(valuesPerRegion.map(d => [d.region, d.value]));
    const selectedVal = map.get(regionName);

    const otherVals = valuesPerRegion
      .filter(d => d.region !== regionName)
      .map(d => d.value);

    const otherMean = mean(otherVals);

    let isStronger = false;
    if (!isNaN(selectedVal) && !isNaN(otherMean)) {
      isStronger = metric.higherBetter
        ? selectedVal >= otherMean
        : selectedVal <= otherMean;
    }

    return {
      key: metric.key,
      label: metric.label,
      higherBetter: metric.higherBetter,
      valuesPerRegion,
      selectedVal,
      otherMean,
      isStronger
    };
  });

  // 2. Sort so stronger metrics are grouped together
  regionAveragesByMetric.sort((a, b) => {
    if (a.isStronger !== b.isStronger) {
      return a.isStronger ? -1 : 1;
    }
    return d3.ascending(a.label, b.label);
  });

  metricsData = regionAveragesByMetric;

  // 3. angular scale
  const angleScale = d3.scaleBand()
    .domain(metricsData.map(d => d.key))
    .range([0, 2 * Math.PI])
    .padding(0.05);

  const bandwidth = angleScale.bandwidth();

  // 4. radial scales per metric
  metricsData.forEach(metric => {
    const vals = metric.valuesPerRegion
      .map(v => v.value)
      .filter(v => !isNaN(v));
    let domain;
    if (vals.length && d3.min(vals) !== d3.max(vals)) {
      domain = [d3.min(vals), d3.max(vals)];
    } else {
      domain = [0, 1];
    }

    metric.rScale = d3.scaleLinear()
      .domain(domain)
      .range([innerRadius, outerRadius]);
  });

  // ---------------------------------------------------------------------------
  // Metric wedges (background arcs)
  // ---------------------------------------------------------------------------

  const arcs = arcsGroup.selectAll(".metric-arc-bg")
    .data(metricsData, d => d.key);

  const arcsEnter = arcs.enter()
    .append("path")
    .attr("class", "metric-arc-bg");

  arcsEnter.merge(arcs)
    .attr("fill", null)
    .transition()
    .duration(600)
    .attr("d", d => {
      const startAngle = angleScale(d.key) - bandwidth / 2;
      const endAngle = angleScale(d.key) + bandwidth / 2;
      return metricArcGen({ startAngle, endAngle });
    });

  arcs.exit().remove();

  // ---------------------------------------------------------------------------
  // Metric groups
  // ---------------------------------------------------------------------------

  const metricGroups = metricsGroup.selectAll(".metric")
    .data(metricsData, d => d.key);

  const metricEnter = metricGroups.enter()
    .append("g")
    .attr("class", "metric");

  metricEnter.append("line")
    .attr("class", "metric-axis")
    .attr("x1", 0)
    .attr("y1", -innerRadius)
    .attr("x2", 0)
    .attr("y2", -outerRadius);

  metricEnter.append("line")
    .attr("class", "metric-connector");

  metricEnter.append("text")
    .attr("class", "metric-label")
    .attr("x", 0)
    .attr("y", -(outerRadius + 20))
    .text(d => d.label);

  metricEnter.append("g")
    .attr("class", "dots");

  metricGroups.merge(metricEnter)
    .transition()
    .duration(600)
    .attr("transform", d => {
      const angle = angleScale(d.key);
      return `rotate(${angle * 180 / Math.PI - 90})`;
    });

  metricGroups.exit().remove();

  // ---------------------------------------------------------------------------
  // Update dashed connectors (min–max)
  // ---------------------------------------------------------------------------

  metricsGroup.selectAll(".metric")
    .select(".metric-connector")
    .each(function (d) {
      const vals = d.valuesPerRegion.map(v => v.value).filter(v => !isNaN(v));
      if (!vals.length) {
        d3.select(this).attr("y1", -innerRadius).attr("y2", -innerRadius);
        return;
      }
      const minR = d.rScale(d3.min(vals));
      const maxR = d.rScale(d3.max(vals));
      d3.select(this)
        .transition()
        .duration(600)
        .attr("x1", 0).attr("x2", 0)
        .attr("y1", -maxR)
        .attr("y2", -minR);
    });

  // ---------------------------------------------------------------------------
  // Dots per region per metric
  // ---------------------------------------------------------------------------

  const dots = metricsGroup.selectAll(".metric")
    .select(".dots")
    .selectAll("circle")
    .data(d =>
      d.valuesPerRegion.map(v => ({
        metric: d,
        region: v.region,
        value: v.value
      })),
      d => d.region
    );

  const dotsEnter = dots.enter()
    .append("circle")
    .attr("class", "region-dot")
    .attr("r", d => d.region === regionName ? 7 : 4);

  dotsEnter.merge(dots)
    .attr("class", d =>
      "region-dot " + (d.region === regionName ? "selected-region" : "other-region")
    )
    .transition()
    .duration(600)
    .attr("cy", d => {
      const r = d.metric.rScale(d.value);
      return isNaN(r) ? -innerRadius : -r;
    })
    .attr("r", d => d.region === regionName ? 7 : 4);

  dots.exit().remove();

  // ---------------------------------------------------------------------------
  // Purple arc
  // ---------------------------------------------------------------------------

  const strongMetrics = metricsData.filter(d => d.isStronger);

  if (!strongMetrics.length) {
    strengthArcPath.attr("d", null);
  } else {
    const start = d3.min(strongMetrics,
      d => angleScale(d.key) - bandwidth / 2);
    const end = d3.max(strongMetrics,
      d => angleScale(d.key) + bandwidth / 2);

    strengthArcPath
      .transition()
      .duration(600)
      .attr("d", strengthArcGen({ startAngle: start, endAngle: end }));
  }

  // ---------------------------------------------------------------------------
  // Center Summary (with wrapped text!)
  // ---------------------------------------------------------------------------

  const totalMetrics = metricsData.length;
  const strongCount = strongMetrics.length;
  const percent = totalMetrics ? (strongCount / totalMetrics) * 100 : 0;

  summaryGroup.select(".summary-text")
    .text(`${d3.format(".0f")(percent)}%`);

  const sub = summaryGroup.select(".summary-subtext");
  wrapCenterText(
    sub,
    `of metrics are stronger than the average of other Regions for ${regionName}.`,
    28 // max characters per line (adjust for width)
  );
}
