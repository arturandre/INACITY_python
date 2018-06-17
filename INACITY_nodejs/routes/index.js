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
* Google maps component wrapper
* @const
*/
const google = require('./gsv_mykey.js').google;
/**
* [StreetViewService]{@link https://developers.google.com/maps/documentation/javascript/streetview#StreetViewService} component used to collect the panoramas
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
function defaultError(err, locationDescription)
{
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
function getPanoramaByLocation(lonLatCoordinate)
{
	return new Promise(function (resolve, reject) {
		let lon = lonLatCoordinate[0];
        let lat = lonLatCoordinate[1];
		let latlng = new google.maps.LatLng(lat, lon);
		streetViewService.getPanoramaByLocation(latlng, maxRadius, function (data, status)
		{
			//resolve({ data: data, status: status });
			if (status === "OK")
			{
				let parsedData = streetViewPanoramaDataParser(data);
				resolve(parsedData);
			}
			else
			{
				reject(status);
			}
			
		});
	});
}

/**
 * Receives a [GeoJson Feature]{@link https://tools.ietf.org/html/rfc7946#section-3.2} (not a FeatureCollection) and for
 * each of its coordinates tries to find a panorama.
 * This function returns an array of StreetViewPanoramaData e.g.:
 * [{location: {...}, copyright: ...}]
 * @param {Feature} feature - [GeoJson Feature]{@link https://tools.ietf.org/html/rfc7946#section-3.2} object with one or more coordinates
 * @returns {Promise} Promise object representing an array of StreetViewPanoramaData.
 */
function getPanoramaForFeature(feature) {
    return new Promise(function (resolve) {

        let coordinates = feature.geometry.coordinates;
        console.log(coordinates);
        console.log("3");
        let ret = [];
		let numCalls = 1;
		if (typeof (coordinates[0]) !== "number") //Encapsulates both cases when it's zero or undefined
        {
			numCalls = coordinates.length;
			for (let i = 0; i < coordinates.length; i++) {
				let lonLatCoordinate = coordinates[i];
				getPanoramaForLonLatCoordinate(lonLatCoordinate);
			}
		}
		else
		{
			let lonLatCoordinate = coordinates;
			getPanoramaForLonLatCoordinate(lonLatCoordinate);
		}
		
		/** Inner function used to avoid code duplication */
		function getPanoramaForLonLatCoordinate(lonLatCoordinate)
		{
			let p = getPanoramaByLocation(lonLatCoordinate);
			p.then(
					function(streetViewPanoramaData)
					{
						ret.push(streetViewPanoramaData);
					},
					function(failedStatus)
					{
						console.warn(`Status for coordinates(lon: ${lonLatCoordinate[0]}, lat: ${lonLatCoordinate[1]}): ${failedStatus}`);
					}
				)
				.catch(
					function(err)
					{
						defaultError(err, "getPanoramaForFeature");
						throw new Error(err);
					}
				)
				.finally(
					function(){
					
						numCalls -= 1;
						if (numCalls == 0) {
						   resolve(ret);
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
function streetViewPanoramaDataParser(data)
{
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
 * through the [StreetViewService]{@link https://developers.google.com/maps/documentation/javascript/streetview#StreetViewService} API and returns a collection of
 * StreetViewPanoramaData.
 * @param {StreetViewResponse[]} gsvArrayOfData - [{data: ..., status: 'OK' }]
 * @param {DataObject} StreetViewResponse.data - Data object from [StreetViewService]{@link https://developers.google.com/maps/documentation/javascript/streetview#StreetViewService} API to be converted to StreetViewPanoramaData.
 * @param {string} StreetViewResponse.status - String indicating the status of the request. Can be 'OK' for successfull requests, 'NOTFOUNT' if there's not a panorama within a radius of [maxRadius]{@link module:node/routes/index~maxRadius} from the [location] used in the request.
 */
function formatStreetViewPanoramaDataArray(gsvArrayOfData)
{
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
    console.log("1");
    if (geojson.type === 'Feature') {
        console.log("2");
        getPanoramaForFeature(geojson).then(
			function (streetViewPanoramaDataArray) {
				
				console.log("6");
				let jsonString = JSON.stringify(streetViewPanoramaDataArray);
				res.send(jsonString);
			}, (err) => defaultError(err, "router post /collectfcpanoramas")
		);
    }
    else if (geojson.type === 'FeatureCollection') {
        let features = geojson.features;
        let ret = [];
        let nCalls = features.length;
        for (let fi = 0; fi < features.length; fi++) {
            let feature = features[fi];
            getPanoramaForFeature(feature)
			.then(
				function (streetViewPanoramaDataArray) 
				{
					ret.push(streetViewPanoramaDataArray);
					nCalls -= 1;
					let jsonString = JSON.stringify(ret);
					if (nCalls == 0) {
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