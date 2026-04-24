"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Plus, Minus, LocateFixed } from 'lucide-react';
import { useEffect } from 'react';

const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Coordenadas solicitadas
const TARGET_COORDS: [number, number] = [-22.2572862, -45.695728];

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => { map.invalidateSize(); }, 300);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function CustomMapControls() {
  const map = useMap();

  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-1000 flex flex-col gap-3">
      {/* Zoom com Cores Sólidas e Contraste */}
      <div className="bg-slate-900 border border-slate-700 p-1 rounded-xl flex flex-col gap-1 shadow-2xl">
        <button 
          onClick={() => map.zoomIn()}
          className="p-2 text-slate-200 hover:bg-slate-800 rounded-lg transition-all active:scale-95"
          title="Aumentar Zoom"
        >
          <Plus size={20} />
        </button>
        <div className="h-1px bg-slate-700 mx-2" />
        <button 
          onClick={() => map.zoomOut()}
          className="p-2 text-slate-200 hover:bg-slate-800 rounded-lg transition-all active:scale-95"
          title="Diminuir Zoom"
        >
          <Minus size={20} />
        </button>
      </div>

      {/* Botão Centralizar com Cor Sólida (Azul Original) */}
      <button 
        onClick={() => map.setView(TARGET_COORDS, 17, { animate: true })}
        className="bg-blue-600 hover:bg-blue-500 p-3 rounded-xl text-white shadow-2xl transition-all active:scale-90 border border-blue-400"
        title="Centralizar no Ponto"
      >
        <LocateFixed size={22} />
      </button>
    </div>
  );
}

export default function Map() {
  return (
    <div className="w-full h-full relative bg-slate-950">
      <MapContainer 
        center={TARGET_COORDS} 
        zoom={17} 
        zoomControl={false} 
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <Marker position={TARGET_COORDS} icon={customIcon}>
          <Popup>
            <div className="text-slate-900 font-sans p-1">
              <strong className="text-sm">Smart Drain - Central</strong>
              <p className="text-[10px]">Ponto de Monitoramento Ativo</p>
            </div>
          </Popup>
        </Marker>
        
        <MapResizer />
        <CustomMapControls />
      </MapContainer>
    </div>
  );
}