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
    fetch('https://raw.githubusercontent.com/GGR472_Lab4/82eb00a2b1032966281527eb82c443a0012a7ef5/data/pedcyc_collision_06-21.geojson')
        .then(response => response.json())
        .then(data => {
            collisionData = data;
            console.log('Collision data loaded:', collisionData);

            // Add collision points as a source
            map.addSource('collisions', {
                type: 'geojson',
                data: collisionData
            });

            // Add point layer
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

            // Create hexgrid
            createHexGrid();
        });
});

/*--------------------------------------------------------------------
Step 3: CREATE BOUNDING BOX AND HEXGRID
--------------------------------------------------------------------*/

function createHexGrid() {
    const points = turf.featureCollection(collisionData.features);
    let bbox = turf.bbox(points);

    // Change for coverage
    const bufferDegrees = 0.05;
    bbox = [
        bbox[0] - bufferDegrees,
        bbox[1] - bufferDegrees,
        bbox[2] + bufferDegrees,
        bbox[3] + bufferDegrees
    ];

    console.log('Extended bounding box:', bbox);

    // Create hexgrid with Turf.js
    hexGrid = turf.hexGrid(bbox, 0.5, { units: 'kilometers' });
    console.log('Hexgrid created:', hexGrid);

    // Aggregate collision data into hexgrid
    aggregateCollisions();
}

/*--------------------------------------------------------------------
Step 4: AGGREGATE COLLISIONS BY HEXGRID
--------------------------------------------------------------------*/

function aggregateCollisions() {
    // Collect collision points into hexgrid
    const collectedPoints = turf.collect(hexGrid, collisionData, 'OBJECTID', 'collisions');

    collectedPoints.features.forEach(feature => {
        feature.properties.COUNT = feature.properties.collisions.length;
    });

    const counts = collectedPoints.features.map(f => f.properties.COUNT);
    const maxCount = Math.max(...counts);
    console.log('Maximum collisions in a hexagon:', maxCount);

    addHexGridToMap(collectedPoints, maxCount);
}

/*--------------------------------------------------------------------
Step 5: FINALIZE YOUR WEB MAP
--------------------------------------------------------------------*/

function addHexGridToMap(hexgrid, maxCount) {
    // Add hexgrid source
    map.addSource('hexgrid', {
        type: 'geojson',
        data: hexgrid
    });

    // Add hexgrid layer
    map.addLayer({
        id: 'hexgrid-fill',
        type: 'fill',
        source: 'hexgrid',
        paint: {
            'fill-color': [
                'interpolate',
                ['linear'],
                ['get', 'COUNT'],
                0, 'rgba(0, 0, 0, 0)',
                1, '#FFF5B3',
                Math.ceil(maxCount / 4), '#FFD25A',
                Math.ceil(maxCount / 2), '#FF9F42',
                maxCount, '#FF5733'
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
}