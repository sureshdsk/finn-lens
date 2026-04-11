import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface PrivacyContextType {
  hidden: boolean;
  toggle: () => void;
}

const PrivacyContext = createContext<PrivacyContextType | null>(null);

export const usePrivacy = () => {
  const ctx = useContext(PrivacyContext);
  if (!ctx) throw new Error("usePrivacy must be used within PrivacyProvider");
  return ctx;
};

export const PrivacyProvider = ({ children }: { children: ReactNode }) => {
  const [hidden, setHidden] = useState(() => {
    return localStorage.getItem("finnlens_privacy_mode") === "true";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("privacy-mode", hidden);
  }, [hidden]);

  const toggle = () => {
    setHidden((prev) => {
      const next = !prev;
      localStorage.setItem("finnlens_privacy_mode", String(next));
      return next;
    });
  };

  return (
    <PrivacyContext.Provider value={{ hidden, toggle }}>
      {children}
    </PrivacyContext.Provider>
  );
};
