import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DeepLinkProvider } from "@/app/components/DeepLinkProvider";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
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
import MeinGeschaeft from "./pages/merchant/MeinGeschaeft";
import GoogleBewertungen from "./pages/merchant/GoogleBewertungen";
import MeinKonto from "./pages/merchant/MeinKonto";
import Nachrichten from "./pages/merchant/Nachrichten";
import PartnerLayout from "./pages/partner/PartnerLayout";
import PartnerDashboardHome from "./pages/partner/PartnerDashboardHome";
import PartnerLeads from "./pages/partner/PartnerLeads";
import PartnerProvisionen from "./pages/partner/PartnerProvisionen";
import PartnerCheckout from "./pages/partner/PartnerCheckout";
import MerchantSetup from "./pages/merchant/MerchantSetup";
import Scan from "./pages/Scan";
import NotFound from "./pages/NotFound";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import CheckoutCancel from "./pages/CheckoutCancel";
import DesignVariants from "./pages/DesignVariants";

// App (End Customer) imports
import { AppProtectedRoute } from "./components/AppProtectedRoute";
import SwipeableAppContainer from "./app/components/SwipeableAppContainer";
import AppHistory from "./app/pages/AppHistory";
import AppSettings from "./app/pages/AppSettings";
import AppAuth from "./app/pages/AppAuth";
// AppPermissions removed - permissions are now requested natively on-demand
import AppMerchantDetail from "./app/pages/AppMerchantDetail";
import AppScan from "./app/pages/AppScan";
import AppSuggestShop from "./app/pages/AppSuggestShop";
import AppTerms from "./app/pages/AppTerms";
import AppPrivacy from "./app/pages/AppPrivacy";
import AppMyCards from "./app/pages/AppMyCards";
import AppVerifyEmail from "./app/pages/AppVerifyEmail";
import AppRewards from "./app/pages/AppRewards";
import AppMessageDetail from "./app/pages/AppMessageDetail";
import Leads from "./pages/admin/Leads";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <DeepLinkProvider>
        <Routes>
          {/* ===== ROOT ROUTE - handles native vs web ===== */}
          <Route path="/" element={<Index />} />
          
          {/* ===== WEB ROUTES ===== */}
          <Route path="/home" element={<Landing />} />
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
            <Route path="leads" element={<Leads />} />
            <Route path="stats" element={<Stats />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="boxes" element={<BoxManagement />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          
          <Route path="/admin/map" element={<CustomerMap />} />
          
          {/* Händler Dashboard (role: merchant) */}
          <Route path="/kunde/setup" element={<MerchantSetup />} />
          <Route path="/kunde" element={<MerchantLayout />}>
            <Route index element={<KundeDashboard />} />
            <Route path="mein-geschaeft" element={<MeinGeschaeft />} />
            <Route path="google-bewertungen" element={<GoogleBewertungen />} />
            <Route path="nachrichten" element={<Nachrichten />} />
            <Route path="konto" element={<MeinKonto />} />
          </Route>
          
          {/* Partner Dashboard */}
          <Route path="/partner" element={<PartnerLayout />}>
            <Route index element={<Navigate to="/partner/dashboard" replace />} />
            <Route path="dashboard" element={<PartnerDashboardHome />} />
            <Route path="leads" element={<PartnerLeads />} />
            <Route path="provisionen" element={<PartnerProvisionen />} />
            <Route path="checkout" element={<PartnerCheckout />} />
          </Route>
          
          {/* ===== APP ROUTES (End Customer) - Swipeable main pages ===== */}
          <Route path="/app/auth" element={<AppAuth />} />
          {/* Permissions are now handled natively on-demand, redirect to app */}
          <Route path="/app/permissions" element={<Navigate to="/app" replace />} />
          <Route path="/app" element={<AppProtectedRoute><SwipeableAppContainer /></AppProtectedRoute>} />
          <Route path="/app/messages" element={<AppProtectedRoute><SwipeableAppContainer /></AppProtectedRoute>} />
          <Route path="/app/stores" element={<AppProtectedRoute><SwipeableAppContainer /></AppProtectedRoute>} />
          <Route path="/app/profile" element={<AppProtectedRoute><SwipeableAppContainer /></AppProtectedRoute>} />
          {/* Non-swipeable detail pages */}
          <Route path="/app/history" element={<AppProtectedRoute><AppHistory /></AppProtectedRoute>} />
          <Route path="/app/settings" element={<AppProtectedRoute><AppSettings /></AppProtectedRoute>} />
          <Route path="/app/scan" element={<AppProtectedRoute><AppScan /></AppProtectedRoute>} />
          <Route path="/app/merchant/:id" element={<AppProtectedRoute><AppMerchantDetail /></AppProtectedRoute>} />
          <Route path="/app/suggest-shop" element={<AppProtectedRoute><AppSuggestShop /></AppProtectedRoute>} />
          <Route path="/app/terms" element={<AppProtectedRoute><AppTerms /></AppProtectedRoute>} />
          <Route path="/app/privacy" element={<AppProtectedRoute><AppPrivacy /></AppProtectedRoute>} />
          <Route path="/app/my-cards" element={<AppProtectedRoute><AppMyCards /></AppProtectedRoute>} />
          <Route path="/app/rewards" element={<AppProtectedRoute><AppRewards /></AppProtectedRoute>} />
          <Route path="/app/messages/:id" element={<AppProtectedRoute><AppMessageDetail /></AppProtectedRoute>} />
          <Route path="/app/verify-email" element={<AppVerifyEmail />} />
          
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
        </DeepLinkProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
