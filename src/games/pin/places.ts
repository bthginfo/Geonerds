export interface Place {
  en: string;
  de: string;
  lat: number;
  lng: number;
}

/** Famous cities and landmarks for Pin the Place (coords as [lat, lng]). */
export const PLACES: Place[] = [
  // Cities
  { en: "New York City", de: "New York", lat: 40.71, lng: -74.01 },
  { en: "Los Angeles", de: "Los Angeles", lat: 34.05, lng: -118.24 },
  { en: "Toronto", de: "Toronto", lat: 43.65, lng: -79.38 },
  { en: "Mexico City", de: "Mexiko-Stadt", lat: 19.43, lng: -99.13 },
  { en: "Rio de Janeiro", de: "Rio de Janeiro", lat: -22.91, lng: -43.17 },
  { en: "Buenos Aires", de: "Buenos Aires", lat: -34.6, lng: -58.38 },
  { en: "Lima", de: "Lima", lat: -12.05, lng: -77.04 },
  { en: "London", de: "London", lat: 51.51, lng: -0.13 },
  { en: "Paris", de: "Paris", lat: 48.85, lng: 2.35 },
  { en: "Berlin", de: "Berlin", lat: 52.52, lng: 13.41 },
  { en: "Madrid", de: "Madrid", lat: 40.42, lng: -3.7 },
  { en: "Rome", de: "Rom", lat: 41.9, lng: 12.5 },
  { en: "Istanbul", de: "Istanbul", lat: 41.01, lng: 28.98 },
  { en: "Moscow", de: "Moskau", lat: 55.76, lng: 37.62 },
  { en: "Cairo", de: "Kairo", lat: 30.04, lng: 31.24 },
  { en: "Lagos", de: "Lagos", lat: 6.52, lng: 3.38 },
  { en: "Cape Town", de: "Kapstadt", lat: -33.92, lng: 18.42 },
  { en: "Nairobi", de: "Nairobi", lat: -1.29, lng: 36.82 },
  { en: "Dubai", de: "Dubai", lat: 25.2, lng: 55.27 },
  { en: "Mumbai", de: "Mumbai", lat: 19.08, lng: 72.88 },
  { en: "Bangkok", de: "Bangkok", lat: 13.76, lng: 100.5 },
  { en: "Singapore", de: "Singapur", lat: 1.35, lng: 103.82 },
  { en: "Hong Kong", de: "Hongkong", lat: 22.32, lng: 114.17 },
  { en: "Shanghai", de: "Shanghai", lat: 31.23, lng: 121.47 },
  { en: "Beijing", de: "Peking", lat: 39.9, lng: 116.4 },
  { en: "Tokyo", de: "Tokio", lat: 35.68, lng: 139.69 },
  { en: "Seoul", de: "Seoul", lat: 37.57, lng: 126.98 },
  { en: "Sydney", de: "Sydney", lat: -33.87, lng: 151.21 },
  { en: "Jakarta", de: "Jakarta", lat: -6.21, lng: 106.85 },
  // Landmarks & natural features
  { en: "Mount Everest", de: "Mount Everest", lat: 27.99, lng: 86.93 },
  { en: "Mount Kilimanjaro", de: "Kilimandscharo", lat: -3.07, lng: 37.35 },
  { en: "Mount Fuji", de: "Fuji", lat: 35.36, lng: 138.73 },
  { en: "Sahara Desert", de: "Sahara", lat: 23.42, lng: 25.66 },
  { en: "Gobi Desert", de: "Wüste Gobi", lat: 42.5, lng: 103.0 },
  { en: "Amazon Rainforest", de: "Amazonas-Regenwald", lat: -3.47, lng: -62.22 },
  { en: "Grand Canyon", de: "Grand Canyon", lat: 36.1, lng: -112.11 },
  { en: "Niagara Falls", de: "Niagarafälle", lat: 43.1, lng: -79.04 },
  { en: "Victoria Falls", de: "Victoriafälle", lat: -17.92, lng: 25.86 },
  { en: "Great Barrier Reef", de: "Great Barrier Reef", lat: -18.29, lng: 147.7 },
  { en: "Uluru (Ayers Rock)", de: "Uluru (Ayers Rock)", lat: -25.34, lng: 131.04 },
  { en: "Machu Picchu", de: "Machu Picchu", lat: -13.16, lng: -72.55 },
  { en: "Pyramids of Giza", de: "Pyramiden von Gizeh", lat: 29.98, lng: 31.13 },
  { en: "Great Wall of China", de: "Chinesische Mauer", lat: 40.36, lng: 116.02 },
  { en: "Taj Mahal", de: "Taj Mahal", lat: 27.17, lng: 78.04 },
  { en: "Angkor Wat", de: "Angkor Wat", lat: 13.41, lng: 103.87 },
  { en: "Petra", de: "Petra", lat: 30.33, lng: 35.44 },
  { en: "Stonehenge", de: "Stonehenge", lat: 51.18, lng: -1.83 },
  { en: "Dead Sea", de: "Totes Meer", lat: 31.56, lng: 35.47 },
  { en: "Lake Baikal", de: "Baikalsee", lat: 53.5, lng: 108.0 },
  { en: "Galápagos Islands", de: "Galápagos-Inseln", lat: -0.95, lng: -90.97 },
  { en: "North Pole", de: "Nordpol", lat: 89.9, lng: 0 },
  { en: "South Pole", de: "Südpol", lat: -89.9, lng: 0 },
];
