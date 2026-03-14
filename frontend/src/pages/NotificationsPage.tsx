import NotificationCenter from "@/components/NotificationPanel";
import { useNavigate } from "react-router-dom";

const NotificationsPage = () => {
  const navigate = useNavigate();
  return (
    <NotificationCenter
      open={true}
      onClose={() => navigate("/overview")}
      onNavigate={(route) => navigate(route)}
      mode="fullpage"
    />
  );
};

export default NotificationsPage;
