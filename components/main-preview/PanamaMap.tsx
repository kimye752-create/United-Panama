"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useRef } from "react";

const PANAMA_CENTER = { lat: 8.9824, lng: -79.5199 };
const PANAMA_DEFAULT_ZOOM = 6;

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
          scrollWheelZoom: true,
        });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
        }).addTo(map);
        L.marker([PANAMA_CENTER.lat, PANAMA_CENTER.lng], { icon: markerIcon })
          .addTo(map)
          .bindPopup("Panama City (Panama)");
        // 지도 컨테이너 크기 변경 시 타일 레이어를 다시 맞춰 하단 깨짐을 방지합니다.
        // disposed 플래그 체크 — 언마운트 후 invalidateSize 호출 방지
        const resizeObserver = new ResizeObserver(() => {
          if (!disposed) map.invalidateSize();
        });
        resizeObserver.observe(mapRef.current);
        window.setTimeout(() => {
          if (!disposed) map.invalidateSize();
        }, 0);
        window.setTimeout(() => {
          if (!disposed) map.invalidateSize();
        }, 180);
        initializedRef.current = true;
        cleanup = () => {
          resizeObserver.disconnect();
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
    <section className="flex h-full min-h-[420px] flex-col rounded-[20px] bg-white p-5 shadow-sh">
      <h3 className="mb-3 text-[15px] font-bold text-[#1f3e64]">파나마 위치</h3>
      <div className="flex-1 overflow-hidden rounded-[12px]">
        <div ref={mapRef} className="h-full min-h-[370px] w-full" />
      </div>
    </section>
  );
}

