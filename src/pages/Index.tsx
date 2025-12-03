import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const handleRouting = async () => {
      const isNative = Capacitor.isNativePlatform();
      
      if (isNative) {
        // Native App: Check auth status and route to /app or /app/auth
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          navigate('/app', { replace: true });
        } else {
          navigate('/app/auth', { replace: true });
        }
      } else {
        // Web: Redirect to website landing page
        navigate('/home', { replace: true });
      }
      
      setChecking(false);
    };

    handleRouting();
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return null;
};

export default Index;
