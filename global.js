let x, y, bins, svg, height, width, x1, bars, admissionTimeout, diagnosesTimeout;
let svgDiagnoses, dots, dxData;
let currentDiagnosisIndex = 0;

let hasAnimatedAdmissions = false;
let hasAnimatedDiagnoses = false;

const colorScale = d3.scaleOrdinal(d3.schemePaired); 

// Add tooltip div (hidden by default)
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("background", "#fff")
    .style("border", "1px solid #ccc")
    .style("border-radius", "8px")
    .style("padding", "8px")
    .style("font-size", "12px")
    .style("box-shadow", "0px 4px 8px rgba(0, 0, 0, 0.2)")
    .style("opacity", 0);

// Function to show tooltips on hover
function addBarTooltips() {
    bars.on("mouseover", function (event, d) {
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`
                <strong>Range:</strong> ${d.x0} - ${d.x1}<br>
                <strong>Male Count:</strong> ${d.maleCount}<br>
                <strong>Female Count:</strong> ${d.femaleCount}
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mousemove", function (event) {
            tooltip.style("left", (event.pageX + 10) + "px")
                   .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function () {
            tooltip.transition().duration(200).style("opacity", 0);
        });
}

// Scroll to a specific slide
function scrollToSlide(id) {
    document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
}

// Animate bars into gender-grouped bars
function animateGraphToGender() {
    x1 = d3.scaleBand()
        .domain(["male", "female"])
        .range([0, x.bandwidth()])
        .padding(0.1);

    y.domain([0, d3.max(bins, d => Math.max(d.maleCount, d.femaleCount))]);

    bars.transition()
        .duration(1000)
        .attr("width", x1.bandwidth())
        .attr("x", d => x(`${d.x0}-${d.x1}`) + x1("male"))
        .attr("y", d => y(d.maleCount))
        .attr("height", d => height - y(d.maleCount))
        .attr("fill", "#74c0fc");

    svg.selectAll(".female-bar")
        .data(bins)
        .join("rect")
        .attr("class", "female-bar")
        .attr("x", d => x(`${d.x0}-${d.x1}`) + x1("female"))
        .attr("y", height)
        .attr("width", x1.bandwidth())
        .attr("fill", "#f783ac")
        .transition()
        .duration(1000)
        .attr("y", d => y(d.femaleCount))
        .attr("height", d => height - y(d.femaleCount));

    // Add legend (moved to the right)
    svg.append("circle").attr("cx", width - 70).attr("cy", -10).attr("r", 8).style("fill", "#74c0fc");
    svg.append("text").attr("x", width - 50).attr("y", -5).text("Male").style("font-size", "14px").style("font-weight", "bold");

    svg.append("circle").attr("cx", width - 70).attr("cy", 20).attr("r", 8).style("fill", "#f783ac");
    svg.append("text").attr("x", width - 50).attr("y", 25).text("Female").style("font-size", "14px").style("font-weight", "bold");

    document.getElementById('gender-insight').classList.add('visible');

    // Add tooltips to the new bars
    addBarTooltips();
    // Add trend lines for both genders
    addTrendLines();

    setTimeout(() => {
        document.getElementById('scroll').classList.add('visible');
    }, 4000);
}

function addTrendLines() {
    const xLinear = d3.scaleLinear()
        .domain([d3.min(bins, d => (d.x0 + d.x1) / 2), d3.max(bins, d => (d.x0 + d.x1) / 2)])
        .range([0, width]);

    const maleTrendData = bins.map(bin => ({ x: (bin.x0 + bin.x1) / 2, y: bin.maleCount }));
    const femaleTrendData = bins.map(bin => ({ x: (bin.x0 + bin.x1) / 2, y: bin.femaleCount }));

    const lineMale = d3.line()
        .x(d => xLinear(d.x))
        .y(d => y(d.y));

    const lineFemale = d3.line()
        .x(d => xLinear(d.x))
        .y(d => y(d.y));

    // Create trend lines but make them invisible at first
    const maleLine = svg.append("path")
        .data([maleTrendData])
        .attr("class", "male-trend-line")
        .attr("d", lineMale)
        .attr("fill", "none")
        .attr("stroke", "#3a76a6")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", function() {
            return this.getTotalLength();
        })
        .attr("stroke-dashoffset", function() {
            return this.getTotalLength();
        });

    const femaleLine = svg.append("path")
        .data([femaleTrendData])
        .attr("class", "female-trend-line")
        .attr("d", lineFemale)
        .attr("fill", "none")
        .attr("stroke", "#b55e7d")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", function() {
            return this.getTotalLength();
        })
        .attr("stroke-dashoffset", function() {
            return this.getTotalLength();
        });

    // Animate the lines after a 1-second delay
    setTimeout(() => {
        maleLine.transition()
            .duration(1500)
            .ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0);

        femaleLine.transition()
            .duration(1500)
            .ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0);
    }, 1000);
}

function drawAdmissionGraph() {
    // Load demographic data from CSV
    d3.csv("demographic_dx.csv").then(function(data) {
        data = data.map(d => ({
            age: +d.age,
            sex: d.sex.trim()
        }));

        const margin = { top: 50, right: 100, bottom: 70, left: 70 };
        const vis = document.getElementById("admission-vis");
        width = vis.clientWidth - margin.left - margin.right;
        height = vis.clientHeight - margin.top - margin.bottom;

        svg = d3.select("#admission-vis")
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const binWidth = 10;
        const ageMin = d3.min(data, d => d.age);
        const ageMax = d3.max(data, d => d.age);
        bins = d3.bin()
            .domain([ageMin, ageMax])
            .thresholds(d3.range(Math.floor(ageMin / binWidth) * binWidth, Math.ceil(ageMax / binWidth) * binWidth, binWidth))
            (data.map(d => d.age));

        bins.forEach(bin => {
            bin.maleCount = data.filter(d => d.age >= bin.x0 && d.age < bin.x1 && d.sex === "0").length;
            bin.femaleCount = data.filter(d => d.age >= bin.x0 && d.age < bin.x1 && d.sex === "1").length;
            bin.totalCount = bin.maleCount + bin.femaleCount;
        });

        x = d3.scaleBand()
            .domain(bins.map(d => `${d.x0}-${d.x1}`))
            .range([0, width])
            .padding(0.2);

        y = d3.scaleLinear()
            .domain([0, d3.max(bins, d => d.totalCount)])
            .nice()
            .range([height, 0]);

        // Axes
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).tickSize(0))
            .selectAll("text").style("font-weight", "bold");

        svg.append("g")
            .call(d3.axisLeft(y))
            .selectAll("text").style("font-weight", "bold");

        // Axis labels
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height + 50)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text("Age Bins");

        svg.append("text")
            .attr("x", -height / 2)
            .attr("y", -50)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .attr("transform", "rotate(-90)")
            .text("Count");

        // Initial bars (total counts)
        bars = svg.selectAll(".bar")
            .data(bins)
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", d => x(`${d.x0}-${d.x1}`))
            .attr("y", d => y(d.totalCount))
            .attr("width", x.bandwidth())
            .attr("height", d => height - y(d.totalCount))
            .attr("fill", "#74c0fc");
    }).catch(function(error) {
        console.error("Error loading the CSV file:", error);
    });
}

// Draw Diagnoses visualization
function drawDiagnosesGraph() {
    d3.csv("dx_group_counts.csv").then(function(data) {
        dxData = data.map(d => ({
            dx_group: d.dx_group.trim(),
            count: Math.ceil(+d.count / 5) // 1 dot represents 5 people
        }));

        if (dxData.length === 0) {
            console.error("dxData is empty or not loaded properly.");
            return;
        }

        const flattenedData = [];
        dxData.forEach(d => {
            for (let i = 0; i < d.count; i++) {
                flattenedData.push(d);
            }
        });

        const margin = { top: 40, right: 50, bottom: 10, left: 50 };
        const width = 800 - margin.left - margin.right; 
        const height = 1000 - margin.top - margin.bottom;

        svgDiagnoses = d3.select("#diagnoses-vis")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const totalDots = flattenedData.length;
        const columns = Math.ceil(Math.sqrt(totalDots));
        const rows = Math.ceil(totalDots / columns);

        const dotSpacingX = (width / columns) - 0.5;
        const dotSpacingY = (height / rows) - 11; 

        dots = svgDiagnoses.selectAll(".dot")
            .data(flattenedData)
            .enter()
            .append("circle")
            .attr("class", "dot")
            .attr("cx", (d, i) => {
                const colIndex = i % columns;
                return colIndex * dotSpacingX + (dotSpacingX / 2);
            })
            .attr("cy", (d, i) => {
                const rowIndex = Math.floor(i / columns);
                return rowIndex * dotSpacingY + (dotSpacingY / 2);
            })
            .attr("r", 5)
            .attr("fill", "#7d7d7d") // Start all dots in gray

    }).catch(function(error) {
        console.error("Error loading the CSV file:", error);
    });
}

// Animate dots when user reaches the diagnoses slide
function animateDiagnosesGraph() {
    const groups = Array.from(new Set(dots.data().map(d => d.dx_group))); // Get unique groups

    groups.forEach((group, index) => {
        setTimeout(() => {
            // Highlight dots by group
            svgDiagnoses.selectAll(".dot")
                .filter(d => d.dx_group === group)
                .transition()
                .duration(1000)
                .style("opacity", 1)
                .attr("fill", colorScale(group));

            // Show label on the left
            svgDiagnoses.select(".group-label")
                .selectAll("text")
                .data([group])
                .join("text")
                .attr("x", -120)
                .attr("y", index * 30)
                .attr("fill", colorScale(group))
                .style("opacity", 0)
                .text(`${group} group`)
                .transition()
                .duration(1000)
                .style("opacity", 1);

        }, index * 2000); // 2 seconds between groups
    });
}

document.addEventListener("DOMContentLoaded", function() {
    const slides = document.querySelectorAll(".slide");
    const admissionSlide = document.getElementById('admission');
    const diagnosesSlide = document.getElementById('diagnoses');

    // Slide-in effect
    const handleScroll = () => {
        slides.forEach(slide => {
            const slideTop = slide.getBoundingClientRect().top;
            if (slideTop < window.innerHeight * 0.75) {
                slide.classList.add("visible");
            }
        });

        // Trigger admissions animation
        const admissionTop = admissionSlide.getBoundingClientRect().top;
        if (admissionTop < window.innerHeight * 0.75 && !hasAnimatedAdmissions) {
            hasAnimatedAdmissions = true;
            admissionTimeout = setTimeout(animateGraphToGender, 3000);
        }

        // Trigger diagnoses animation
        const diagnosesTop = diagnosesSlide.getBoundingClientRect().top;
        if (diagnosesTop < window.innerHeight * 0.75 && !hasAnimatedDiagnoses) {
            hasAnimatedDiagnoses = true;
            diagnosesTimeout = setTimeout(animateDiagnosesGraph, 3000);
        }

    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    drawAdmissionGraph();
    drawDiagnosesGraph();
});
