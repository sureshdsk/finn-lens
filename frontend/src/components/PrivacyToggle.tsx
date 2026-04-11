import { EyeOff, Eye } from "lucide-react";
import { usePrivacy } from "@/contexts/PrivacyContext";

const PrivacyToggle = () => {
  const { hidden, toggle } = usePrivacy();

  return (
    <button
      onClick={toggle}
      className="w-9 h-9 rounded-lg bg-card border border-border shadow-sm flex items-center justify-center hover:bg-muted/80 transition-all"
      aria-label={hidden ? "Show amounts" : "Hide amounts"}
      title={hidden ? "Show amounts" : "Hide amounts"}
    >
      {hidden ? (
        <EyeOff className="w-4 h-4 text-muted-foreground" />
      ) : (
        <Eye className="w-4 h-4 text-muted-foreground" />
      )}
    </button>
  );
};

export default PrivacyToggle;
