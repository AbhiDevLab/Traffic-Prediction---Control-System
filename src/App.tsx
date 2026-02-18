import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useSeedData } from "@/hooks/useSeedData";
import Dashboard from "./pages/Dashboard";
import DataUpload from "./pages/DataUpload";
import Analysis from "./pages/Analysis";
import Predictions from "./pages/Predictions";
import SignalControl from "./pages/SignalControl";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000 } },
});

function AppRoutes() {
  useSeedData();
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/upload" element={<DataUpload />} />
        <Route path="/analysis" element={<Analysis />} />
        <Route path="/predictions" element={<Predictions />} />
        <Route path="/signals" element={<SignalControl />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
