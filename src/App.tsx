import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/components/theme-provider";
import PortalLoadingScreen from "@/components/PortalLoadingScreen";

const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const PublicAttendance = lazy(() => import("./pages/PublicAttendance"));
const StudentPortalPreview = lazy(() => import("./pages/StudentPortalPreview"));
const BlockedAccess = lazy(() => import("./pages/BlockedAccess"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      gcTime: 5 * 60 * 1000,
    },
  },
});

function RouteLoading() {
  return (
    <PortalLoadingScreen
      title="Authenticating Access"
      subtitle="Checking your account and preparing the portal..."
    />
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isTA } = useAuth();

  if (isLoading) {
    return <RouteLoading />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check if email ends with @khi.iba.edu.pk OR user is a TA
  const isIBAEmail = user.email?.endsWith('@khi.iba.edu.pk');
  if (!isIBAEmail && !isTA) {
    return <BlockedAccess />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <RouteLoading />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

const AppRoutes = () => (
  <Suspense fallback={<RouteLoading />}>
    <Routes>
      <Route path="/" element={<PublicRoute><PublicAttendance /></PublicRoute>} />
      <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
      <Route path="/student-preview" element={<StudentPortalPreview />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

function ApplicationRouter() {
  const isPreviewRoute = window.location.pathname === "/student-preview";

  return (
    <BrowserRouter>
      {isPreviewRoute ? (
        <Suspense fallback={<RouteLoading />}>
          <Routes>
            <Route path="/student-preview" element={<StudentPortalPreview />} />
            <Route path="*" element={<Navigate to="/student-preview" replace />} />
          </Routes>
        </Suspense>
      ) : (
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      )}
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <TooltipProvider>
        <Sonner />
        <ApplicationRouter />
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
