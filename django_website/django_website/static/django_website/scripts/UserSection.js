﻿/**
 * UserSection module contains classes used by the UserSection class to keep
 * track of the application state, as the user interacts with it.
 * @module UserSection
 */


/**
 * Each layer is named after a MapMiner and a Feature
 * concatenated by an underscore.
 * Each layer contains a collection of regions 
 * named 'regions' and a list of features called featureCollection
 * with all the features collapsed into a single list.
 * Layer keeps track of vector features (e.g. Points, Lines, Polygons, ...)
 * related with some Map Miner (e.g OSM) and Geographic Feature Type (e.g. Street)
 */
class Layer
{

    /**
     * @constructor
     * @param {string} id - The id is represented by the Map Miner concatenated with the Geographic Feature Type by an underscore (e.g. OSMMiner_Streets).
     */
    constructor(id)
    {
        this._id = id;
        this._featureCollection = null;
        this._active = false;

        /** @event */
        /** Triggered when a new set of features is assined to the [featureCollection]{@link module:UserSection~Layer#featureCollection} member. */
        this.onfeaturecollectionchange = null;
        /** @event */
        /** Triggered when the [active]{@link module:UserSection~Layer#active} property changes (It wont trigger if the assined value is the current value). */
        this.onactivechange = null;
    }
    /** @acess public */
    /** The active property controls wheter the features should or not be rendered */
    get active() { return this._active; }

    /** 
     * Represented by the Map Miner concatenated with the Geographic Feature Type by an underscore (e.g. OSMMiner_Streets).
     */
    get id() { return this._id; }

    /** 
     * Represents all the geographical features (e.g. Streets) in this layer
     */
    get featureCollection() { return this._featureCollection; }


    set active(newActiveState) {
        let triggered = (newActiveState !== this._active);
        this._active = newActiveState;
        if (triggered && this.onactivechange) this.onactivechange();
    }
    set featureCollection(newFeatureCollection)
    {
        let triggered = (this._featureCollection !== newFeatureCollection);
        
        // Keep state
        let activeState = this._featureCollection ? this._featureCollection.drawed : undefined;

        this._featureCollection = newFeatureCollection;

        // Restore state
        this._featureCollection.drawed = activeState;


        if (triggered)
        {
            if (this.onfeaturecollectionchange)
            {
                this.onfeaturecollectionchange(this);
            }
        }
    }
}

/**
* A region defines boundaries for regions of interest 
* and keeps track of geographical features collected for it.
* @param {string} id - Region identifier.
* @param {string} name - Region display name.
* @param {boolean} active - Represents if the region is in user's current selection or not.
*/
class Region
{
    constructor(id, name, active)
    {
        active = typeof (active) === 'undefined' ? false : active;
        this._id = id;
        this._name = name;

        /** 
         * Triggered when "active" property's value changes.
         * @event
         * @type {Region}
         * @property {boolean} active - Indicates if this region is active or not.
         * @property {string} id - Indicates the id of the region [de]activated.
         * @property {string} name - Indicates the display name of this region.
         */
        this.onactivechange = null;

        /** 
        *  Triggered when a new [Layer]{@link module:UserSection~Layer} is created (through [createLayer]{@link module:UserSection~Region#createLayer}) in this region
        * @event
        * @type {Layer}
        */
        this.onaddlayer = null;
        
        this._layers = {};
        
        this.active = active;
    }
    /** Creates a new Layer with the specified id
    * @param {string} id - Layer's identifier 
    * @fires [onaddlayer]{@link module:UserSection~Region#onaddlayer}
    */
    createLayer(id)
    {
        if (!(id in this._layers))
        {
            let newLayer = new Layer(id);
            this._layers[id] = newLayer;
            if (this.onaddlayer) { this.onaddlayer(newLayer); }
            return newLayer;
        }
        else
        {
            throw Error(`id: '${id}' already present in layers list!`);
        }
    }

    /** [De]activate a region for displaying or colleting geographical features. 
     * @fires [onactivechange]{@link module:UserSection~Region#onactivechange}
     */
    toggleActive()
    {
        this.active = !this.active;
        return this.active;
    }

    /** 
     * Getter for id 
     * @type {string}
     */
    get id() { return this._id; }
    /** 
     * Getter for name
     * @type {string}
     */
    get name() { return this._name; }

    
    get layers() { return this._layers; }
    getLayerById(id) { return this._layers[id]; }

    get active() { return this._active; }

    /**
     * @type {boolean}
     * @fires [onactivechange]{@link module:UserSection~Region#onactivechange}
     */
    set active(newState)
    {
        if (typeof (newState) !== "boolean")
            throw Error(`newState parameter type should be boolean, but is: ${typeof (newState)}`);
        let triggerActiveChange = this._active !== newState;
        this._active = newState;
        if (this.onactivechange)
        {
            this.onactivechange(this);
        }
    }
}

/**
* Keeps track of several user inputs
*/
class UserSection
{
    constructor(regionsDivId)
    {
        this.setTarget(regionsDivId);

        /** Events Region */

        /*
        *  Syntax: onregionlistitemclick = function (region)
        *  Triggered by a mouse click event in the user interface
        */
        this.onregionlistitemclick = null;

        /** 
        *  Feature collections with Polygons 
        *  representing regions of interest
        */
        this._regions = {};

        /** 
        *  An index of all features from all regions grouped by layerId
        */
        this._featuresByLayerIndex = {};
    }

    get featuresByLayerIndex() { return this._featuresByLayerIndex; }

    /**
     * Check into the "featuresByLayerIndex" dictionary if these particular 
     * layer and feature belongs to an active region
     * @param layerId - The id of the layer
     * @param featureId - The (numerical) id of the feature
     */
    isFeatureActive(layerId, featureId)
    {
        for (let regionIdx in this.featuresByLayerIndex[layerId][featureId].regions)
        {
            let regionId = this.featuresByLayerIndex[layerId][featureId].regions[regionIdx];
            if (this.regions[regionId].active) return true;
        }
        return false;
    }

    setTarget(regionsDivId)
    {
        this._target = $(`#${regionsDivId}`);
        this._target.addClass('list-group');
    }

    updateRegionsDiv()
    {
        this._target.empty();

        for (let regionIdx in this._regions)
        {
            let region = this._regions[regionIdx];

            let item = $(document.createElement('a'));
            item.addClass('list-group-item');
            item.addClass('list-group-item-action');
            item.addClass('active-list-item');
            item.append(region.name);
            item.on("click", region, this._regionListItemClickHandler.bind(this));
            if (region.active)
                item.addClass('active');
            else
                regionVectorSource.getFeatureById(region.id).setStyle(null);
            this._target.append(item);
        }

    }

    _regionListItemClickHandler(event)
    {
        let element = $(event.target);
        element.toggleClass("active");
        let region = event.data;
        region.toggleActive();
        if (this.onregionlistitemclick)
        {
            this.onregionlistitemclick(region);
        }

    }

    createRegion(id, name, active)
    {
        //active default is false
        if (!(id in this._regions))
        {
            let newRegion = new Region(id, name, active);
            this._regions[id] = newRegion;
            newRegion.onaddlayer = function (layer)
            {
                layer.onfeaturecollectionchange = function (layer)
                {
                    this.updateFeatureIndex(layer.id);
                }.bind(this); /** UserSection */
            }.bind(this); /** UserSection */
            this.updateRegionsDiv();
            return newRegion;
        }
        else
        {
            throw Error(`id: '${id}' already present in regions list!`);
        }
    }

    removeRegion(id)
    {
        if ((id in this._regions))
        {
            return delete this._regions[id];
        }
        else
        {
            throw Error(`id: '${id}' not found in regions list!`);
        }
    }

    get regions() { return this._regions; }

    getRegionById(regionId) { return this._regions[regionId]; }

    updateFeatureIndex(layerId)
    {
        for (let regionIdx in this.regions)
        {
            let region = this.regions[regionIdx];
            let layer = region.layers[layerId];
            if (!layer) continue;
            let flIndex = this._featuresByLayerIndex[layerId];
            if (!flIndex) flIndex = this._featuresByLayerIndex[layerId] = {};
            for (let featureIdx in layer.featureCollection.features)
            {
                let feature = layer.featureCollection.features[featureIdx];
                if (!flIndex[feature.id]) flIndex[feature.id] =
                    {
                        'feature': feature,
                        'regions': [regionIdx]
                    };
                else
                {
                    //Update the feature in flIndex only if the new feature has more coordinates
                    if (flIndex[feature.id].feature.geometry.coordinates.length < feature.geometry.coordinates.length)
                    {
                        flIndex[feature.id].feature = feature;
                    }
                    //If this feature appears in different regions then keep track of the regions where it appears
                    if (flIndex[feature.id].regions.indexOf(regionIdx) === -1)
                    {
                        flIndex[feature.id].regions.push(regionIdx);
                    }
                }
            }


        }

    }
}