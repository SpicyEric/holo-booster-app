import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DeepLinkProvider } from "@/app/components/DeepLinkProvider";
import { useConsentDialogScrollLock } from "@/hooks/useConsentDialogScrollLock";
import Landing from "./pages/Landing";
import Backoffice from "./pages/Backoffice";
import Index from "./pages/Index";
import Karriere from "./pages/Karriere";
import Kontakt from "./pages/Kontakt";
import Impressum from "./pages/Impressum";
import Datenschutz from "./pages/Datenschutz";
import Delete from "./pages/Delete";
import KontoLoeschen from "./pages/KontoLoeschen";
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
import WebsiteCheckout from "./pages/admin/WebsiteCheckout";
import BoxManagement from "./pages/admin/BoxManagement";
import Settings from "./pages/admin/Settings";
import MerchantLayout from "./components/MerchantLayout";
import KundeDashboard from "./pages/merchant/KundeDashboard";
import MeinGeschaeft from "./pages/merchant/MeinGeschaeft";
import GoogleBewertungen from "./pages/merchant/GoogleBewertungen";
import MeinKonto from "./pages/merchant/MeinKonto";
import Nachrichten from "./pages/merchant/Nachrichten";
import Transaktionen from "./pages/merchant/Transaktionen";
import Marketing from "./pages/merchant/Marketing";
import SalesRepDashboard from "./pages/salesrep/SalesRepDashboard";
import SalesRepSettings from "./pages/salesrep/SalesRepSettings";
import SalesRepMessages from "./pages/salesrep/SalesRepMessages";
import SalesRepProvisionen from "./pages/salesrep/SalesRepProvisionen";
import SalesRepOrders from "./pages/salesrep/SalesRepOrders";
import SalesRepCheckout from "./pages/salesrep/SalesRepCheckout";
import MerchantSetup from "./pages/merchant/MerchantSetup";
import Scan from "./pages/Scan";
import NotFound from "./pages/NotFound";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import CheckoutCancel from "./pages/CheckoutCancel";
import DesignVariants from "./pages/DesignVariants";
import Download from "./pages/Download";
import TestWizard from "./pages/TestWizard";

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
import AppSupport from "./app/pages/AppSupport";
import AppTerms from "./app/pages/AppTerms";
import AppPrivacy from "./app/pages/AppPrivacy";
import AppMyCards from "./app/pages/AppMyCards";
import AppVerifyEmail from "./app/pages/AppVerifyEmail";
import AppRewards from "./app/pages/AppRewards";
import AppMessageDetail from "./app/pages/AppMessageDetail";
import Leads from "./pages/admin/Leads";
import StoreFinder from "./pages/admin/StoreFinder";
import Pipeline from "./pages/admin/Pipeline";
import LeadsPipeline from "./pages/admin/LeadsPipeline";
import AdminCalendar from "./pages/admin/Calendar";
import SalesRepRegistration from "./pages/admin/SalesRepRegistration";
import BoxOrders from "./pages/admin/BoxOrders";
import BoxReturns from "./pages/admin/BoxReturns";
import SalesReps from "./pages/admin/SalesReps";
import AdminGutschriften from "./pages/admin/Gutschriften";
import SalesRepAbrechnungen from "./pages/salesrep/SalesRepAbrechnungen";
import SalesRepVertrag from "./pages/salesrep/SalesRepVertrag";
import SalesRepMeinVertrag from "./pages/salesrep/SalesRepMeinVertrag";
import SalesRepStats from "./pages/salesrep/SalesRepStats";
import AdminVertragsversionen from "./pages/admin/Vertragsversionen";
import AdminZusatzvereinbarungen from "./pages/admin/Zusatzvereinbarungen";
import AdminPushLogs from "./pages/admin/PushLogs";

const queryClient = new QueryClient();

const App = () => {
  useConsentDialogScrollLock();

  return (
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
              <Route path="/backoffice" element={<Backoffice />} />
              <Route path="/karriere" element={<Karriere />} />
              <Route path="/kontakt" element={<Kontakt />} />
              <Route path="/impressum" element={<Impressum />} />
              <Route path="/datenschutz" element={<Datenschutz />} />
              <Route path="/delete" element={<Delete />} />
              <Route path="/konto-loeschen" element={<KontoLoeschen />} />
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
                <Route path="lead-pipeline" element={<LeadsPipeline />} />
                <Route path="store-finder" element={<StoreFinder />} />
                <Route path="pipeline" element={<Pipeline />} />
                <Route path="calendar" element={<AdminCalendar />} />
                <Route path="stats" element={<Stats />} />
                <Route path="checkout" element={<Checkout />} />
                <Route path="website-checkout" element={<WebsiteCheckout />} />
                <Route path="boxes" element={<BoxManagement />} />
                <Route path="sales-rep-register" element={<SalesRepRegistration />} />
                <Route path="sales-reps" element={<SalesReps />} />
                <Route path="box-orders" element={<BoxOrders />} />
                <Route path="box-returns" element={<BoxReturns />} />
                <Route path="gutschriften" element={<AdminGutschriften />} />
                <Route path="vertragsversionen" element={<AdminVertragsversionen />} />
                <Route path="zusatzvereinbarungen" element={<AdminZusatzvereinbarungen />} />
                <Route path="push" element={<AdminPushLogs />} />
                <Route path="settings" element={<Settings />} />
                <Route path="map" element={<CustomerMap />} />
              </Route>

              {/* Händler Dashboard (role: merchant) */}
              <Route path="/kunde/setup" element={<MerchantSetup />} />
              <Route path="/kunde" element={<MerchantLayout />}>
                <Route index element={<KundeDashboard />} />
                <Route path="mein-geschaeft" element={<MeinGeschaeft />} />
                <Route path="kunden" element={<Transaktionen />} />
                <Route path="marketing" element={<Marketing />} />
                <Route path="konto" element={<MeinKonto />} />
                {/* Legacy redirects for old routes */}
                <Route path="google-bewertungen" element={<Navigate to="/kunde/marketing" replace />} />
                <Route path="nachrichten" element={<Navigate to="/kunde/marketing" replace />} />
                <Route path="transaktionen" element={<Navigate to="/kunde/kunden" replace />} />
              </Route>

              {/* Vertriebler Dashboard (role: partner/sales_partner) */}
              <Route path="/vertriebler" element={<SalesRepDashboard />}>
                <Route index element={<Overview />} />
                <Route path="provisionen" element={<SalesRepProvisionen />} />
                <Route path="customers" element={<Customers />} />
                <Route path="customers/new" element={<CustomerNew />} />
                <Route path="customers/:id" element={<CustomerDetail />} />
                <Route path="leads" element={<Leads />} />
                <Route path="lead-pipeline" element={<LeadsPipeline />} />
                <Route path="store-finder" element={<StoreFinder />} />
                <Route path="calendar" element={<AdminCalendar />} />
                <Route path="stats" element={<SalesRepStats />} />
                <Route path="checkout" element={<SalesRepCheckout />} />
                <Route path="messages" element={<SalesRepMessages />} />
                <Route path="orders" element={<SalesRepOrders />} />
                <Route path="settings" element={<SalesRepSettings />} />
                <Route path="abrechnungen" element={<SalesRepAbrechnungen />} />
                <Route path="vertrag" element={<SalesRepVertrag />} />
                <Route path="mein-vertrag" element={<SalesRepMeinVertrag />} />
                <Route path="map" element={<CustomerMap />} />
              </Route>

              {/* Legacy partner redirects */}
              <Route path="/partner/*" element={<Navigate to="/vertriebler" replace />} />

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
              <Route path="/app/support" element={<AppProtectedRoute><AppSupport /></AppProtectedRoute>} />
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
              <Route path="/test-wizard" element={<TestWizard />} />
              <Route path="/download" element={<Download />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </DeepLinkProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
