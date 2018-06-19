from geojson import Polygon, FeatureCollection
from typing import List

from django_website.Primitives import *
from django_website.MapMiners import *

class MapMinerManager(object):
    __instance = None
    def __init__(self):
        self._MapMiners = {}
        for mapMinerClass in MapMiner._subclasses:
            self.registerMapMiner(mapMinerClass)

    def __new__(cls):
        if MapMinerManager.__instance is None:
            MapMinerManager.__instance = object.__new__(cls)
        return MapMinerManager.__instance

    def registerMapMiner(self, mapMiner: MapMiner):
        if not mapMiner.mapMinerId in self._MapMiners:
            self._MapMiners[mapMiner.mapMinerId] = mapMiner
        pass

    def getAvailableMapMinersAndQueries(self):
        return {mapMinerId: {'name': self._MapMiners[mapMinerId].mapMinerName, 'features': self._MapMiners[mapMinerId].getAvailableQueries()} for mapMinerId in self._MapMiners}

    def requestQueryToMapMiner(self, mapMinerId: str, query: str, region: FeatureCollection) -> List[FeatureCollection]:
        """Delegate the requested query call to the selected MapMiner"""
        return self._MapMiners[mapMinerId].doQuery(query, region)