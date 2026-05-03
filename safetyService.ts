import { CrimeData, Route } from '../types';

export const CRIME_DATASET: CrimeData[] = [
  { area: "Chandanagar", zone: "North Zone", crimeRate: "Low", history: false, peakTime: "Night", type: "Pickpocketing", crowdDay: "Medium", crowdNight: "Low" },
  { area: "Begumpet", zone: "Rachakonda", crimeRate: "Medium", history: true, peakTime: "Night", type: "Cybercrime", crowdDay: "Medium", crowdNight: "Medium" },
  { area: "Uppal", zone: "Cyberabad", crimeRate: "Low", history: false, peakTime: "Day", type: "Assault", crowdDay: "Medium", crowdNight: "Medium" },
  { area: "Kompally", zone: "Central Zone", crimeRate: "Low", history: true, peakTime: "Night", type: "Assault", crowdDay: "Medium", crowdNight: "High" },
  { area: "Secunderabad", zone: "West Zone", crimeRate: "Medium", history: false, peakTime: "Day", type: "Robbery", crowdDay: "Medium", crowdNight: "High" },
  { area: "Miyapur", zone: "Cyberabad", crimeRate: "Low", history: false, peakTime: "Night", type: "Pickpocketing", crowdDay: "High", crowdNight: "Medium" },
  { area: "Hitech City", zone: "Rachakonda", crimeRate: "High", history: true, peakTime: "Night", type: "Assault", crowdDay: "Medium", crowdNight: "High" },
  { area: "Kukatpally", zone: "Rachakonda", crimeRate: "High", history: true, peakTime: "Night", type: "Snatching", crowdDay: "High", crowdNight: "High" },
  { area: "Gachibowli", zone: "North Zone", crimeRate: "High", history: true, peakTime: "Night", type: "Pickpocketing", crowdDay: "Medium", crowdNight: "Low" },
  { area: "Abids", zone: "Cyberabad", crimeRate: "Low", history: true, peakTime: "Night", type: "Robbery", crowdDay: "Low", crowdNight: "Medium" },
  { area: "Dilsukhnagar", zone: "Cyberabad", crimeRate: "Medium", history: true, peakTime: "Night", type: "Snatching", crowdDay: "High", crowdNight: "Low" },
  { area: "Manikonda", zone: "Cyberabad", crimeRate: "High", history: false, peakTime: "Night", type: "Pickpocketing", crowdDay: "Low", crowdNight: "High" },
  { area: "LB Nagar", zone: "North Zone", crimeRate: "Medium", history: true, peakTime: "Day", type: "Assault", crowdDay: "Low", crowdNight: "Medium" },
  { area: "Tolichowki", zone: "West Zone", crimeRate: "High", history: false, peakTime: "Day", type: "Snatching", crowdDay: "Medium", crowdNight: "High" },
  { area: "Madhapur", zone: "Cyberabad", crimeRate: "Medium", history: true, peakTime: "Day", type: "Robbery", crowdDay: "High", crowdNight: "High" },
  { area: "Banjara Hills", zone: "Rachakonda", crimeRate: "Medium", history: true, peakTime: "Night", type: "Snatching", crowdDay: "Medium", crowdNight: "Medium" },
  { area: "Nagole", zone: "South Zone", crimeRate: "Low", history: false, peakTime: "Day", type: "Robbery", crowdDay: "Low", crowdNight: "Low" },
  { area: "Charminar", zone: "North Zone", crimeRate: "High", history: false, peakTime: "Night", type: "Snatching", crowdDay: "Low", crowdNight: "Low" },
  { area: "Ameerpet", zone: "South Zone", crimeRate: "Low", history: false, peakTime: "Night", type: "Assault", crowdDay: "Medium", crowdNight: "Medium" },
  { area: "Malakpet", zone: "South Zone", crimeRate: "Low", history: false, peakTime: "Day", type: "Cybercrime", crowdDay: "High", crowdNight: "Low" },
  { area: "Mehdipatnam", zone: "West Zone", crimeRate: "Medium", history: false, peakTime: "Day", type: "Assault", crowdDay: "High", crowdNight: "Low" },
  { area: "Kondapur", zone: "Cyberabad", crimeRate: "Medium", history: false, peakTime: "Night", type: "Assault", crowdDay: "Medium", crowdNight: "Low" },
  { area: "Nampally", zone: "Central Zone", crimeRate: "Low", history: true, peakTime: "Night", type: "Cybercrime", crowdDay: "High", crowdNight: "Medium" },
  { area: "Somajiguda", zone: "Rachakonda", crimeRate: "Low", history: true, peakTime: "Day", type: "Assault", crowdDay: "Medium", crowdNight: "Medium" },
  { area: "Jubilee Hills", zone: "Rachakonda", crimeRate: "Medium", history: false, peakTime: "Day", type: "Snatching", crowdDay: "Low", crowdNight: "Low" }
];

export function calculateSafetyScore(areaName: string, time: 'Day' | 'Night'): number {
  const data = CRIME_DATASET.find(d => d.area === areaName);
  if (!data) return 50;

  let score = 100;

  // Crime Rate Impact
  if (data.crimeRate === 'High') score -= 40;
  else if (data.crimeRate === 'Medium') score -= 20;

  // History Impact
  if (data.history) score -= 10;

  // Crowd Impact (More crowd = safer for street crime, but maybe more pickpocketing)
  const crowd = time === 'Day' ? data.crowdDay : data.crowdNight;
  if (crowd === 'High') score += 10;
  else if (crowd === 'Low') score -= 10;

  // Peak Time Impact
  if (data.peakTime === time) score -= 15;

  return Math.max(0, Math.min(100, score));
}

export function getRecommendedRoutes(start: string, end: string, time: 'Day' | 'Night'): Route[] {
  // Mock route generation
  const areas = CRIME_DATASET.map(d => d.area);
  const intermediateOptions = areas.filter(a => a !== start && a !== end);

  const generateRoute = (id: number, name: string): Route => {
    // Pick 1-2 random intermediate points
    const intermediateCount = Math.floor(Math.random() * 2) + 1;
    const path = [start];
    for (let i = 0; i < intermediateCount; i++) {
      const randomArea = intermediateOptions[Math.floor(Math.random() * intermediateOptions.length)];
      if (!path.includes(randomArea)) path.push(randomArea);
    }
    path.push(end);

    // Calculate average safety score
    const scores = path.map(p => calculateSafetyScore(p, time));
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    // Identify risk factors
    const riskFactors: string[] = [];
    path.forEach(p => {
      const d = CRIME_DATASET.find(cd => cd.area === p);
      if (d && d.crimeRate === 'High') riskFactors.push(`High crime rate in ${p}`);
      if (d && d.peakTime === time) riskFactors.push(`Peak crime time in ${p}`);
    });

    return {
      id: `route-${id}`,
      name,
      path,
      safetyScore: avgScore,
      distance: `${(Math.random() * 10 + 2).toFixed(1)} km`,
      duration: `${Math.floor(Math.random() * 30 + 10)} mins`,
      riskFactors: Array.from(new Set(riskFactors)).slice(0, 3)
    };
  };

  return [
    generateRoute(1, "Fastest Route"),
    generateRoute(2, "Safest Route"),
    generateRoute(3, "Crowded Route")
  ].sort((a, b) => b.safetyScore - a.safetyScore);
}
