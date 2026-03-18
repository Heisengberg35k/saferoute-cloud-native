console.log("SafeRoute loaded");

const map = L.map('map').setView([51.5072, -0.1276], 13);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
maxZoom: 19,
attribution: '&copy; OpenStreetMap'
}).addTo(map);

// store reports temporarily
let reports = [];

const form = document.getElementById("reportForm");
const reportsList = document.getElementById("reportsList");

form.addEventListener("submit", function(event){

event.preventDefault();

const title = form.querySelector("input").value;
const description = form.querySelector("textarea").value;

const report = {
id: Date.now(),
title,
description
};

reports.push(report);

renderReports();
addMapMarker(report);

form.reset();

});

// show reports in sidebar
function renderReports(){

reportsList.innerHTML = "";

reports.forEach(report => {

const li = document.createElement("li");

li.innerHTML = `
<strong>${report.title}</strong>
<br>
${report.description}
<br>
<button onclick="deleteReport(${report.id})">Delete</button>
`;

reportsList.appendChild(li);

});

}

// Listen for clicks on the map
let tempMarker = null;

map.on("click", function (e) {

    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    // Remove previous marker
    if (tempMarker) {
        map.removeLayer(tempMarker);
    }

    // Create new marker
    tempMarker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup("Selected report location")
        .openPopup();

    // Auto-fill form fields
    document.getElementById("latitude").value = lat;
    document.getElementById("longitude").value = lng;

});

// simulate map marker
function addMapMarker(report){

const marker = document.createElement("div");

marker.style.width = "12px";
marker.style.height = "12px";
marker.style.background = "red";
marker.style.borderRadius = "50%";
marker.style.position = "absolute";

marker.style.left = Math.random()*90 + "%";
marker.style.top = Math.random()*90 + "%";

map.appendChild(marker);

}

// delete report
function deleteReport(id){

reports = reports.filter(r => r.id !== id);

renderReports();

}