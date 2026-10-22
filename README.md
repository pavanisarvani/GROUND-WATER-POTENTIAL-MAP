# GROUND-WATER-POTENTIAL-MAP
HYDROLOGICALLY CORRECTED GROUNDWATER POTENTIAL ZONE MAP
 
 Overview
This repository contains a Google Earth Engine (GEE) script for mapping Groundwater Potential Zones (GWPZ) using **Multi-Criteria Decision Analysis (MCDA) combined with hydrological constraints and spatial smoothing. 

The target area for this model is the Visakhapatnam District, Andhra Pradesh, India. The pipeline resolves classic remote-sensing paradoxes—such as steep mountainous regions with dense forests incorrectly appearing as high groundwater potential zones.



 Thematic Layers & Criteria Weights
The model integrates five key environmental parameters using a weighted linear combination method (Total Weight = 1.0):

1. Slope (0.30) – Derived from the CGIAR SRTM 90m DEM. Flatter regions receive higher infiltration scores.
2. Annual Rainfall (0.20) – Extracted from CHIRPS Daily Reanalysis data.
3. Soil Texture (0.20) – Based on OpenLandMap USDA soil classes.
4. Land Use / Land Cover (0.15) – Processed using Google Dynamic World (mode for 2023).
5. Distance to Drainage (0.15) – Calculated using spatial distance transforms from stream networks.


## Key Features & Methodologies
Hydrological Masking / Paradox Correction: Caps the maximum potential score of steep slopes (>15degree) to prevent false positives in high-altitude forest/mountain areas.
Spatial Smoothing: Utilizes a focal mode filter (focal_mode) to eliminate the "salt-and-pepper" noise effect and create contiguous, cartographically clean management zones.
Custom Visualization: Includes an automated HTML-style legend UI panel and standard RdYlGn (Red-Yellow-Green) color palettes.



 How to Run
1. Open the [Google Earth Engine Code Editor](https://code.earthengine.google.com/).
2. Create a new script and paste the GEE code.
3. Replace the region of interest asset ID with your own district boundary asset: javascript
   var roi = ee.FeatureCollection('your_project_id/assets/your_district_boundary').geometry();
