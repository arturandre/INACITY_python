﻿/**
 * Node index.js routes module.
 * @module node/routes/index
 */

const promiseFinally = require('promise.prototype.finally');

// Add `finally()` to `Promise.prototype`
promiseFinally.shim();


var express = require('express');
var router = express.Router();

/**
* Google services component wrapper
* @const
*/
const google = require('./gsv_mykey.js').google;
/**
* StreetViewService component used to collect the panoramas
* @see StreetViewPanoramaData
* @const {google.maps.StreetViewService}
*/
const streetViewService = new google.maps.StreetViewService();
/** 
* Used to define the radius of the area, around given location, to search for a panorama. 
* @see [getPanoramaByLocation]{@link module:node/routes/index~getPanoramaByLocation}.
* @const {int} 
*/
const maxRadius = 10;

/**
 * Auxiliar function to print errors caught.
 * @param {Error} err - {message: ..., stack: ...}
 * @param {string} locationDescription - String to indicate where the exception was caught
 */
function defaultError(err, locationDescription) {
    console.error(`Error caught at ${locationDescription}.`);
    console.error(err);
}

/**
 * Return a StreetViewPanoramaData object from 
 * within a radius of [maxRadius]{@link module:node/routes/index~maxRadius} lonLatCoordinate position if available.
 * @param {JSON} lonLatCoordinate - JSON containing coordinates.
 * @param {float} lonLatCoordinate.lon - Longitude in degrees
 * @param {float} lonLatCoordinate.lat - Latitude in degrees
 */
function getPanoramaByLocation(lonLatCoordinate) {
    return new Promise(function (resolve, reject) {
        let lon = lonLatCoordinate[0];
        let lat = lonLatCoordinate[1];
        let latlng = new google.maps.LatLng(lat, lon);
        streetViewService.getPanoramaByLocation(latlng, maxRadius, function (data, status) {
            //resolve({ data: data, status: status });
            if (status === "OK") {
                let parsedData = streetViewPanoramaDataParser(data);
                resolve(parsedData);
            }
            else {
                reject(status);
            }

        });
    });
}

/**
 * Receives a [GeoJson Feature]{@link https://tools.ietf.org/html/rfc7946#section-3.2}
 * (not a FeatureCollection) and for each of its coordinates tries to find a panorama.
 * This function returns the input feature with a new property(geoImages)
 * with the same structure as the coordinates property and each value represents
 * a StreetViewPanoramaData for each coordinate. e.g.:
 * features[0].properties.geoImages[x][y][z] corresponds to the coordinate at
 * features[0].coordinates[x][y][z]
 * @param {Feature} feature - [GeoJson Feature]{@link https://tools.ietf.org/html/rfc7946#section-3.2}
 * object with one or more coordinates
 * @returns {Promise} Promise object with the input feature with a new property (geoImages).
 */
function getPanoramaForFeature(feature) {
    return new Promise(function (resolve, reject) {
        let geometryType = feature.geometry.type;

        let coordinates = feature.geometry.coordinates;
        let geoImages = feature.properties.geoImages = new Array();
        let numCalls = 0;
        if (geometryType === "MultiPolygon") {
            //Number of Polygons
            for (let i = 0; i < coordinates.length; i++) {   //Number of LineStrings/Linear Rings
                geoImages[i] = new Array(coordinates[i].length);
                for (let j = 0; j < coordinates[i].length; j++) {   //Number of coordinates [(lon, lat)]
                    let coordsLen = coordinates[i][j].length;
                    numCalls += coordsLen;
                    geoImages[i][j] = new Array(coordsLen);
                    for (let k = 0; k < coordsLen; j++) {
                        let lonLatCoordinate = coordinates[i][j];
                        setGeoImageForLonLatCoordinate(lonLatCoordinate, geoImages[i][j], k);
                    }
                }
            }
        }
        else if (
            geometryType === "MultiLineString" ||
            geometryType === "Polygon"
        ) {
            //Number of LineStrings/Linear Rings
            for (let i = 0; i < coordinates.length; i++) {   //Number of coordinates [(lon, lat)]
                let coordsLen = coordinates[i].length;
                geoImages[i] = new Array(coordsLen);
                numCalls += coordsLen;
                for (let j = 0; j < coordsLen; j++) {
                    let lonLatCoordinate = coordinates[i][j];
                    setGeoImageForLonLatCoordinate(lonLatCoordinate, geoImages[i], j);
                }
            }
        }
        else if (geometryType === "LineString" || geometryType === "MultiPoint") {
            let coordsLen = coordinates.length;
            numCalls = coordsLen;
            //Number of coordinates [(lon, lat)]
            for (let i = 0; i < coordsLen; i++) {
                x
                let lonLatCoordinate = coordinates[i];
                setGeoImageForLonLatCoordinate(lonLatCoordinate, geoImages, i);
            }
        }
        else if (geometryType === "Point") {
            numCalls = 1;
            let lonLatCoordinate = coordinates;
            setGeoImageForLonLatCoordinate(lonLatCoordinate, geoImages, 0);
        }
        else {
            console.error(`Geometry type (${geometryType}) not recognized!`);
            reject(`Geometry type (${geometryType}) not recognized!`);
        }

        /** Inner function used to avoid code duplication */
        function setGeoImageForLonLatCoordinate(lonLatCoordinate, geoImagesArray, position) {
            let p = getPanoramaByLocation(lonLatCoordinate);
            p.then(
                function (streetViewPanoramaData) {
                    geoImagesArray[position] = streetViewPanoramaData;
                },
                function (failedStatus) {
                    geoImagesArray[position] = failedStatus;
                    console.warn(`Status for coordinates(lon: ${lonLatCoordinate[0]}, lat: ${lonLatCoordinate[1]}): ${failedStatus}`);
                }
            )
                .catch(
                function (err) {
                    defaultError(err, "getPanoramaForFeature");
                    throw new Error(err);
                }
                )
                .finally(
                function () {

                    numCalls -= 1;
                    if (numCalls == 0) {
                        resolve(feature);
                    }
                }
                );

        }
    });
}
/**
 * Used to extract the properties (and ignore functions) from the
 * 'data' object returned by the StreetViewService API and create with them
 * a [StreetViewPanoramaData]{@link module:StreetViewPanoramaData~StreetViewPanoramaData} object.
 * @see [StreetViewPanoramaData]{@link module:StreetViewPanoramaData~StreetViewPanoramaData}
 * @param {DataObject} data -  A complex object returned by the StreetViewService
 * @returns {module:StreetViewPanoramaData~StreetViewPanoramaData} StreetViewPanoramaData representing a parsed version without functions of the 'data' input.
 */
function streetViewPanoramaDataParser(data) {
    //Location object example:
    //{latLng: _.K, shortDescription: "1576 R. do Lago", description: "1576 R. do Lago, São Paulo", pano: "-a6qbIWS7Op13QSWHAYzYA"}
    let gsvlocation = data.location;

    let StreetViewPanoramaData =
        {
            location:
            {
                lat: gsvlocation.latLng.lat(),
                lon: gsvlocation.latLng.lng(),
                shortDescription: gsvlocation.shortDescription,
                description: gsvlocation.description,
                pano: gsvlocation.pano
            },
            copyright: data.copyright,
            links: data.links,
            tiles: data.tiles,
            time: data.time
        };
    return StreetViewPanoramaData;
}

/**
 * This function receives a collection (array) of "Data" objects obtained
 * through the StreetViewService API and returns a collection of
 * StreetViewPanoramaData.
 * @param {StreetViewResponse[]} gsvArrayOfData - [{data: ..., status: 'OK' }]
 * @param {DataObject} StreetViewResponse.data - Data object from StreetViewService API to be converted to StreetViewPanoramaData.
 * @param {string} StreetViewResponse.status - String indicating the status of the request. Can be 'OK' for successfull requests, 'NOTFOUNT' if there's not a panorama within a radius of [maxRadius]{@link module:node/routes/index~maxRadius} from the [location] used in the request.
 */
function formatStreetViewPanoramaDataArray(gsvArrayOfData) {
    let ret = [];
    for (let coordIdx = 0; coordIdx < gsvArrayOfData.length; coordIdx++) {
        let coord = gsvArrayOfData[coordIdx];
        if (coord.status === "OK") {
            ret.push(streetViewPanoramaDataParser(coord.data));
        }
        else {
            continue;
        }
    }
    return ret;
}

/**
 * Route for collecting panoramas for [Feature]{@link https://tools.ietf.org/html/rfc7946#section-3.2} in a [FeatureCollection]{@link https://tools.ietf.org/html/rfc7946#section-3.3} or for a single [Feature]{@link https://tools.ietf.org/html/rfc7946#section-3.2} passed as JSON in the payload.
 * @name post/collectfcpanoramas
 * @function
 * @memberof module:node/routes/index
 * @inner
 * @param {Feature|FeatureColletion} GeoJson's [FeatureCollection]{@link https://tools.ietf.org/html/rfc7946#section-3.3} or [Feature]{@link https://tools.ietf.org/html/rfc7946#section-3.2}
 */
router.post('/collectfcpanoramas', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    geojson = req.body;
    if (geojson.type === 'Feature') {
        getPanoramaForFeature(geojson).then(
            function (featureAndIndex) { /* Index will be null in this case */
                let featureWithGeoImage = featureAndIndex[0];
                let jsonString = JSON.stringify(featureWithGeoImage);
                res.send(jsonString);
            }, (err) => defaultError(err, "router post /collectfcpanoramas")
        );
    }
    else if (geojson.type === 'FeatureCollection') {
        let features = geojson.features;
        let nCalls = features.length;
        for (let featureIdx = 0; featureIdx < features.length; featureIdx++) {
            getPanoramaForFeature(features[featureIdx])
                .then(
                function (_) {
                    //let featureWithGeoImage = featureAndIndex[0];
                    //let featureIdx = featureAndIndex[1];
                    //geojson[featureIdx] = featureWithGeoImage;
                    nCalls -= 1;
                    if (nCalls == 0) {
                        let jsonString = JSON.stringify(geojson);
                        res.send(jsonString);
                    }
                }, (err) => defaultError(err, "router post /collectfcpanoramas")
                );
        }
    }
    else {
        res.status(400)
        res.send("Geojson type unaccepted. Acceptable types: 'Feature', 'FeatureCollection'.");
    }
    console.log(req.body);
});

/* GET home page. */
router.get('/', function (req, res) {
    res.render('index', { title: 'Express' });
});

router.get('/gsvtest', (req, res) => res.send(google));
router.get('/gsvtest2', (req, res) => res.send(streetViewService));

router.get('/gsvtest3', function (req, res) {
    let myLatlng = new google.maps.LatLng(-23.560239, -46.731261);
    streetViewService.getPanoramaByLocation(myLatlng, 50, function (data, status) {
        let ret = "data:\n" + data + "\n Status \n" + status;
        console.log(data);
        res.send(ret);
    });
    //res.send(gsv.google.maps);
});

router.get('/findgsvpano', function (req, res) {
    var sv = new gsv.maps.StreetViewService();
    res.send(sv);
});

module.exports = router;