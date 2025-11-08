import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Feed from "@/pages/Feed";
import Upload from "@/pages/Upload";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import CreditShop from "@/pages/CreditShop";
import Checkout from "@/pages/Checkout";
import MobileMoneyPayment from "@/pages/MobileMoneyPayment";
import BankTransferPayment from "@/pages/BankTransferPayment";
import Live from "@/pages/Live";
import Messages from "@/pages/Messages";
import Settings from "@/pages/Settings";
import Search from "@/pages/Search";
import Analytics from "@/pages/Analytics";
import Shares from "@/pages/Shares";
import AppLayout from "@/components/AppLayout";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show landing page for unauthenticated users on any route
  if (isLoading || !isAuthenticated) {
    return (
      <Switch>
        <Route path="*" component={Landing} />
      </Switch>
    );
  }

  // Show authenticated routes
  return (
    <Switch>
      <Route path="/">
        <AppLayout>
          <Feed />
        </AppLayout>
      </Route>
      <Route path="/upload">
        <AppLayout>
          <Upload />
        </AppLayout>
      </Route>
      <Route path="/live">
        <AppLayout>
          <Live />
        </AppLayout>
      </Route>
      <Route path="/messages">
        <AppLayout>
          <Messages />
        </AppLayout>
      </Route>
      <Route path="/settings">
        <AppLayout>
          <Settings />
        </AppLayout>
      </Route>
      <Route path="/search">
        <AppLayout>
          <Search />
        </AppLayout>
      </Route>
      <Route path="/dashboard">
        <AppLayout>
          <Dashboard />
        </AppLayout>
      </Route>
      <Route path="/analytics">
        <AppLayout>
          <Analytics />
        </AppLayout>
      </Route>
      <Route path="/profile/:userId">
        <AppLayout>
          <Profile />
        </AppLayout>
      </Route>
      <Route path="/shop">
        <AppLayout>
          <CreditShop />
        </AppLayout>
      </Route>
      <Route path="/checkout">
        <AppLayout>
          <Checkout />
        </AppLayout>
      </Route>
      <Route path="/payment/orange_money">
        <AppLayout>
          <MobileMoneyPayment />
        </AppLayout>
      </Route>
      <Route path="/payment/mtn_money">
        <AppLayout>
          <MobileMoneyPayment />
        </AppLayout>
      </Route>
      <Route path="/payment/wave">
        <AppLayout>
          <MobileMoneyPayment />
        </AppLayout>
      </Route>
      <Route path="/payment/bank_transfer">
        <AppLayout>
          <BankTransferPayment />
        </AppLayout>
      </Route>
      <Route path="/shares">
        <AppLayout>
          <Shares />
        </AppLayout>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
