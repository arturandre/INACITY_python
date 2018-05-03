import imageio
import numpy as np

class StreetDTO:
    pass

class AmenityDTO:
    pass

class ImageDTO:
    def __init__(self, data: imageio.core.util.Image):
        self.data = data
        if data.dtype == 'uint8':
            self.data = np.float32(self.data)/255
        self.size = {'width': 0, 'height': 0, 'channels': 0}
        self.size['channels'] = data.ndim
        self.size['width'], self.size['height'], *_ = data.shape
    def getPNG(self):
        outdata = self.data.copy();
        if outdata.dtype != 'uint8':
            outdata = np.uint8(outdata*255)
        return imageio.imwrite(imageio.RETURN_BYTES, outdata, format='PNG-PIL');
        