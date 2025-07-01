// main.js

// 1. --- MAP & UI INITIALIZATION ---
const map = L.map('map').setView([51.505, -0.09], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

const locateBtn = document.getElementById('locate-btn');
let wasmApi = {};
let personMarkers = []; 

// Styles for our markers
const USER_STYLE = { radius: 10, color: '#0077b6', fillColor: '#ade8f4', fillOpacity: 0.9 };
const OTHER_STYLE = { radius: 8, color: '#e63946', fillColor: '#f1faee', fillOpacity: 0.8 };

// 2. --- WEBASSEMBLY MODULE LOADING ---
Module.onRuntimeInitialized = () => {
    console.log("WebAssembly module loaded.");
    
    // Wrap our C++ functions
    wasmApi = {
        setUserLocation: Module.cwrap('setUserLocation', 'void', ['number', 'number']),
        addOtherPerson: Module.cwrap('addOtherPerson', 'void', ['number', 'number']),
        getPeopleCount: Module.cwrap('getPeopleCount', 'number', []),
        getPeopleData: Module.cwrap('getPeopleData', 'number', []),
        updatePositions: Module.cwrap('updatePositions', 'void', []),
        userExists: Module.cwrap('userExists', 'boolean', [])
    };
    
    setInterval(renderLoop, 50); // Start render loop
};


// 3. --- MAIN RENDER LOOP ---
function renderLoop() {
    if (!wasmApi.updatePositions) return;

    wasmApi.updatePositions(); // Tell C++ to move the "other" people
    
    const count = wasmApi.getPeopleCount();
    if (count === 0) return;

    // Zero-copy read of data from Wasm memory
    const dataPtr = wasmApi.getPeopleData();
    const peopleData = new Float64Array(Module.HEAPF64.buffer, dataPtr, count * 2);

    // Create new markers if needed
    while (personMarkers.length < count) {
        const marker = L.circleMarker([0, 0]).addTo(map);
        personMarkers.push(marker);
    }
    
    // Check if the user's marker exists (at index 0)
    const userMarkerExists = wasmApi.userExists();

    // Update position and style of each marker
    for (let i = 0; i < count; i++) {
        const lat = peopleData[i * 2];
        const lon = peopleData[i * 2 + 1];
        personMarkers[i].setLatLng([lat, lon]);

        // Style the user marker differently
        if (userMarkerExists && i === 0) {
            personMarkers[i].setStyle(USER_STYLE);
        } else {
            personMarkers[i].setStyle(OTHER_STYLE);
        }
    }
}

// 4. --- USER INTERACTION ---

// Find the user's location when the button is clicked
locateBtn.addEventListener('click', () => {
    if (!("geolocation" in navigator)) {
        alert("Geolocation is not supported by your browser.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            console.log(`User found at: ${latitude}, ${longitude}`);
            
            // Center map on the user
            map.setView([latitude, longitude], 15);
            
            // Send location to our C++ engine
            wasmApi.setUserLocation(latitude, longitude);
        },
        () => {
            alert("Could not get your location. Please ensure you have granted permission.");
        }
    );
});

// Add "other" people when the map is clicked
map.on('click', (e) => {
    if (wasmApi.addOtherPerson) {
        console.log(`Adding other person at: ${e.latlng.lat}, ${e.latlng.lng}`);
        wasmApi.addOtherPerson(e.latlng.lat, e.latlng.lng);
    }
});