let x, y, bins, svg, height, width, x1, bars, admissionTimeout, diagnosesTimeout;
let svgDiagnoses, dots, dxData;
let currentDiagnosisIndex = 0;
let hasAnimatedAdmissions = false;
let hasAnimatedDiagnoses = false;
let hasAnimatedDuration = false; // New flag for Duration of Stay

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

// Scroll to a specific slide
function scrollToSlide(id) {
    document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
}

// Load Duration of Stay Data from cases.txt
async function loadCasesData() {
    try {
        const response = await fetch('cases.txt');
        const text = await response.text();
        const lines = text.trim().split("\n");
        const headers = lines[0].split(",");

        const data = lines.slice(1).map(line => {
            const values = line.split(",");
            let row = {};
            headers.forEach((header, index) => {
                row[header] = values[index];
            });
            return row;
        });

        const surgeryStay = {};

        data.forEach(row => {
            const surgery = row.opname.trim();
            const admTime = parseInt(row.adm, 10);
            const disTime = parseInt(row.dis, 10);
            const stayDuration = Math.max((disTime - admTime) / 1440, 0);

            if (!surgeryStay[surgery]) {
                surgeryStay[surgery] = { totalDays: 0, count: 0 };
            }

            surgeryStay[surgery].totalDays += stayDuration;
            surgeryStay[surgery].count += 1;
        });

        const durationData = Object.keys(surgeryStay).map(surgery => ({
            surgery: surgery,
            days: (surgeryStay[surgery].totalDays / surgeryStay[surgery].count).toFixed(1)
        }));

        renderDurationOfStay(durationData);
    } catch (error) {
        console.error("Error loading cases.txt:", error);
    }
}

// Function to visualize Duration of Stay
function renderDurationOfStay(durationData) {
    d3.select("#duration-vis").html("");

    const svgWidth = 600, svgHeight = 400;
    const svg = d3.select("#duration-vis")
        .append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight);

    const xScale = d3.scaleBand()
        .domain(durationData.map(d => d.surgery))
        .range([50, svgWidth - 50])
        .padding(0.4);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(durationData, d => parseFloat(d.days))])
        .range([svgHeight - 50, 50]);

    svg.append("g")
        .attr("transform", "translate(0," + (svgHeight - 50) + ")")
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    svg.append("g")
        .attr("transform", "translate(50,0)")
        .call(d3.axisLeft(yScale));

    svg.selectAll(".bar")
        .data(durationData)
        .enter()
        .append("rect")
        .attr("x", d => xScale(d.surgery))
        .attr("y", d => yScale(parseFloat(d.days)))
        .attr("width", xScale.bandwidth())
        .attr("height", d => svgHeight - 50 - yScale(parseFloat(d.days)))
        .attr("fill", "#69b3a2");

    svg.selectAll(".label")
        .data(durationData)
        .enter()
        .append("text")
        .attr("x", d => xScale(d.surgery) + xScale.bandwidth() / 2)
        .attr("y", d => yScale(parseFloat(d.days)) - 5)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("fill", "#000")
        .text(d => d.days + " days");
}

// Restore Admission Graph
function drawAdmissionGraph() {
    d3.select("#admission-vis").html("").append("p").text("📊 Loading Admission Graph...");
}

// Restore Diagnoses Graph
function drawDiagnosesGraph() {
    d3.select("#diagnoses-vis").html("").append("p").text("📊 Loading Diagnoses Graph...");
}

// Scroll Event Handler
document.addEventListener("DOMContentLoaded", function() {
    const slides = document.querySelectorAll(".slide");
    const admissionSlide = document.getElementById('admission');
    const diagnosesSlide = document.getElementById('diagnoses');
    const durationSlide = document.getElementById('duration-stay');

    function handleScroll() {
        slides.forEach(slide => {
            const slideTop = slide.getBoundingClientRect().top;
            if (slideTop < window.innerHeight * 0.75) {
                slide.classList.add("visible");
            }
        });

        if (admissionSlide.getBoundingClientRect().top < window.innerHeight * 0.75 && !hasAnimatedAdmissions) {
            hasAnimatedAdmissions = true;
            admissionTimeout = setTimeout(() => {
                document.getElementById("scroll").classList.add("visible");
                drawAdmissionGraph();
            }, 1000);
        }

        if (diagnosesSlide.getBoundingClientRect().top < window.innerHeight * 0.75 && !hasAnimatedDiagnoses) {
            hasAnimatedDiagnoses = true;
            diagnosesTimeout = setTimeout(() => {
                drawDiagnosesGraph();
            }, 1000);
        }

        if (durationSlide.getBoundingClientRect().top < window.innerHeight * 0.75 && !hasAnimatedDuration) {
            hasAnimatedDuration = true;
            loadCasesData();
        }
    }

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    // Restore initial graphs
    drawAdmissionGraph();
    drawDiagnosesGraph();
});
