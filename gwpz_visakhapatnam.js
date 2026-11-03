
var roi = ee.FeatureCollection('projects/project1-504812/assets/vizag_boundary').geometry();

Map.centerObject(roi, 10);
Map.setOptions('HYBRID');


var SCALE = 90;

var districtOutline = ee.Image().byte().paint({
  featureCollection: ee.FeatureCollection(roi),
  color: 1,
  width: 2
});
Map.addLayer(districtOutline, {palette: ['#000000']}, 'Exact District Boundary', true);


var dem = ee.Image('CGIAR/SRTM90_V4').clip(roi);
var slope = ee.Terrain.slope(dem);


var slopeScore = ee.Image(0)
  .where(slope.lt(5), 5)
  .where(slope.gte(5).and(slope.lt(10)), 4)
  .where(slope.gte(10).and(slope.lt(15)), 3)
  .where(slope.gte(15).and(slope.lt(25)), 2)
  .where(slope.gte(25), 1)
  .clip(roi)
  .rename('slope_score');



var rainfallCollection = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
  .filterBounds(roi)
  .filterDate('2023-01-01', '2023-12-31');

var annualRainfall = rainfallCollection.sum().clip(roi);

var rainfallScore = ee.Image(0)
  .where(annualRainfall.lt(600), 1)
  .where(annualRainfall.gte(600).and(annualRainfall.lt(800)), 2)
  .where(annualRainfall.gte(800).and(annualRainfall.lt(1000)), 3)
  .where(annualRainfall.gte(1000).and(annualRainfall.lt(1200)), 4)
  .where(annualRainfall.gte(1200), 5)
  .clip(roi)
  .rename('rainfall_score');



var lulc = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
  .filterBounds(roi)
  .filterDate('2023-01-01', '2023-12-31')
  .select('label')
  .mode()
  .clip(roi);

var lulcScore = ee.Image(0)
  .where(lulc.eq(0), 5) // Water bodies
  .where(lulc.eq(1), 5) // Forest / Trees
  .where(lulc.eq(2), 4) // Grassland
  .where(lulc.eq(3), 5) // Flooded Veg
  .where(lulc.eq(4), 3) // Cropland
  .where(lulc.eq(5), 3) // Shrub / Scrub
  .where(lulc.eq(6), 1) // Built-up
  .where(lulc.eq(7), 2) // Bare land
  .where(lulc.eq(8), 1) // Snow / Ice
  .clip(roi)
  .rename('lulc_score');



var soilTexture = ee.Image('OpenLandMap/SOL/SOL_TEXTURE-CLASS_USDA-TT_M/v02')
  .select('b0')
  .clip(roi);

var soilScore = ee.Image(0)
  .where(soilTexture.eq(1).or(soilTexture.eq(2)).or(soilTexture.eq(3)), 1)
  .where(soilTexture.gte(4).and(soilTexture.lte(6)), 2)
  .where(soilTexture.gte(7).and(soilTexture.lte(9)), 3)
  .where(soilTexture.eq(10), 4)
  .where(soilTexture.eq(11).or(soilTexture.eq(12)), 5)
  .unmask(3)
  .clip(roi)
  .rename('soil_score');



var meanElev = dem.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: roi,
  scale: SCALE,
  maxPixels: 1e9
}).get('elevation');

var streams = dem.lt(ee.Number(meanElev)).and(slope.lt(3));
var distanceToDrainage = streams.fastDistanceTransform().sqrt().multiply(SCALE).clip(roi);

var drainageScore = ee.Image(0)
  .where(distanceToDrainage.lt(500), 5)
  .where(distanceToDrainage.gte(500).and(distanceToDrainage.lt(1000)), 4)
  .where(distanceToDrainage.gte(1000).and(distanceToDrainage.lt(1500)), 3)
  .where(distanceToDrainage.gte(1500).and(distanceToDrainage.lt(2000)), 2)
  .where(distanceToDrainage.gte(2000), 1)
  .clip(roi)
  .rename('drainage_score');


// Define parameter weights (Sum = 1.0)
var wSlope    = 0.30;
var wRainfall = 0.20;
var wSoil     = 0.20;
var wLulc     = 0.15;
var wDrainage = 0.15;


var gwpi = slopeScore.multiply(wSlope)
  .add(rainfallScore.multiply(wRainfall))
  .add(soilScore.multiply(wSoil))
  .add(lulcScore.multiply(wLulc))
  .add(drainageScore.multiply(wDrainage))
  .clip(roi);

var gwpzBase = ee.Image(0)
  .where(gwpi.lt(1.8), 1)
  .where(gwpi.gte(1.8).and(gwpi.lt(2.6)), 2)
  .where(gwpi.gte(2.6).and(gwpi.lt(3.4)), 3)
  .where(gwpi.gte(3.4).and(gwpi.lt(4.2)), 4)
  .where(gwpi.gte(4.2), 5);


var gwpzCorrected = gwpzBase
  .where(slopeScore.lte(2), ee.Image(2).min(gwpzBase))
  .clip(roi);


var gwpzSmooth = gwpzCorrected.focal_mode({
  radius: 1, 
  kernelType: 'circle', 
  units: 'pixels'
}).clip(roi).rename('GWPZ');



var gwpzPalette = ['#d7191c', '#fdae61', '#ffffbf', '#a6d96a', '#1a9641'];

Map.addLayer(gwpzSmooth, {min: 1, max: 5, palette: gwpzPalette}, 'Corrected & Smoothed GWPZ');

var legend = ui.Panel({
  style: { position: 'bottom-right', padding: '8px 15px' }
});

var legendTitle = ui.Label({
  value: 'Visakhapatnam GWPZ (Corrected)',
  style: {fontWeight: 'bold', fontSize: '14px', margin: '0 0 6px 0'}
});
legend.add(legendTitle);

var classes = ['Very Low Potential', 'Low Potential', 'Moderate Potential', 'High Potential', 'Very High Potential'];
for (var i = 0; i < 5; i++) {
  var colorBox = ui.Label({
    style: { backgroundColor: gwpzPalette[i], padding: '8px', margin: '0 0 4px 0' }
  });
  var description = ui.Label({
    value: classes[i],
    style: {margin: '0 0 0 6px'}
  });
  legend.add(ui.Panel({widgets: [colorBox, description], layout: ui.Panel.Layout.Flow('horizontal')}));
}
Map.add(legend);


Export.image.toDrive({
  image: gwpzSmooth,
  description: 'Visakhapatnam_GWPZ_Hydrologically_Corrected',
  folder: 'GEE_Groundwater_Project',
  scale: SCALE,
  region: roi,
  maxPixels: 1e9,
  fileFormat: 'GeoTIFF'
});

print('Hydrologically corrected pipeline execution complete!');
