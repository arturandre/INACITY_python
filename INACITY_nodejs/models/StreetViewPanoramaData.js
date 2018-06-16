﻿/**
 * StreetViewPanoramaData module contains classes used by the StreetViewPanoramaData class.
 * This class encapsulates the data obtained by the StreetViewServices API related to a
 * panorama.
 * @module StreetViewPanoramaData
 */

/**
 * Each instance of this class represents a different
 * panorama for the a same location, but created in a
 * different moment (e.g. years ago).
 */
class Time {
    /**
     * @constructor
     */
    constructor()
    {
        /** Timestamp */
        this.Af = null;
        /** Panorama id */
        this.ng = null;
    }

    /**
     * Class initializer {parameters}
     * @param {json} parameters - Constains the Af (timestamp) and ng (panorama id) properties
     */
    static fromJson(parameters)
    {
        this.Af = parameters.Af;
        this.ng = parameters.ng;
    }
}

/**
 * Each Link contains information to the panoramas directly connected to
 * the current StreetViewPanoramaData
 * @param {string} description - Simplified street address
 * @param {float} heading - Heading angle of the vehicle
 * @param {string} pano - Panorama Id
 */
class Link
{
    constructor(description = null, heading = -1, pano = null)
    {
        /** Simplified street address */
        this.description = description;
        /** Heading angle of the vehicle */
        this.heading = heading;
        /** Panorama Id */
        this.pano = pano;
    }

    /**
     * Class initializer
     * @param {json} parameters
     */
    static fromJson(parameters)
    {
        let newLink = new Link();
        newLink.description = parameters.description;
        newLink.heading = parameters.heading;
        newLink.pano = parameters.pano;
    }
}

/**
* Class representing sizes for tileSize and worldSize
* @param {string} [b="px"] - Unknow
* @param {string} [f="px"] - Unknow
* @param {int} [height=512]
* @param {int} [width=512]
*/
class gsvSize {
    constructor(b = "px", f = "px", height = 512, width = 512) {
        this.b = b;
        this.f = f;
        this.height = height;
        this.width = width;
    }

    /**
     * Class initializer
     * @param {json} parameters
     */
    static fromJson(parameters)
    {
        this.b = parameters.b;
        this.f = parameters.f;
        this.height = parameters.height;
        this.width = parameters.width;
    }
}

/**
 * Maybe this represents the data for the tiles
 * used to compose the panorama view
 * @param {float} [centerHeading=-1] - Heading (horizontal angle) of the vehicle
 * @param {float} [originHeading=-1] - Unknow (usually same as centerHeading)
 * @param {float} [originPitch=-1] - Pitch (vertical angle) of the vehicle
 * @param {gsvSize} [tileSize=null] - Maybe it's the size (in pixels) of the tile used to compose the panorama view
 * @param {gsvSize} [worldSize=null] - Unknow
 */
class Tile
{
    constructor(centerHeading = -1, originHeading = -1, originPitch = -1, tileSize = null, worldSize = null)
    {
        /** Heading (horizontal angle) of the vehicle */
        this.centerHeading = centerHeading;
        /** Unknow (usually same as centerHeading) */
        this.originHeading = originHeading;
        /** Pitch (vertical angle) of the vehicle */
        this.originPitch = originPitch;
        /** Maybe it's the size (in pixels) of the tile used to compose the panorama view */
        this.tileSize = tileSize || new gsvSize();
        /** Unknow */
        this.worldSize = worldSize || new gsvSize();
    }

    /**
     * Class initializer
     * @param {json} parameters
     */
    static fromJson(parameters)
    {
        this.centerHeading = parameters.centerHeading;
        this.originHeading = parameters.originHeading;
        this.originPitch = parameters.originPitch;
        this.tileSize = gsvSize.fromParameters(parameters.tileSize);
        this.worldSize = gsvSize.fromParameters(parameters.worldSize);
    }
}

/**
 * This class represents a location and contains
 * some description and the panorama id of this coordinate.
 */
class LatLng
{
    constructor()
    {
        /** Longitude */
        this.lon = 0;
        /** Latitude */
        this.lat = 0;
        /** Usually a simple street address */
        this.shortDescription = null;
        /** Usually a full address (including city) */
        this.description = null;
        /** Panorama Id */
        this.pano = null;

    }

    /**
     * Class initializer
     * @param {float} lon - Longitude
     * @param {float} lat - Latitude
     * @param {string} shortDescription - Usually a simple address for this coordinate
     * @param {string} description - Usually the full address including the city
     * @param {string} pano - PanoramaId as reported by the API
     * @returns A fufilled LatLng object
     */
    static fromParameters(lon, lat, shortDescription, description, pano)
    {
        this.lon = lon;
        this.lat = lat;
        this.shortDescription = shortDescription;
        this.description = description;
        this.pano = pano;
    }

    /**
     * Class initializer
     * @param {json} parameters
     * @returns A fufilled LatLng object
     */
    static fromJson(parameters)
    {
        this.lon = parameters.lon;
        this.lat = parameters.lat;
        this.shortDescription = parameters.shortDescription;
        this.description = parameters.description;
        this.pano = parameters.pano;
    }
}

/**
 * This class represents the panorama data retrieved by
 * the StreetViewService API.
 */
class StreetViewPanoramaData {
    /** @constructor */
    constructor() {
        /** LatLng object indication the position where this panorama was created */
        this.location = new LatLng();

        /** Google copyright string */
        this.copyright = null;

        /** Links array indicating connected panoramas */
        this.links = [];

        /** Tile data */
        this.tiles = {};
        /** Time array with other panoramas (from the past) for this same location */
        this.time = [];
    }

    /**
     * @access public
     * @param {LatLng} location - Object used to keep track of the coordinates
     * @param {sting} copyright - Copyright data as informed by the API
     * @param {Link[]} links - Array of panoramas connected to this one (for navigation)
     * @param {Tile} tiles - Tile data (used to compose the panorama view)
     * @param {Time} time - Others panoramas to this same location (used by Google's time machine)
     * @returns An instance fufilled of StreetViewPanoramaData
     */
    static fromParameters(location, copyright, links, tiles, time) {
        let newSVPano = new StreetViewPanoramaData();
        newSVPano.location = location;
        newSVPano.copyright = copyright;
        newSVPano.links = links;
        newSVPano.tiles = tiles;
        newSVPano.time = time;
        return newSVPano;
    }

    /**
     * @access public
     * @param {DataObject} data - Complex object returned by the StreetViewService API
     * @param {Google.LatLng} data.location - Google's LatLng object
     * @param {float} data.location.lat() - Latitude
     * @param {float} data.location.lng() - Longitude
     * @param {float} data.location.shortDescription - Simple street address
     * @param {float} data.location.description - Full street address
     * @param {float} data.location.pano - PanoramaId
     * @param {float} data.copyright - Google's copyright data
     * @param {Link[]} data.links - See [Link]{@link module:StreetViewPanoramaData~Link}
     * @param {Tile} data.tiles - See [Tile]{@link module:StreetViewPanoramaData~Tile}
     * @param {Time[]} data.time - See [Time]{@link module:StreetViewPanoramaData~Time}
     * @returns An instance fufilled of StreetViewPanoramaData
     */
    static fromStreetViewServiceData(data) {
        let gsvlocation = data.location;
        let newSVPano = new StreetViewPanoramaData();
        newSVPano.location = new LatLng.fromParameters(
            {
                lat: gsvlocation.latLng.lat(),
                lon: gsvlocation.latLng.lng(),
                shortDescription: gsvlocation.shortDescription,
                description: gsvlocation.description,
                pano: gsvlocation.pano
            });
        newSVPano.copyright = data.copyright;
        for (const link in data.links)
        { 
            newSVPano.links.push(Link.fromJson(link));
        }
        newSVPano.tiles = Tile.fromJson(data.tiles);
        newSVPano.time = data.time;
        return newSVPano;
    }
}

