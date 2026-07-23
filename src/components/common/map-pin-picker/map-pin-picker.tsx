import L from "leaflet"
import iconRetina from "leaflet/dist/images/marker-icon-2x.png"
import icon from "leaflet/dist/images/marker-icon.png"
import iconShadow from "leaflet/dist/images/marker-shadow.png"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
} from "react-leaflet"
import { Input, Text, clx } from "@medusajs/ui"

// Fix Leaflet's default marker icon paths for Vite bundling
// (see https://github.com/PaulLeCam/react-leaflet/issues/453)
L.Marker.prototype.options.icon = L.icon({
  iconUrl: icon as unknown as string,
  iconRetinaUrl: iconRetina as unknown as string,
  shadowUrl: iconShadow as unknown as string,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

export type PinPickerValue = {
  latitude: number
  longitude: number
  location_precision: "map_pinned" | "geocoded" | "country_centroid"
}

type Props = {
  value?: PinPickerValue | null
  onChange: (value: PinPickerValue) => void
  className?: string
  disabled?: boolean
  height?: number
  label?: string
  helpText?: string
}

type NominatimResult = {
  lat: string
  lon: string
  display_name: string
  place_id: number
}

const DEFAULT_CENTER: [number, number] = [20, 0]
const DEFAULT_ZOOM = 2
const PICKED_ZOOM = 13
const NOMINATIM_URL = "https://nominatim.openstreetmap.org"

function Recenter({ position, zoom }: { position: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView(position, zoom, { animate: true })
  }, [map, position, zoom])
  return null
}

export const MapPinPicker = ({
  value,
  onChange,
  className,
  disabled,
  height = 320,
  label,
  helpText,
}: Props) => {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<NominatimResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const debounceRef = useRef<number | null>(null)

  const center: [number, number] = useMemo(() => {
    if (value?.latitude != null && value?.longitude != null) {
      return [value.latitude, value.longitude]
    }
    return DEFAULT_CENTER
  }, [value])

  const zoom = value?.latitude != null ? PICKED_ZOOM : DEFAULT_ZOOM

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setSearchOpen(false)
      return
    }
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
    }
    debounceRef.current = window.setTimeout(async () => {
      setSearching(true)
      try {
        const url = `${NOMINATIM_URL}/search?format=json&limit=5&q=${encodeURIComponent(
          query.trim()
        )}`
        const res = await fetch(url, {
          headers: {
            Accept: "application/json",
          },
        })
        const json: NominatimResult[] = await res.json()
        setResults(Array.isArray(json) ? json.slice(0, 5) : [])
        setSearchOpen(true)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 500)

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current)
      }
    }
  }, [query])

  const pickResult = (r: NominatimResult) => {
    const lat = Number(r.lat)
    const lng = Number(r.lon)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      onChange({
        latitude: lat,
        longitude: lng,
        location_precision: "geocoded",
      })
    }
    setQuery(r.display_name)
    setSearchOpen(false)
  }

  const handleDragEnd = (e: L.DragEndEvent) => {
    const marker = e.target as L.Marker
    const p = marker.getLatLng()
    onChange({
      latitude: p.lat,
      longitude: p.lng,
      location_precision: "map_pinned",
    })
  }

  return (
    <div className={clx("flex flex-col gap-y-2", className)}>
      {label ? (
        <label className="txt-compact-small-plus text-ui-fg-base">{label}</label>
      ) : null}
      <div className="relative">
        <Input
          size="small"
          placeholder="Search address or drag the pin on the map"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={disabled}
          onFocus={() => {
            if (results.length > 0) setSearchOpen(true)
          }}
        />
        {searchOpen && results.length > 0 ? (
          <div className="border-ui-border-base bg-ui-bg-base absolute left-0 right-0 top-full z-[1000] mt-1 max-h-64 overflow-auto rounded-md border shadow-md">
            {results.map((r) => (
              <button
                type="button"
                key={r.place_id}
                onClick={() => pickResult(r)}
                className="txt-compact-small hover:bg-ui-bg-base-hover text-ui-fg-base w-full px-3 py-2 text-left"
              >
                {r.display_name}
              </button>
            ))}
          </div>
        ) : null}
        {searching ? (
          <Text size="xsmall" className="text-ui-fg-muted mt-1">
            Searching…
          </Text>
        ) : null}
      </div>
      <div
        style={{ height }}
        className="border-ui-border-base overflow-hidden rounded-md border"
      >
        <MapContainer
          center={center}
          zoom={zoom}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Recenter position={center} zoom={zoom} />
          {value?.latitude != null && value?.longitude != null ? (
            <Marker
              position={[value.latitude, value.longitude]}
              draggable={!disabled}
              eventHandlers={{
                dragend: handleDragEnd,
              }}
            />
          ) : null}
        </MapContainer>
      </div>
      <Text size="xsmall" className="text-ui-fg-subtle">
        {value?.latitude != null && value?.longitude != null
          ? `${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)} (${value.location_precision})`
          : helpText || "Search an address or drop a pin on the map"}
      </Text>
    </div>
  )
}
