export interface CrimeData {
  area: string;
  zone: string;
  crimeRate: 'High' | 'Medium' | 'Low';
  history: boolean;
  peakTime: 'Day' | 'Night';
  type: string;
  crowdDay: 'High' | 'Medium' | 'Low';
  crowdNight: 'High' | 'Medium' | 'Low';
}

export interface Route {
  id: string;
  name: string;
  path: string[]; // List of area names
  safetyScore: number;
  distance: string;
  duration: string;
  riskFactors: string[];
}

export interface POI {
  id: string;
  name: string;
  type: 'Hospital' | 'Police' | 'Crowded';
  lat: number;
  lng: number;
  description?: string;
}

export const POI_DATASET: POI[] = [
  // Hospitals
  { id: 'h1', name: 'Apollo Hospitals', type: 'Hospital', lat: 17.4156, lng: 78.4147, description: '24/7 Emergency Care' },
  { id: 'h2', name: 'Care Hospitals', type: 'Hospital', lat: 17.4325, lng: 78.4070, description: 'Multi-specialty' },
  { id: 'h3', name: 'Yashoda Hospitals', type: 'Hospital', lat: 17.4399, lng: 78.4983, description: 'Emergency Services' },
  { id: 'h4', name: 'Continental Hospitals', type: 'Hospital', lat: 17.4401, lng: 78.3489, description: 'Gachibowli Area' },
  
  // Police Stations
  { id: 'p1', name: 'Banjara Hills PS', type: 'Police', lat: 17.4156, lng: 78.4347, description: 'Local Police Station' },
  { id: 'p2', name: 'Madhapur PS', type: 'Police', lat: 17.4486, lng: 78.3908, description: 'Cyberabad Police' },
  { id: 'p3', name: 'Gachibowli PS', type: 'Police', lat: 17.4401, lng: 78.3489, description: 'Local Police Station' },
  { id: 'p4', name: 'Abids PS', type: 'Police', lat: 17.3911, lng: 78.4765, description: 'Central Zone' },
  
  // Crowded Areas
  { id: 'c1', name: 'Charminar Market', type: 'Crowded', lat: 17.3616, lng: 78.4747, description: 'High Footfall Area' },
  { id: 'c2', name: 'Ameerpet Junction', type: 'Crowded', lat: 17.4375, lng: 78.4482, description: 'Busy Educational Hub' },
  { id: 'c3', name: 'Hitech City Metro', type: 'Crowded', lat: 17.4483, lng: 78.3915, description: 'IT Corridor Hub' },
  { id: 'c4', name: 'Kukatpally Housing Board', type: 'Crowded', lat: 17.4875, lng: 78.3953, description: 'Residential & Commercial' }
];

export const AREA_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "Miyapur": { lat: 17.4948, lng: 78.3489 },
  "Kukatpally": { lat: 17.4875, lng: 78.3953 },
  "Hitech City": { lat: 17.4483, lng: 78.3915 },
  "Gachibowli": { lat: 17.4401, lng: 78.3489 },
  "Kondapur": { lat: 17.4622, lng: 78.3568 },
  "Madhapur": { lat: 17.4486, lng: 78.3908 },
  "Jubilee Hills": { lat: 17.4325, lng: 78.4070 },
  "Banjara Hills": { lat: 17.4156, lng: 78.4347 },
  "Mehdipatnam": { lat: 17.3958, lng: 78.4312 },
  "Begumpet": { lat: 17.4447, lng: 78.4664 },
  "Ameerpet": { lat: 17.4375, lng: 78.4482 },
  "Somajiguda": { lat: 17.4255, lng: 78.4582 },
  "Secunderabad": { lat: 17.4399, lng: 78.4983 },
  "Nampally": { lat: 17.3920, lng: 78.4703 },
  "Abids": { lat: 17.3911, lng: 78.4765 },
  "Charminar": { lat: 17.3616, lng: 78.4747 },
  "Malakpet": { lat: 17.3755, lng: 78.4912 },
  "Dilsukhnagar": { lat: 17.3688, lng: 78.5247 },
  "LB Nagar": { lat: 17.3457, lng: 78.5522 },
  "Uppal": { lat: 17.4022, lng: 78.5601 },
  "Nagole": { lat: 17.3813, lng: 78.5651 },
  "Tolichowki": { lat: 17.3983, lng: 78.4156 },
  "Manikonda": { lat: 17.4000, lng: 78.3700 },
  "Chandanagar": { lat: 17.4900, lng: 78.3200 },
  "Kompally": { lat: 17.5400, lng: 78.4800 }
};
