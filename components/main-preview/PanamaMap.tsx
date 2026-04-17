"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useRef } from "react";

const PANAMA_CENTER = { lat: 8.9824, lng: -79.5199 };
const PANAMA_DEFAULT_ZOOM = 10;

export function PanamaMap() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (mapRef.current === null || initializedRef.current) {
      return;
    }
    let disposed = false;
    let cleanup: (() => void) | undefined;

    void import("leaflet")
      .then((leaflet) => {
        if (disposed || mapRef.current === null) {
          return;
        }
        const L = leaflet.default;
        const markerIcon = L.icon({
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
        });
        const map = L.map(mapRef.current, {
          center: [PANAMA_CENTER.lat, PANAMA_CENTER.lng],
          zoom: PANAMA_DEFAULT_ZOOM,
          scrollWheelZoom: false,
        });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
        }).addTo(map);
        L.marker([PANAMA_CENTER.lat, PANAMA_CENTER.lng], { icon: markerIcon })
          .addTo(map)
          .bindPopup("Panama City (Panama)");
        window.setTimeout(() => {
          map.invalidateSize();
        }, 0);
        initializedRef.current = true;
        cleanup = () => {
          map.remove();
          initializedRef.current = false;
        };
      })
      .catch(() => {
        initializedRef.current = false;
      });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return (
    <section className="flex h-full min-h-[420px] flex-col rounded-[16px] border border-[#e3e9f2] bg-white p-3 shadow-sh2">
      <h3 className="mb-2 text-[14px] font-extrabold text-[#1f3e64]">신규조달 위치</h3>
      <div className="flex-1 overflow-hidden rounded-[12px] border border-[#dde5f0]">
        <div ref={mapRef} className="h-full min-h-[360px] w-full" />
      </div>
    </section>
  );
}

