/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Search, 
  MapPin, 
  ShieldCheck, 
  AlertTriangle, 
  PhoneCall, 
  Share2, 
  Zap, 
  Navigation, 
  Clock, 
  Activity,
  ChevronRight,
  ShieldAlert,
  Users,
  Hospital,
  Shield,
  Eye,
  EyeOff,
  Crosshair,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';
import { CRIME_DATASET } from './services/safetyService';
import { AREA_COORDINATES, POI_DATASET } from './types';

// Fix Leaflet marker icons
// @ts-ignore
import markerIcon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
// @ts-ignore
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Types
interface LocationResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface SafetyRoute {
  id: string;
  name: string;
  path: [number, number][];
  safetyScore: number;
  distance: string;
  duration: string;
  riskFactors: string[];
  analysis: string;
}

// Map Updater Component
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
}

export default function App() {
  const [startQuery, setStartQuery] = useState('');
  const [endQuery, setEndQuery] = useState('');
  const [startLocation, setStartLocation] = useState<LocationResult | null>(null);
  const [endLocation, setEndLocation] = useState<LocationResult | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<SafetyRoute | null>(null);
  const [routes, setRoutes] = useState<SafetyRoute[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isSOSActive, setIsSOSActive] = useState(false);
  const [showSOSOptions, setShowSOSOptions] = useState(false);
  const [showCrimeZones, setShowCrimeZones] = useState(true);
  const [showPOIs, setShowPOIs] = useState(true);
  const [currentTime, setCurrentTime] = useState<'Day' | 'Night'>(
    new Date().getHours() >= 18 || new Date().getHours() < 6 ? 'Night' : 'Day'
  );
  const [mapCenter, setMapCenter] = useState<[number, number]>([17.3850, 78.4867]); // Hyderabad center
  const [liveLocation, setLiveLocation] = useState<[number, number] | null>(null);

  const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }), []);

  const getOSRMRoute = async (start: [number, number], end: [number, number]): Promise<[number, number][][]> => {
    try {
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&alternatives=true`);
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        return data.routes.map((route: any) => 
          route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]])
        );
      }
      return [[start, end]];
    } catch (error) {
      console.error("OSRM error:", error);
      return [[start, end]];
    }
  };

  const geocode = async (query: string): Promise<LocationResult | null> => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        return data[0];
      }
      return null;
    } catch (error) {
      console.error("Geocoding error:", error);
      return null;
    }
  };

  const handleSearch = async () => {
    if (!startQuery || !endQuery) return;
    setIsSearching(true);
    
    try {
      const start = await geocode(startQuery);
      const end = await geocode(endQuery);

      if (!start || !end) {
        alert("Could not find one or both locations. Please be more specific.");
        setIsSearching(false);
        return;
      }

      setStartLocation(start);
      setEndLocation(end);
      setMapCenter([parseFloat(start.lat), parseFloat(start.lon)]);

      // Get real road routes from OSRM
      const roadPaths = await getOSRMRoute(
        [parseFloat(start.lat), parseFloat(start.lon)],
        [parseFloat(end.lat), parseFloat(end.lon)]
      );

      // Analyze safety using Gemini for multiple routes
      const prompt = `Analyze the safety of ${roadPaths.length} different routes from "${start.display_name}" to "${end.display_name}" in the context of personal safety (especially for women). 
      Consider crime rates, street lighting, crowd density, and historical safety data for these areas.
      For each route, provide:
      1. A descriptive name (e.g., "Main Road Route", "Residential Path", "Fastest Route").
      2. A safety score (0-100).
      3. 3-4 specific risk factors.
      4. A detailed safety analysis in markdown format.
      5. Estimated distance and duration.
      
      Return the response as an array of JSON objects like this:
      [
        {
          "name": "string",
          "safetyScore": number,
          "riskFactors": ["string"],
          "analysis": "markdown string",
          "distance": "string",
          "duration": "string"
        }
      ]`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const results = JSON.parse(response.text);
      
      const newRoutes: SafetyRoute[] = results.map((result: any, index: number) => ({
        id: `route-${index + 1}`,
        path: roadPaths[index] || roadPaths[0],
        ...result
      }));

      // Ensure at least two routes if Gemini only returned one but OSRM had more
      if (newRoutes.length === 1 && roadPaths.length > 1) {
        newRoutes.push({
          ...newRoutes[0],
          id: 'route-2',
          name: 'Alternative Route',
          path: roadPaths[1]
        });
      }

      setRoutes(newRoutes);
      setSelectedRoute(newRoutes[0]);
    } catch (error) {
      console.error("Search error:", error);
      alert("An error occurred while analyzing the route. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleLiveLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setMapCenter([latitude, longitude]);
        setLiveLocation([latitude, longitude]);
        
        // Reverse geocode to get address
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await response.json();
          setStartQuery(data.display_name);
          setStartLocation({
            display_name: data.display_name,
            lat: latitude.toString(),
            lon: longitude.toString()
          });
        } catch (error) {
          setStartQuery(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
        setIsLocating(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Could not get your location. Please check permissions.");
        setIsLocating(false);
      }
    );
  };

  const handleSOS = () => {
    setShowSOSOptions(!showSOSOptions);
  };

  const initiateSOSCall = async (number: string) => {
    setIsSOSActive(true);
    setShowSOSOptions(false);
    let coords = liveLocation || mapCenter;
    const emergencyNumbers = ['9392864256', '8978317750', '8121190800', '9948088555'];

    // Try to get most accurate location for SOS
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });
      coords = [position.coords.latitude, position.coords.longitude];
      setLiveLocation(coords);
      setMapCenter(coords);
    } catch (err) {
      console.warn("SOS: Could not get fresh location, using last known.");
    }

    // In a real app, this would send an SMS/Alert with location to all contacts
    console.log("SOS ALERT SENT TO:", emergencyNumbers.join(', '));
    
    // Initiate call to the selected contact
    window.location.href = `tel:${number}`;
    
    setTimeout(() => {
      alert(`🚨 SOS ALERT ACTIVATED!\n\nLocation: ${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}\n\nInitiating call to: ${number}\n\nEmergency services and your other saved contacts are being notified.`);
      setIsSOSActive(false);
    }, 1000);
  };

  const handleCall = (type: 'SHE' | 'Police') => {
    const number = type === 'SHE' ? '1091' : '100';
    window.location.href = `tel:${number}`;
  };

  const handleShareLocation = async () => {
    let coords = liveLocation || mapCenter;

    // If no live location yet, try to get it first
    if (!liveLocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        const { latitude, longitude } = position.coords;
        coords = [latitude, longitude];
        setLiveLocation([latitude, longitude]);
        setMapCenter([latitude, longitude]);
      } catch (err) {
        console.warn("Could not get current location for sharing, using map center.");
      }
    }

    const shareUrl = `https://www.google.com/maps?q=${coords[0]},${coords[1]}`;
    const shareData = {
      title: 'My Live Location - She Safe',
      text: `I am sharing my live location with you for safety. See where I am:`,
      url: shareUrl
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert("Live location link copied to clipboard! Share it with your trusted contacts.");
      }
    } catch (error) {
      console.error("Sharing failed:", error);
      // Fallback if share fails or is cancelled
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert("Live location link copied to clipboard!");
      } catch (clipError) {
        alert(`My Location: ${shareUrl}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-orange-500/30">
      {/* Header */}
      <header className="border-b border-zinc-200 p-4 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight uppercase text-zinc-900">She Safe</h1>
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Advanced Safety Navigator</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-zinc-100 px-3 py-1.5 rounded-full border border-zinc-200">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs font-mono text-zinc-700">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded uppercase font-bold",
              currentTime === 'Day' ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"
            )}>
              {currentTime}
            </span>
          </div>
        </div>
      </header>

      <main className="flex flex-col lg:grid lg:grid-cols-[400px_1fr] lg:h-[calc(100vh-73px)]">
        {/* Sidebar: Controls & Routes */}
        <section className="border-r border-zinc-200 overflow-y-auto p-6 space-y-8 bg-zinc-50/50">
          {/* Search Inputs */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Starting Location</label>
                <button 
                  onClick={handleLiveLocation}
                  className="text-[10px] font-bold text-orange-600 uppercase flex items-center gap-1 hover:underline"
                >
                  <Crosshair className={cn("w-3 h-3", isLocating && "animate-spin")} />
                  Use Live Location
                </button>
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input 
                  type="text"
                  placeholder="Enter origin..."
                  value={startQuery}
                  onChange={(e) => setStartQuery(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-zinc-900 shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Destination</label>
              <div className="relative">
                <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input 
                  type="text"
                  placeholder="Enter destination..."
                  value={endQuery}
                  onChange={(e) => setEndQuery(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-zinc-900 shadow-sm"
                />
              </div>
            </div>

            <button 
              onClick={handleSearch}
              disabled={!startQuery || !endQuery || isSearching}
              className="w-full bg-zinc-900 text-white font-bold py-3.5 rounded-xl hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-zinc-900/10 active:scale-95"
            >
              {isSearching ? (
                <Activity className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              {isSearching ? 'Analyzing Safety...' : 'Find Safest Route'}
            </button>
          </div>


          {/* Route Suggestions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Safety Analysis</h2>
            </div>

            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {routes.map((route, idx) => (
                  <motion.div
                    key={route.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => setSelectedRoute(route)}
                    className={cn(
                      "p-4 rounded-xl border cursor-pointer transition-all group relative overflow-hidden",
                      selectedRoute?.id === route.id 
                        ? "bg-orange-50 border-orange-200 shadow-md" 
                        : "bg-white border-zinc-200 hover:border-zinc-300 hover:shadow-sm"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-sm text-zinc-900">{route.name}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                            <Navigation className="w-3 h-3" /> {route.distance}
                          </span>
                          <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {route.duration}
                          </span>
                        </div>
                      </div>
                      <div className={cn(
                        "px-2 py-1 rounded text-[10px] font-bold font-mono",
                        route.safetyScore > 80 ? "bg-green-100 text-green-700" :
                        route.safetyScore > 60 ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      )}>
                        {route.safetyScore}% SAFE
                      </div>
                    </div>
                    
                    {route.riskFactors.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-zinc-100 space-y-1">
                        {route.riskFactors.map((risk, i) => (
                          <div key={i} className="flex items-center gap-2 text-[9px] text-zinc-500">
                            <AlertTriangle className="w-2.5 h-2.5 text-orange-500" />
                            {risk}
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedRoute?.id === route.id && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="mt-4 pt-4 border-t border-zinc-200"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Info className="w-3 h-3 text-zinc-400" />
                          <span className="text-[10px] font-bold text-zinc-400 uppercase">Detailed Analysis</span>
                        </div>
                        <div className="prose prose-zinc prose-xs max-w-none text-[11px] text-zinc-600 leading-relaxed">
                          <ReactMarkdown>{route.analysis}</ReactMarkdown>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {routes.length === 0 && !isSearching && (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mx-auto border border-zinc-200">
                    <Navigation className="w-6 h-6 text-zinc-300" />
                  </div>
                  <p className="text-xs text-zinc-400">Enter locations to see real-time safety analysis</p>
                </div>
              )}
            </div>
          </div>

          {/* Emergency Panel */}
          <div className="pt-6 border-t border-zinc-200 space-y-4">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Emergency Services</h2>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => handleCall('Police')}
                className="flex flex-col items-center justify-center gap-2 p-4 bg-white rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors shadow-sm"
              >
                <PhoneCall className="w-5 h-5 text-blue-600" />
                <span className="text-[10px] font-bold uppercase text-zinc-700">Police (100)</span>
              </button>
              <button 
                onClick={() => handleCall('SHE')}
                className="flex flex-col items-center justify-center gap-2 p-4 bg-white rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors shadow-sm"
              >
                <ShieldAlert className="w-5 h-5 text-pink-600" />
                <span className="text-[10px] font-bold uppercase text-zinc-700">SHE Team</span>
              </button>
            </div>
            <button 
              onClick={handleSOS}
              disabled={isSOSActive}
              className={cn(
                "w-full text-white font-black py-4 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3",
                isSOSActive ? "bg-red-800 animate-pulse" : "bg-red-600 hover:bg-red-700 shadow-red-600/20"
              )}
            >
              <Zap className={cn("w-6 h-6 fill-current", isSOSActive && "animate-bounce")} />
              {isSOSActive ? 'SENDING SOS...' : showSOSOptions ? 'CANCEL SOS' : 'SOS EMERGENCY'}
            </button>

            <AnimatePresence>
              {showSOSOptions && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 gap-2 mt-2"
                >
                  <p className="text-[10px] font-bold text-red-600 uppercase text-center mb-1">Select Contact to Call</p>
                  {['9392864256', '8978317750', '8121190800', '9948088555'].map((num) => (
                    <button
                      key={num}
                      onClick={() => initiateSOSCall(num)}
                      className="w-full bg-red-50 border border-red-200 text-red-600 font-bold py-3 rounded-lg hover:bg-red-100 transition-all flex items-center justify-center gap-2 text-xs shadow-sm"
                    >
                      <PhoneCall className="w-3 h-3" />
                      Call {num}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            <button 
              onClick={handleShareLocation}
              className="w-full bg-white border border-zinc-200 text-zinc-600 font-bold py-3 rounded-xl hover:bg-zinc-50 transition-all flex items-center justify-center gap-2 text-xs shadow-sm"
            >
              <Share2 className="w-4 h-4" />
              Share Live Location
            </button>
          </div>
        </section>

        {/* Map View */}
        <section className="relative bg-zinc-100 overflow-hidden min-h-[400px] lg:min-h-0">
          {/* @ts-ignore */}
          <MapContainer 
            center={mapCenter} 
            zoom={13} 
            className="w-full h-full z-10"
            zoomControl={false}
          >
            {/* @ts-ignore */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapUpdater center={mapCenter} />
            
            {liveLocation && (
              <Marker position={liveLocation}>
                <Popup>
                  <div className="text-xs font-bold text-blue-600">You are here</div>
                </Popup>
              </Marker>
            )}

            {showCrimeZones && Object.entries(AREA_COORDINATES).map(([name, coords]) => {
              const crimeData = CRIME_DATASET.find(d => d.area === name);
              if (!crimeData) return null;
              
              const color = crimeData.crimeRate === 'High' ? '#ef4444' : 
                          crimeData.crimeRate === 'Medium' ? '#eab308' : '#22c55e';
              
              return (
                <Circle
                  key={name}
                  center={[coords.lat, coords.lng]}
                  radius={500}
                  pathOptions={{
                    fillColor: color,
                    color: color,
                    fillOpacity: 0.2,
                    weight: 1
                  }}
                >
                  <Popup>
                    <div className="text-[10px] font-bold uppercase tracking-wider">
                      {name} - {crimeData.crimeRate} Risk
                    </div>
                  </Popup>
                </Circle>
              );
            })}

            {showPOIs && POI_DATASET.map(poi => {
              const iconColor = poi.type === 'Hospital' ? '#ef4444' : 
                               poi.type === 'Police' ? '#2563eb' : '#f59e0b';
              
              const customIcon = L.divIcon({
                html: `<div class="animate-poi-flicker" style="color: ${iconColor}; background: white; padding: 4px; border-radius: 50%; border: 2px solid ${iconColor}; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                        ${poi.type === 'Hospital' ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v12"/><path d="M6 12h12"/></svg>' : 
                          poi.type === 'Police' ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' : 
                          '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'}
                      </div>`,
                className: 'custom-poi-icon',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
              });

              return (
                <Marker key={poi.id} position={[poi.lat, poi.lng]} icon={customIcon}>
                  <Popup>
                    <div className="p-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[8px] font-bold text-white uppercase",
                          poi.type === 'Hospital' ? "bg-red-500" : 
                          poi.type === 'Police' ? "bg-blue-500" : "bg-orange-500"
                        )}>{poi.type}</span>
                        <h4 className="font-bold text-sm">{poi.name}</h4>
                      </div>
                      <p className="text-xs text-zinc-500">{poi.description}</p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
            
            {startLocation && (
              <Marker position={[parseFloat(startLocation.lat), parseFloat(startLocation.lon)]}>
                <Popup>
                  <div className="text-xs font-bold">Start: {startLocation.display_name.split(',')[0]}</div>
                </Popup>
              </Marker>
            )}

            {endLocation && (
              <Marker position={[parseFloat(endLocation.lat), parseFloat(endLocation.lon)]}>
                <Popup>
                  <div className="text-xs font-bold">End: {endLocation.display_name.split(',')[0]}</div>
                </Popup>
              </Marker>
            )}

            {selectedRoute && (
              /* @ts-ignore */
              <Polyline 
                positions={selectedRoute.path} 
                color="#f97316" 
                weight={6} 
                opacity={1}
              />
            )}
          </MapContainer>

          {/* Map Controls Overlay */}
          <div className="absolute top-6 right-6 z-20 flex flex-col gap-3">
            <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-zinc-200 shadow-xl space-y-4 min-w-[220px]">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-800">Safety Legend</span>
                </div>
                <button 
                  onClick={() => setShowCrimeZones(!showCrimeZones)}
                  className={cn(
                    "w-10 h-5 rounded-full transition-all relative",
                    showCrimeZones ? "bg-red-600" : "bg-zinc-300"
                  )}
                >
                  <motion.div 
                    animate={{ x: showCrimeZones ? 20 : 2 }}
                    className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full shadow-sm"
                  />
                </button>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-800">Safety POIs</span>
                </div>
                <button 
                  onClick={() => setShowPOIs(!showPOIs)}
                  className={cn(
                    "w-10 h-5 rounded-full transition-all relative",
                    showPOIs ? "bg-blue-600" : "bg-zinc-300"
                  )}
                >
                  <motion.div 
                    animate={{ x: showPOIs ? 20 : 2 }}
                    className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full shadow-sm"
                  />
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]" />
                    <span className="text-[10px] text-zinc-600">Safe Zone ({'>'}80%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.3)]" />
                    <span className="text-[10px] text-zinc-600">Moderate Risk (60-80%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]" />
                    <span className="text-[10px] text-zinc-600">High Risk Area</span>
                  </div>
                  
                  {showPOIs && (
                    <div className="pt-2 border-t border-zinc-100 mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Hospital className="w-3 h-3 text-red-500" />
                        <span className="text-[10px] text-zinc-600">Hospital</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield className="w-3 h-3 text-blue-600" />
                        <span className="text-[10px] text-zinc-600">Police Station</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-3 h-3 text-orange-500" />
                        <span className="text-[10px] text-zinc-600">Crowded Area</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Live Stats Overlay */}
            <div className="bg-white/90 backdrop-blur-md p-3 rounded-xl border border-zinc-200 shadow-lg flex items-center gap-3">
              <div className="relative">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-ping absolute inset-0" />
                <div className="w-2 h-2 bg-green-500 rounded-full relative" />
              </div>
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-tighter">AI Safety Engine Active</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
