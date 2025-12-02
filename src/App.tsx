import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Karriere from "./pages/Karriere";
import Kontakt from "./pages/Kontakt";
import Impressum from "./pages/Impressum";
import Datenschutz from "./pages/Datenschutz";
import Delete from "./pages/Delete";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/admin/Dashboard";
import Overview from "./pages/admin/Overview";
import Customers from "./pages/admin/Customers";
import CustomerDetail from "./pages/admin/CustomerDetail";
import CustomerNew from "./pages/admin/CustomerNew";
import CustomerMap from "./pages/admin/CustomerMap";
import Accounts from "./pages/admin/Accounts";
import Orders from "./pages/admin/Orders";
import Stats from "./pages/admin/Stats";
import Checkout from "./pages/admin/Checkout";
import BoxManagement from "./pages/admin/BoxManagement";
import Settings from "./pages/admin/Settings";
import MerchantLayout from "./components/MerchantLayout";
import KundeDashboard from "./pages/merchant/KundeDashboard";
import Stempelkarte from "./pages/merchant/Stempelkarte";
import GoogleBewertungen from "./pages/merchant/GoogleBewertungen";
import MeinKonto from "./pages/merchant/MeinKonto";
import PartnerDashboard from "./pages/partner/Dashboard";
import Scan from "./pages/Scan";
import NotFound from "./pages/NotFound";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import CheckoutCancel from "./pages/CheckoutCancel";
import DesignVariants from "./pages/DesignVariants";

// App (End Customer) imports
import { AppProtectedRoute } from "./components/AppProtectedRoute";
import AppLayout from "./app/layouts/AppLayout";
import AppHome from "./app/pages/AppHome";
import AppRewards from "./app/pages/AppRewards";
import AppHistory from "./app/pages/AppHistory";
import AppProfile from "./app/pages/AppProfile";
import AppAuth from "./app/pages/AppAuth";
import AppMerchantDetail from "./app/pages/AppMerchantDetail";
import AppScan from "./app/pages/AppScan";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* ===== WEB ROUTES ===== */}
          <Route path="/" element={<Landing />} />
          <Route path="/karriere" element={<Karriere />} />
          <Route path="/kontakt" element={<Kontakt />} />
          <Route path="/impressum" element={<Impressum />} />
          <Route path="/datenschutz" element={<Datenschutz />} />
          <Route path="/delete" element={<Delete />} />
          <Route path="/auth" element={<Auth />} />
          
          {/* Admin Dashboard (role: admin) */}
          <Route path="/admin" element={<AdminDashboard />}>
            <Route index element={<Overview />} />
            <Route path="customers" element={<Customers />} />
            <Route path="customers/new" element={<CustomerNew />} />
            <Route path="customers/:id" element={<CustomerDetail />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path="orders" element={<Orders />} />
            <Route path="stats" element={<Stats />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="boxes" element={<BoxManagement />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          
          <Route path="/admin/map" element={<CustomerMap />} />
          
          {/* Händler Dashboard (role: merchant) */}
          <Route path="/kunde" element={<MerchantLayout />}>
            <Route index element={<KundeDashboard />} />
            <Route path="stempelkarte" element={<Stempelkarte />} />
            <Route path="google-bewertungen" element={<GoogleBewertungen />} />
            <Route path="konto" element={<MeinKonto />} />
          </Route>
          
          {/* Partner Dashboard */}
          <Route path="/partner" element={<PartnerDashboard />} />
          
          {/* ===== APP ROUTES (End Customer) ===== */}
          <Route path="/app/auth" element={<AppAuth />} />
          <Route path="/app" element={<AppProtectedRoute><AppLayout /></AppProtectedRoute>}>
            <Route index element={<AppHome />} />
            <Route path="rewards" element={<AppRewards />} />
            <Route path="history" element={<AppHistory />} />
            <Route path="profile" element={<AppProfile />} />
            <Route path="scan" element={<AppScan />} />
            <Route path="merchant/:id" element={<AppMerchantDetail />} />
          </Route>
          
          {/* Scan Route */}
          <Route path="/s/:cid" element={<Scan />} />
          
          {/* Checkout Routes */}
          <Route path="/checkout/success" element={<CheckoutSuccess />} />
          <Route path="/checkout/cancel" element={<CheckoutCancel />} />
          
          {/* Legacy redirects */}
          <Route path="/kunde/dashboard" element={<Navigate to="/kunde" replace />} />
          <Route path="/merchant" element={<Navigate to="/kunde" replace />} />
          <Route path="/customer" element={<Navigate to="/kunde" replace />} />
          
          <Route path="/design-variants" element={<DesignVariants />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
