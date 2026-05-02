import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Listings from './pages/Listings';
import Orders from './pages/Orders';
import DynamicSettings from './pages/DynamicSettings';
import UnifiedCategories from './pages/UnifiedCategories';
import Languages from './pages/Languages';
import Currencies from './pages/Currencies';
import Transactions from './pages/Transactions';
import PaymentMethods from './pages/PaymentMethods';
import WithdrawalRequests from './pages/WithdrawalRequests';
import UserPayoutMethods from './pages/UserPayoutMethods';
import Pages from './pages/Pages';
import PageEditor from './pages/PageEditor';
import FrontendContent from './pages/FrontendContent';
import Subscribers from './pages/Subscribers';
import Notifications from './pages/Notifications';
import Messages from './pages/Messages';
import ShippingCompanies from './pages/ShippingCompanies';
import ProductReports from './pages/ProductReports';
import ResetData from './pages/ResetData';
import Backup from './pages/Backup';
import ContactInquiries from './pages/ContactInquiries';
import NotFound from './pages/NotFound';

import { getAdminInfo } from './utils/auth';

function App() {
    return (
        <Router>
            <AdminLayout>
                <Routes>
                    <Route path="/" element={<Navigate to={getAdminInfo() ? "/dashboard" : "/login"} replace />} />
                    <Route path="/login" element={<AdminLogin />} />
                    <Route path="/dashboard" element={<AdminDashboard />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/messages" element={<Messages />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/users" element={<Users />} />
                    <Route path="/listings" element={<Listings />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/product-reports" element={<ProductReports />} />
                    <Route path="/shipping-companies" element={<ShippingCompanies />} />
                    <Route path="/wallet/transactions" element={<Transactions />} />
                    <Route path="/wallet/transactions" element={<Transactions />} />
                    <Route path="/wallet/withdrawal-requests" element={<WithdrawalRequests />} />
                    <Route path="/wallet/payout-methods" element={<UserPayoutMethods />} />
                    <Route path="/categories/main" element={<UnifiedCategories />} />
                    <Route path="/categories/subcategories" element={<UnifiedCategories />} />
                    <Route path="/categories/item-types" element={<UnifiedCategories />} />
                    <Route path="/settings/languages" element={<Languages />} />
                    <Route path="/settings/currencies" element={<Currencies />} />
                    <Route path="/settings/:type" element={<DynamicSettings />} />
                    <Route path="/frontend/content" element={<FrontendContent />} />
                    <Route path="/newsletter" element={<Subscribers />} />
                    <Route path="/pages" element={<Pages />} />
                    <Route path="/contact-inquiries" element={<ContactInquiries />} />

                    <Route path="/pages/new" element={<PageEditor />} />
                    <Route path="/pages/edit/:id" element={<PageEditor />} />

                    <Route path="/system/reset-data" element={<ResetData />} />
                    <Route path="/system/backups" element={<Backup />} />

                    {/* fallback */}
                    <Route path="/settings" element={<Navigate to="/settings/general_settings" />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </AdminLayout>
        </Router>
    );
}

export default App;
