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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
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
          
          {/* Admin Map - standalone page with own navigation */}
          <Route path="/admin/map" element={<CustomerMap />} />
          
          {/* Händler Dashboard (role: kunde) with nested layout */}
          <Route path="/kunde" element={<MerchantLayout />}>
            <Route index element={<KundeDashboard />} />
            <Route path="stempelkarte" element={<Stempelkarte />} />
            <Route path="google-bewertungen" element={<GoogleBewertungen />} />
            <Route path="konto" element={<MeinKonto />} />
          </Route>
          
          {/* Legacy routes - redirect to new structure */}
          <Route path="/kunde/dashboard" element={<Navigate to="/kunde" replace />} />
          <Route path="/kunde/settings" element={<Navigate to="/kunde/stempelkarte" replace />} />
          <Route path="/merchant" element={<Navigate to="/kunde" replace />} />
          <Route path="/merchant/settings" element={<Navigate to="/kunde/stempelkarte" replace />} />
          
          {/* Legacy Customer Routes - redirect to /kunde */}
          <Route path="/customer" element={<Navigate to="/kunde" replace />} />
          <Route path="/customer/analytics" element={<Navigate to="/kunde" replace />} />
          <Route path="/customer/account" element={<Navigate to="/kunde/konto" replace />} />
          <Route path="/customer/invoices" element={<Navigate to="/kunde/konto" replace />} />
          <Route path="/customer/upgrade" element={<Navigate to="/kunde" replace />} />
          <Route path="/customer/sms-campaigns" element={<Navigate to="/kunde" replace />} />
          <Route path="/customer/google-reviews" element={<Navigate to="/kunde/google-bewertungen" replace />} />
          <Route path="/account/billing" element={<Navigate to="/kunde/konto" replace />} />
          
          {/* Partner Dashboard (role: admin - Partner-Funktionen werden über Admin verwaltet) */}
          <Route path="/partner" element={<PartnerDashboard />} />
          
          {/* Scan Route */}
          <Route path="/s/:cid" element={<Scan />} />
          
          {/* Checkout Routes */}
          <Route path="/checkout/success" element={<CheckoutSuccess />} />
          <Route path="/checkout/cancel" element={<CheckoutCancel />} />
          
          {/* Temporary Design Variants Page */}
          <Route path="/design-variants" element={<DesignVariants />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
