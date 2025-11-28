import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Redirect to new Stempelkarte page
const MerchantDashboard = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate('/kunde/stempelkarte', { replace: true });
  }, [navigate]);
  
  return null;
};

export default MerchantDashboard;
