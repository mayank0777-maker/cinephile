import { createContext, useContext, useEffect, useState } from "react";
import { theatreApi } from "../services/api";

const CityContext = createContext(null);
const KEY = "cinephile_city";

export function CityProvider({ children }) {
  const [city, setCityState] = useState(() => {
    try { return localStorage.getItem(KEY) || ""; } catch { return ""; }
  });
  const [cities, setCities] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    theatreApi
      .cities()
      .then((r) => {
        setCities(r.cities);
        if (!city && r.cities.length) setCityState(r.cities.includes("Mumbai") ? "Mumbai" : r.cities[0]);
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setCity = (c) => {
    setCityState(c);
    try { localStorage.setItem(KEY, c); } catch { /* ignore */ }
  };

  return <CityContext.Provider value={{ city, setCity, cities, pickerOpen, setPickerOpen }}>{children}</CityContext.Provider>;
}

export const useCity = () => useContext(CityContext);
