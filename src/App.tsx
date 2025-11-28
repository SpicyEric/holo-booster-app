import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
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
import Accounts from "./pages/admin/Accounts";
import Orders from "./pages/admin/Orders";
import Stats from "./pages/admin/Stats";
import Checkout from "./pages/admin/Checkout";
import Billing from "./pages/account/Billing";
import Settings from "./pages/admin/Settings";
import MerchantLayout from "./components/MerchantLayout";
import MerchantDashboard from "./pages/merchant/Dashboard";
import Stempelkarte from "./pages/merchant/Stempelkarte";
import GoogleBewertungen from "./pages/merchant/GoogleBewertungen";
import PartnerDashboard from "./pages/partner/Dashboard";
import CustomerDashboard from "./pages/customer/Dashboard";
import CustomerAccount from "./pages/customer/Account";
import CustomerInvoices from "./pages/customer/Invoices";
import CustomerUpgrade from "./pages/customer/Upgrade";
import SmsCampaigns from "./pages/customer/SmsCampaigns";
import GoogleReviews from "./pages/customer/GoogleReviews";
import Analytics from "./pages/customer/Analytics";
import Scan from "./pages/Scan";
import NotFound from "./pages/NotFound";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import CheckoutCancel from "./pages/CheckoutCancel";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
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
            <Route path="settings" element={<Settings />} />
          </Route>
          
          {/* Händler Dashboard (role: kunde) with nested layout */}
          <Route path="/kunde" element={<MerchantLayout />}>
            <Route index element={<Navigate to="/kunde/stempelkarte" replace />} />
            <Route path="stempelkarte" element={<Stempelkarte />} />
            <Route path="google-bewertungen" element={<GoogleBewertungen />} />
          </Route>
          
          {/* Legacy routes - redirect to new structure */}
          <Route path="/kunde/dashboard" element={<Navigate to="/kunde/stempelkarte" replace />} />
          <Route path="/kunde/settings" element={<Navigate to="/kunde/stempelkarte" replace />} />
          <Route path="/merchant" element={<Navigate to="/kunde/stempelkarte" replace />} />
          <Route path="/merchant/settings" element={<Navigate to="/kunde/stempelkarte" replace />} />
          
          {/* Partner Dashboard (role: admin - Partner-Funktionen werden über Admin verwaltet) */}
          <Route path="/partner" element={<PartnerDashboard />} />
          
          {/* Legacy Customer Routes (aus alter Website-DB, werden schrittweise migriert) */}
          <Route path="/account/billing" element={<Billing />} />
          <Route path="/customer" element={<CustomerDashboard />} />
          <Route path="/customer/analytics" element={<Analytics />} />
          <Route path="/customer/account" element={<CustomerAccount />} />
          <Route path="/customer/invoices" element={<CustomerInvoices />} />
          <Route path="/customer/upgrade" element={<CustomerUpgrade />} />
          <Route path="/customer/sms-campaigns" element={<SmsCampaigns />} />
          <Route path="/customer/google-reviews" element={<GoogleReviews />} />
          
          {/* Scan Route */}
          <Route path="/s/:cid" element={<Scan />} />
          
          {/* Checkout Routes */}
          <Route path="/checkout/success" element={<CheckoutSuccess />} />
          <Route path="/checkout/cancel" element={<CheckoutCancel />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
