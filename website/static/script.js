maptilersdk.config.apiKey = "UxGp9YlNAOD7FyWyTS61";

const map = new maptilersdk.Map({
    container: "map",
    style: maptilersdk.MapStyle.STREETS.DARK,
    center: [20, 20],
    zoom: 2
});

let chart = null;

map.on("load", () => {
    fetch("/static/hotspots.json?v=" + new Date().getTime())
    .then(r => r.json())
    .then(data => {
        
        // ==============================================
        // 1. OPTIMAL PLACEMENT ENGINE LOGIC
        // ==============================================
        const topTargets = [...data].sort((a, b) => b.priority_score - a.priority_score).slice(0, 3);
        const engineContainer = document.getElementById("engine-results");
        if (engineContainer) {
            engineContainer.innerHTML = ""; 
            topTargets.forEach((target, index) => {
                const reduction = Number(target.i_mid).toLocaleString(undefined, { maximumFractionDigits: 0 });
                engineContainer.innerHTML += `
                    <div class="engine-item">
                        <b>#${index + 1} Priority Coordinate</b><br>
                        <span style="font-size: 11px; color: #aaa;">Lat: ${target.Y.toFixed(4)}, Lon: ${target.X.toFixed(4)}</span><br>
                        <span style="color: #00f2fe;">Potential Reduction:</span> ${reduction} units/yr
                    </div>
                `;
            });
        }

        // ==============================================
        // 2. MAP GEOJSON GENERATION
        // ==============================================
        const geojson = {
            type: "FeatureCollection",
            features: data.map(point => ({
                type: "Feature",
                properties: {
                    i_mid: Number(point.i_mid), mpw: Number(point.mpw),
                    rank: Number(point.rank), percentile: Number(point.percentile),
                    risk_level: point.risk_level, daily_leakage: Number(point.daily_leakage),
                    priority_score: Number(point.priority_score),
                    lat: Number(point.Y), lon: Number(point.X), group: point.group,
                    jan: Number(point.i_mid_jan), feb: Number(point.i_mid_feb),
                    mar: Number(point.i_mid_mar), apr: Number(point.i_mid_apr),
                    may: Number(point.i_mid_may), jun: Number(point.i_mid_jun),
                    jul: Number(point.i_mid_jul), aug: Number(point.i_mid_aug),
                    sep: Number(point.i_mid_sep), oct: Number(point.i_mid_oct),
                    nov: Number(point.i_mid_nov), dec: Number(point.i_mid_dec)
                },
                geometry: { type: "Point", coordinates: [Number(point.X), Number(point.Y)] }
            }))
        };

        map.addSource("hotspots", { type: "geojson", data: geojson });

        // Heatmap Layers
        map.addLayer({
            id: "high-heatmap", type: "heatmap", source: "hotspots",
            filter: ["==", ["get", "group"], "high"],
            paint: {
                "heatmap-weight": 1, "heatmap-intensity": 2,
                "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 15, 4, 30, 8, 60],
                "heatmap-opacity": 0.9,
                "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(255,255,0,0)", 0.3, "#ffff00", 0.6, "#ff9900", 1, "#ff0000"]
            }
        });

        map.addLayer({
            id: "low-heatmap", type: "heatmap", source: "hotspots",
            filter: ["==", ["get", "group"], "low"],
            paint: {
                "heatmap-weight": 1, "heatmap-intensity": 2,
                "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 15, 4, 30, 8, 60],
                "heatmap-opacity": 0.9,
                "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(106,0,255,0)", 0.25, "#6a00ff", 0.5, "#0000ff", 0.75, "#00ffff", 1, "#00ff00"]
            }
        });

        map.addLayer({
            id: "hotspot-clicks", type: "circle", source: "hotspots",
            paint: { "circle-radius": 25, "circle-opacity": 0 }
        });

        map.on("mouseenter", "hotspot-clicks", () => map.getCanvas().style.cursor = "pointer");
        map.on("mouseleave", "hotspot-clicks", () => map.getCanvas().style.cursor = "");

        // ==============================================
        // CLICK EVENT & DYNAMIC UI DATA INJECTION
        // ==============================================
        map.on("click", "hotspot-clicks", async (e) => {
            const p = e.features[0].properties;
            let place = "Unknown Region";

            try {
                const res = await fetch(`https://api.maptiler.com/geocoding/${p.lon},${p.lat}.json?key=UxGp9YlNAOD7FyWyTS61`);
                const geo = await res.json();
                place = geo.features?.[0]?.place_name || "Unknown Region";
            } catch {}

            document.getElementById("location").innerHTML = `<b>${place}</b>`;
            document.getElementById("coords").innerHTML = `Lat: ${p.lat.toFixed(4)} | Lon: ${p.lon.toFixed(4)}`;

            // 3. Dynamic Interceptor Recommendation
            let recommendedAction = "";
            let actionColor = "";
            let expectedImpact = "";

            if (p.risk_level === "Extreme" || p.risk_level === "High") {
                recommendedAction = "Deploy Autonomous River Interceptor";
                actionColor = "#ff0844"; expectedImpact = "Massive Volume Reduction";
            } else if (p.risk_level === "Moderate") {
                recommendedAction = "Install Passive Boom Systems & Traps";
                actionColor = "#00ff00"; expectedImpact = "High Cost-Efficiency";
            } else { 
                recommendedAction = "Community Waste Management & Policy";
                actionColor = "#00f2fe"; expectedImpact = "Source Prevention";
            }

            document.getElementById("recommendation").innerHTML = `
                <b>Recommended Action:</b><br>
                <span style="color:${actionColor}; font-weight: bold;">${recommendedAction}</span><br><br>
                <b>Priority Rank:</b> #${Math.round(p.rank)}<br>
                <b>Strategy Profile:</b> <span style="color:var(--text-muted);">${expectedImpact}</span>
            `;

            // 4. Formatting Leakage
            const rawLeakage = Number(p.i_mid);
            let formattedLeakage = rawLeakage >= 1000000 ? (rawLeakage / 1000000).toFixed(2) + "M" : 
                                   rawLeakage >= 1000 ? (rawLeakage / 1000).toFixed(1) + "K" : 
                                   Math.round(rawLeakage).toString();

            document.getElementById("leakage").innerHTML = `
                Annual Leakage:<br><b class="metricValue" style="font-size: 24px;">${formattedLeakage}</b> units/year<br><br>
                Daily Leakage:<br><b>${Math.round(p.daily_leakage).toLocaleString()}</b> units/day
            `;

            // 5. Update Interactive Indicator
            const indicator = document.getElementById("indicator");
            if (indicator) {
                const safePercentile = Math.max(1, Math.min(99, Number(p.percentile)));
                indicator.style.left = `${safePercentile}%`;
            }

            // 6. Update Chart
            const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
            const monthlyValues = [p.jan, p.feb, p.mar, p.apr, p.may, p.jun, p.jul, p.aug, p.sep, p.oct, p.nov, p.dec];
            if(chart) chart.destroy();
            chart = new Chart(document.getElementById("monthlyChart"), {
                type:"line", data:{ labels: months, datasets:[{ label: "Emissions", data: monthlyValues, borderColor: "#ff0844", backgroundColor: "rgba(255,8,68,0.1)", fill: true, tension: 0.4 }] },
                options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { ticks: { maxTicksLimit: 5 } } } }
            });

            // ==============================================
            // 8. INJECT YOLO VALIDATION COMPONENT
            // ==============================================
            const yoloSection = document.getElementById("yolo-validation-section");
            
            // Build the HTML for the upload card
            yoloSection.innerHTML = `
                <div class="card" style="border: 1px solid #00f2fe; background: rgba(0,242,254,0.05); margin-top: 20px;">
                    <h3 style="color: #00f2fe; display: flex; justify-content: space-between;">
                        Field Validation
                        <span style="font-size: 10px; background: #00f2fe; color: black; padding: 2px 6px; border-radius: 4px;">YOLOv8</span>
                    </h3>
                    <p style="font-size: 12px; color: var(--text-muted); margin-top: -8px;">Upload site imagery to verify pollution density at Coordinate #${Math.round(p.rank)}.</p>
                    
                    <input type="file" id="siteImage" accept="image/*" style="width:100%; margin-bottom: 15px; color: white; font-size: 13px;">
                    
                    <button id="runYoloBtn" style="width:100%; background: #00f2fe; color: black; border: none; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s;">
                        Run Computer Vision Analysis
                    </button>
                    
                    <div id="yoloResults" style="margin-top: 15px;"></div>
                </div>
            `;

            // Attach the function that fires when the button is clicked
            document.getElementById("runYoloBtn").addEventListener("click", async () => {
                const fileInput = document.getElementById("siteImage");
                const resultsContainer = document.getElementById("yoloResults");

                if (fileInput.files.length === 0) {
                    alert("Please select an image file first.");
                    return;
                }

                // Show loading state so judges know the backend is thinking
                resultsContainer.innerHTML = `<div style="text-align:center; padding: 20px; color: #ff9900; font-weight:bold;">Analyzing visual data... please wait.</div>`;

                const formData = new FormData();
                formData.append("image", fileInput.files[0]);

                try {
                    const response = await fetch("/api/validate_hotspot", {
                        method: "POST",
                        body: formData
                    });
                    console.log("Status:", response.status);
                    const text = await response.text();
                    console.log("Response:", text);
                    const data = JSON.parse(text);

                    if (data.error) {
                        resultsContainer.innerHTML = `<span style="color: #ff0844;">Error: ${data.error}</span>`;
                        return;
                    }

                    // Format the bounding box counts
                    let countsHtml = "<b style='color:#00f2fe; font-size:15px;'>Detected Objects:</b><br>";
                    let totalObjects = 0;
                    
                    for (const [item, count] of Object.entries(data.counts)) {
                        countsHtml += `<span style="color:white; font-size:14px;">- ${item}: <b>${count}</b></span><br>`;
                        totalObjects += count;
                    }
                    
                    if (totalObjects === 0) {
                         countsHtml = "<span style='color: #00ff00; font-weight:bold;'>No visible plastic detected in this frame.</span>";
                    }

                    // Render the counts and the annotated image
                    resultsContainer.innerHTML = `
                        <div style="background: rgba(0,0,0,0.4); padding: 12px; border-radius: 8px; margin-bottom: 15px; border-left: 3px solid #00f2fe; line-height: 1.6;">
                            ${countsHtml}
                        </div>
                        <img src="${data.image_base64}" style="width: 100%; border-radius: 8px; border: 1px solid rgba(0,242,254,0.3); box-shadow: 0 4px 15px rgba(0,0,0,0.5);" alt="YOLO Annotated Site Image">
                    `;
                } catch (error) {
                    resultsContainer.innerHTML = `<span style="color: #ff0844; font-weight:bold;">Connection Error. Ensure your Flask server is running.</span>`;
                }
            });
        });
    });
});
