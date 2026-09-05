import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { Verify2FAPage } from './pages/auth/Verify2FAPage';
import { Setup2FAPage } from './pages/auth/Setup2FAPage';

// Operational Pages
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { OrdersPage } from './pages/orders/OrdersPage';
import { PaymentReviewPage } from './pages/orders/PaymentReviewPage';
import { ProductsPage } from './pages/products/ProductsPage';
import { CategoriesPage } from './pages/categories/CategoriesPage';
import { CustomersPage } from './pages/customers/CustomersPage';
import { CouponsPage } from './pages/coupons/CouponsPage';
import { FulfilmentPage } from './pages/fulfilment/FulfilmentPage';
import { SuppliersPage } from './pages/suppliers/SuppliersPage';
import { TrackingPage } from './pages/tracking/TrackingPage';
import { ReturnsPage } from './pages/returns/ReturnsPage';
import { CatalogPage } from './pages/catalog/CatalogPage';
import { CatalogSyncPage } from './pages/catalog/CatalogSyncPage';
import { CatalogImportPage } from './pages/catalog/CatalogImportPage';
import { AnalyticsPage } from './pages/analytics/AnalyticsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { SecurityPage } from './pages/security/SecurityPage';
import { ActivityPage } from './pages/activity/ActivityPage';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verify-2fa" element={<Verify2FAPage />} />
          <Route path="/setup-2fa" element={<Setup2FAPage />} />

          {/* Protected Administration Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:id" element={<OrdersPage />} />
            <Route path="payments" element={<PaymentReviewPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="coupons" element={<CouponsPage />} />
            <Route path="fulfilment" element={<FulfilmentPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="tracking" element={<TrackingPage />} />
            <Route path="returns" element={<ReturnsPage />} />
            <Route path="catalog" element={<CatalogPage />} />
            <Route path="catalog/sync" element={<CatalogSyncPage />} />
            <Route path="catalog/import" element={<CatalogImportPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="security" element={<SecurityPage />} />
            <Route path="activity" element={<ActivityPage />} />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
  );
}
