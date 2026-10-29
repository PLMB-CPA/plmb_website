import { Routes, Route } from 'react-router-dom';
import PublicLayout from './components/layout/PublicLayout';
import AdminLayout from './components/layout/AdminLayout';

import Home from './components/public/Home';
import Services from './components/public/Services';
import About from './components/public/About';
import NewsletterList from './components/public/NewsletterList';
import NewsletterDetail from './components/public/NewsletterDetail';
import Contact from './components/public/Contact';

import Dashboard from './components/admin/Dashboard';
import AdminNewsletterList from './components/admin/AdminNewsletterList';
import PostNewsletter from './components/admin/PostNewsletter';
import InquiryManagement from './components/admin/InquiryManagement';
import InquiryDetail from './components/admin/InquiryDetail';
import AdminManagement from './components/admin/AdminManagement';
import Login from './components/admin/Login';
import AdminCreation from './components/admin/AdminCreation';
import SubscriberManagement from './components/admin/SubscriberManagement';

import NotFound from './components/public/NotFound';

function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/services" element={<Services />} />
        <Route path="/about" element={<About />} />
        <Route path="/newsletter" element={<NewsletterList />} />
        <Route path="/newsletter/:id" element={<NewsletterDetail />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Every page in here gets the sidebar + the login check (AdminLayout).
          Child paths are relative to /admin, e.g. "newsletters" = /admin/newsletters */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="newsletters" element={<AdminNewsletterList />} />
        <Route path="newsletters/new" element={<PostNewsletter />} />
        <Route path="newsletters/:id/edit" element={<PostNewsletter />} />
        <Route path="inquiries" element={<InquiryManagement />} />
        <Route path="inquiries/:id" element={<InquiryDetail />} />
        <Route path="subscribers" element={<SubscriberManagement />} />
        <Route path="manage" element={<AdminManagement />} />
      </Route>

      {/* No sidebar on these two, so they sit outside AdminLayout.
          (AdminCreation runs its own login check.) */}
      <Route path="/admin/login" element={<Login />} />
      <Route path="/admin/create" element={<AdminCreation />} />
    </Routes>
  );
}

export default App;
