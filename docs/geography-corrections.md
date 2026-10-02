# Geography data corrections

Reviewed 2026-10-02. Every Geo game imports the corrected shared country dataset.

- Sri Lanka: removed the erroneous India land-border entry in the imported country snapshot. The Palk Strait separates the countries; sea connections are not land borders.
- ISO numeric map identifiers: three-digit codes and numeric codes now resolve consistently (for example `004` and `4` both identify Afghanistan).
- Pretoria, South Africa: the bundled capital record used Bloemfontein's location. Updated to latitude -25.74486, longitude 28.18783, from [GeoNames Pretoria](https://www.geonames.org/964137/pretoria.html).
- Dodoma, Tanzania: the bundled capital record used Dar es Salaam's location. Updated to latitude -6.1722143, longitude 35.7394695, from [GeoNames Dodoma](https://www.geonames.org/160196/dodoma.html).

Capital coordinates represent city-center points, not administrative boundaries. Country Radar explicitly uses approximate representative country coordinates, not distance to a border. Countries/territories outside the 196-country playable universe remain recorded in the source borders but are not offered as playable answers.
