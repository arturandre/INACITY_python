from django_website.ImageMiners.ImageMiner import ImageMiner
from geojson import FeatureCollection
from typing import List
from django_website.Primitives.Primitives import ImageDTO

class ImageMinerManager(object):
    """Mediator class instantiated as a singleton responsible for managing all the image platforms adaptors implemented"""
    __instance = None
    def __init__(self):
        self._ImageMiners = {}
        for imageMinerClass in ImageMiner._subclasses:
            self.registerImageMiner(imageMinerClass)

    def __new__(cls):
        if ImageMinerManager.__instance is None:
            ImageMinerManager.__instance = object.__new__(cls)
        return ImageMinerManager.__instance

    def registerImageMiner(self, miner: ImageMiner):
        if miner.imageMinerName in self._ImageMiners:
          pass
        self._ImageMiners[miner.imageMinerName] = miner

    @property
    def ImageMiners(self):
        return self._ImageMiners

    def getImageForFeatureCollection(self, imageMinerName, featureCollection: FeatureCollection)->List[ImageDTO]:
        return self._ImageMiners[imageMinerName].getImageForFeatureCollection(featureCollection)