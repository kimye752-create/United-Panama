"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useRef } from "react";
import L from "leaflet";

const PANAMA_CENTER = { lat: 8.9824, lng: -79.5199 };

export function PanamaMap() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (mapRef.current === null || initializedRef.current) {
      return;
    }
    const markerIcon = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });
    const map = L.map(mapRef.current, {
      center: [PANAMA_CENTER.lat, PANAMA_CENTER.lng],
      zoom: 12,
      scrollWheelZoom: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
    }).addTo(map);
    L.marker([PANAMA_CENTER.lat, PANAMA_CENTER.lng], { icon: markerIcon })
      .addTo(map)
      .bindPopup("Panama City");
    initializedRef.current = true;
    return () => {
      map.remove();
      initializedRef.current = false;
    };
  }, []);

  return (
    <section className="rounded-[16px] border border-[#e3e9f2] bg-white p-3 shadow-sh2">
      <h3 className="mb-2 text-[14px] font-extrabold text-[#1f3e64]">신규조달 위치</h3>
      <div className="overflow-hidden rounded-[12px] border border-[#dde5f0]">
        <div ref={mapRef} style={{ height: "330px", width: "100%" }} />
      </div>
    </section>
  );
}

