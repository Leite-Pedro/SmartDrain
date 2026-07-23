"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Plus, Minus, LocateFixed } from "lucide-react";
import { useEffect } from "react";

interface BueiroData {
  bueiro_id: string;
  latitude: number;
  longitude: number;
  sensores: {
    sensor_1_cm: number;
    sensor_2_cm: number;
    sensor_3_cm: number;
  };
  distancia_media_cm: number;
  capacidade_porcentagem: number;
  status_codigo: "TRANQUILO" | "ALERTA" | "CRITICO" | "ENCHENTE";
  status_mensagem: string;
  status_bateria: number;
  timestamp: string;
}

interface MapProps {
  bueiros: BueiroData[];
}

const getMarkerIcon = (status: string) => {
  let color = "green";
  if (status === "TRANQUILO") color = "green";
  if (status === "ALERTA") color = "gold";
  if (status === "CRITICO") color = "red";
  if (status === "ENCHENTE") color = "blue";

  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
};

const TARGET_COORDS: [number, number] = [-22.2572862, -45.695728];

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 300);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function CustomMapControls() {
  const map = useMap();
  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-[1000] flex flex-col gap-3">
      <div className="bg-slate-900 border border-slate-700 p-1 rounded-xl flex flex-col gap-1 shadow-2xl">
        <button
          onClick={() => map.zoomIn()}
          className="p-2 text-slate-200 hover:bg-slate-800 rounded-lg"
        >
          <Plus size={20} />
        </button>
        <div className="h-[1px] bg-slate-700 mx-2" />
        <button
          onClick={() => map.zoomOut()}
          className="p-2 text-slate-200 hover:bg-slate-800 rounded-lg"
        >
          <Minus size={20} />
        </button>
      </div>
      <button
        onClick={() => map.setView(TARGET_COORDS, 17, { animate: true })}
        className="bg-blue-600 hover:bg-blue-500 p-3 rounded-xl text-white shadow-2xl"
      >
        <LocateFixed size={22} />
      </button>
    </div>
  );
}

export default function Map({ bueiros }: MapProps) {
  return (
    <div className="w-full h-full relative bg-slate-950">
      <MapContainer
        center={TARGET_COORDS}
        zoom={17}
        zoomControl={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {bueiros.map((bueiro) => (
          <Marker
            // 🚀 KEY DINÂMICA: Força a atualização do ícone no Leaflet quando o status altera
            key={`${bueiro.bueiro_id}-${bueiro.status_codigo}-${bueiro.capacidade_porcentagem}`}
            position={[bueiro.latitude, bueiro.longitude] as [number, number]}
            icon={getMarkerIcon(bueiro.status_codigo)}
          >
            <Popup>
              <div className="text-slate-900 font-sans p-1 min-w-32">
                <strong className="text-sm border-b pb-1 mb-1 block">
                  {bueiro.bueiro_id.replace(/_/g, " ").toUpperCase()}
                </strong>
                <p className="text-xs font-semibold mt-2">
                  Status:{" "}
                  <span
                    className={
                      bueiro.status_codigo === "ENCHENTE"
                        ? "text-blue-600 font-bold"
                        : bueiro.status_codigo === "CRITICO"
                          ? "text-red-600"
                          : bueiro.status_codigo === "ALERTA"
                            ? "text-yellow-600"
                            : "text-green-600"
                    }
                  >
                    {bueiro.status_codigo}
                  </span>
                </p>
                <p className="text-xs mt-1">
                  Ocupação: <strong>{bueiro.capacidade_porcentagem}%</strong>
                </p>
                <p className="text-[10px] text-slate-500 mt-2">
                  {bueiro.status_mensagem}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        <MapResizer />
        <CustomMapControls />
      </MapContainer>
    </div>
  );
}
