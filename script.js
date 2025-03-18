/*--------------------------------------------------------------------
GGR472 LAB 4: Incorporating GIS Analysis into web maps using Turf.js 
--------------------------------------------------------------------*/

/*--------------------------------------------------------------------
Step 1: INITIALIZE MAP
--------------------------------------------------------------------*/
// Define access token
mapboxgl.accessToken = 'pk.eyJ1Ijoic2FuYWhhc2hpbSIsImEiOiJjbTV5NnpreTcwMTBqMnJvN2ltN2Jjcmo1In0.JpuPVI1IOhbjC1mjNPi5YQ'; //****ADD YOUR PUBLIC ACCESS TOKEN*****

// Initialize map and edit to your preference
const map = new mapboxgl.Map({
    container: 'map', // container id in HTML
    style: 'mapbox://styles/sanahashim/cm8e7ccux000001qg0q0s58aa',  // ****ADD MAP STYLE HERE *****
    center: [-79.39, 43.65],  // starting point, longitude/latitude
    zoom: 11 // starting zoom level
});


/*--------------------------------------------------------------------
Step 2: VIEW GEOJSON POINT DATA ON MAP
--------------------------------------------------------------------*/
//HINT: Create an empty variable
//      Use the fetch method to access the GeoJSON from your online repository
//      Convert the response to JSON format and then store the response in your new variable

// Create empty variables for data
let collisionData;
let hexGrid;

// Fetch the collision data from GeoJSON source
map.on('load', function () {
    // Fetch collision data
    fetch('C:\Users\sanah\Desktop\Github\ggr472-lab4')
        .then(response => response.json())
        .then(data => {
            collisionData = data;
            console.log('Collision data loaded:', collisionData);
            
            // Add collision points as a source
            map.addSource('collisions', {
                type: 'geojson',
                data: collisionData
            });
            
            // Add point layer for collisions
            map.addLayer({
                id: 'collision-points',
                type: 'circle',
                source: 'collisions',
                paint: {
                    'circle-radius': 3,
                    'circle-color': '#FF6B6B',
                    'circle-opacity': 0.7
                }
            });
            
            // Proceed to create bounding box and hexgrid
            createHexGrid();
        })
        .catch(error => console.error('Error loading collision data:', error));
});



/*--------------------------------------------------------------------
    Step 3: CREATE BOUNDING BOX AND HEXGRID
--------------------------------------------------------------------*/
//HINT: All code to create and view the hexgrid will go inside a map load event handler
//      First create a bounding box around the collision point data
//      Access and store the bounding box coordinates as an array variable
//      Use bounding box coordinates as argument in the turf hexgrid function
//      **Option: You may want to consider how to increase the size of your bbox to enable greater geog coverage of your hexgrid
//                Consider return types from different turf functions and required argument types carefully here

function createHexGrid() {
    // Create a bounding box around the point data
    // Add a buffer to ensure coverage of all points
    const points = turf.featureCollection(collisionData.features);
    let bbox = turf.bbox(points);
    
    // Extend the bounding box by approximately 1km to ensure better coverage
    // Convert ~1km in degrees (rough approximation)
    const bufferDegrees = 0.01;
    bbox = [
        bbox[0] - bufferDegrees, // minX - buffer
        bbox[1] - bufferDegrees, // minY - buffer
        bbox[2] + bufferDegrees, // maxX + buffer
        bbox[3] + bufferDegrees  // maxY + buffer
    ];
    
    console.log('Extended bounding box:', bbox);
    
    // Create the hexgrid using turf
    // cellSize is the distance between cell centers in kilometers
    hexGrid = turf.hexGrid(bbox, 0.5, { units: 'kilometers' });
    console.log('Hexgrid created:', hexGrid);
    
    // Proceed to aggregate collisions by hexgrid
    aggregateCollisions();
}


/*--------------------------------------------------------------------
Step 4: AGGREGATE COLLISIONS BY HEXGRID
--------------------------------------------------------------------*/
//HINT: Use Turf collect function to collect all '_id' properties from the collision points data for each heaxagon
//      View the collect output in the console. Where there are no intersecting points in polygons, arrays will be empty

function aggregateCollisions() {
    // Use turf.collect to count points in each hexagon
    // _id is a placeholder; we're just counting occurrences
    const collectedPoints = turf.collect(hexGrid, collisionData, '_id', 'collisions');
    console.log('Collected points:', collectedPoints);
    
    // Add a count property to each hexagon based on array length
    collectedPoints.features.forEach(function(feature) {
        feature.properties.COUNT = feature.properties.collisions.length;
    });
    
    // Find the maximum number of collisions in a hexagon for legend
    const counts = collectedPoints.features.map(f => f.properties.COUNT);
    const maxCount = Math.max(...counts);
    console.log('Maximum collisions in a hexagon:', maxCount);
    
    // Add hexgrid to the map
    addHexGridToMap(collectedPoints, maxCount);
}


// /*--------------------------------------------------------------------
// Step 5: FINALIZE YOUR WEB MAP
// --------------------------------------------------------------------*/
//HINT: Think about the display of your data and usability of your web map.
//      Update the addlayer paint properties for your hexgrid using:
//        - an expression
//        - The COUNT attribute
//        - The maximum number of collisions found in a hexagon
//      Add a legend and additional functionality including pop-up windows


function addHexGridToMap(hexgrid, maxCount) {
    // Add hexgrid source
    map.addSource('hexgrid', {
        type: 'geojson',
        data: hexgrid
    });
    
    // Add hexgrid layer with color expression based on count
    map.addLayer({
        id: 'hexgrid-fill',
        type: 'fill',
        source: 'hexgrid',
        paint: {
            'fill-color': [
                'interpolate',
                ['linear'],
                ['get', 'COUNT'],
                0, 'rgba(0, 0, 0, 0)', // Transparent for 0 count
                1, '#FFF5B3', // Light yellow for low counts
                Math.ceil(maxCount/4), '#FFD25A', // Medium yellow
                Math.ceil(maxCount/2), '#FF9F42', // Orange
                maxCount, '#FF5733' // Red for highest count
            ],
            'fill-opacity': 0.7
        }
    });
    
    // Add hexgrid outline
    map.addLayer({
        id: 'hexgrid-line',
        type: 'line',
        source: 'hexgrid',
        paint: {
            'line-color': '#FFFFFF',
            'line-width': 0.5,
            'line-opacity': 0.3
        }
    });
    
    // Add pop-up on hexgrid click
    map.on('click', 'hexgrid-fill', function(e) {
        if (e.features.length > 0) {
            const count = e.features[0].properties.COUNT;
            
            new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(`<strong>Collisions in this area: ${count}</strong>`)
                .addTo(map);
        }
    });
    
    // Change cursor on hover over hexagons
    map.on('mouseenter', 'hexgrid-fill', function() {
        map.getCanvas().style.cursor = 'pointer';
    });
    
    map.on('mouseleave', 'hexgrid-fill', function() {
        map.getCanvas().style.cursor = '';
    });
    
    // Add legend
    addLegend(maxCount);
}

// Add legend to the map
function addLegend(maxCount) {
    // Create legend div
    const legend = document.createElement('div');
    legend.id = 'legend';
    legend.style.position = 'absolute';
    legend.style.bottom = '20px';
    legend.style.right = '20px';
    legend.style.padding = '10px';
    legend.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    legend.style.borderRadius = '5px';
    legend.style.fontFamily = 'Arial, sans-serif';
    
    // Legend title
    const title = document.createElement('div');
    title.textContent = 'Pedestrian & Cyclist Collisions';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '5px';
    legend.appendChild(title);
    
    // Legend items (color scale)
    const intervals = [0, 1, Math.ceil(maxCount/4), Math.ceil(maxCount/2), maxCount];
    const colors = ['rgba(0, 0, 0, 0)', '#FFF5B3', '#FFD25A', '#FF9F42', '#FF5733'];
    
    for (let i = 0; i < intervals.length - 1; i++) {
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.marginBottom = '5px';
        
        const colorBox = document.createElement('div');
        colorBox.style.width = '20px';
        colorBox.style.height = '20px';
        colorBox.style.backgroundColor = colors[i + 1];
        colorBox.style.marginRight = '5px';
        
        const label = document.createElement('span');
        if (intervals[i] === intervals[i + 1]) {
            label.textContent = intervals[i];
        } else {
            label.textContent = `${intervals[i]} - ${intervals[i + 1]}`;
        }
        
        item.appendChild(colorBox);
        item.appendChild(label);
        legend.appendChild(item);
    }
    
    // Add toggle button for collision points
    const toggleContainer = document.createElement('div');
    toggleContainer.style.marginTop = '10px';
    
    const toggleLabel = document.createElement('span');
    toggleLabel.textContent = 'Show collision points: ';
    
    const toggleCheckbox = document.createElement('input');
    toggleCheckbox.type = 'checkbox';
    toggleCheckbox.checked = true;
    toggleCheckbox.addEventListener('change', function() {
        map.setLayoutProperty(
            'collision-points',
            'visibility',
            this.checked ? 'visible' : 'none'
        );
    });
    
    toggleContainer.appendChild(toggleLabel);
    toggleContainer.appendChild(toggleCheckbox);
    legend.appendChild(toggleContainer);
    
    // Add legend to map
    document.body.appendChild(legend);
}
