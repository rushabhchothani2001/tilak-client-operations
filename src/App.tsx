import { Outlet, Route, Routes } from 'react-router-dom';
import { HomeRedirect, RequireAuth } from './auth/RequireAuth';
import { Layout } from './components/Layout';
import { CustomersPage } from './pages/customers/CustomersPage';
import { LoginPage } from './pages/LoginPage';
import { ManufacturingOrderPage } from './pages/manufacturing/ManufacturingOrderPage';
import { ManufacturingPage } from './pages/manufacturing/ManufacturingPage';
import { NewOrderPage } from './pages/orders/NewOrderPage';
import { OrderDetailPage } from './pages/orders/OrderDetailPage';
import { OrdersPage } from './pages/orders/OrdersPage';
import { UsersPage } from './pages/users/UsersPage';

export default function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />

      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<HomeRedirect />} />

        {/* Admin + worker */}
        <Route path="manufacturing" element={<ManufacturingPage />} />
        <Route path="manufacturing/:id" element={<ManufacturingOrderPage />} />

        {/* Admin only */}
        <Route
          element={
            <RequireAuth roles={['admin']}>
              <Outlet />
            </RequireAuth>
          }
        >
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/new" element={<NewOrderPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="users" element={<UsersPage />} />
        </Route>

        <Route path="*" element={<HomeRedirect />} />
      </Route>
    </Routes>
  );
}
