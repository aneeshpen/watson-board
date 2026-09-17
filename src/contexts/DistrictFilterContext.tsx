import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type DistrictFilterContextValue = {
  /** `null` = all districts */
  district: string | null;
  setDistrict: (district: string | null) => void;
};

const DistrictFilterContext = createContext<DistrictFilterContextValue | null>(null);

export function DistrictFilterProvider({ children }: { children: ReactNode }) {
  const [district, setDistrictState] = useState<string | null>(null);
  const setDistrict = useCallback((d: string | null) => {
    setDistrictState(d && d.trim() ? d.trim() : null);
  }, []);
  const value = useMemo(() => ({ district, setDistrict }), [district, setDistrict]);

  return (
    <DistrictFilterContext.Provider value={value}>{children}</DistrictFilterContext.Provider>
  );
}

export function useDistrictFilter(): DistrictFilterContextValue {
  const ctx = useContext(DistrictFilterContext);
  if (!ctx) {
    throw new Error("useDistrictFilter must be used within DistrictFilterProvider");
  }
  return ctx;
}
