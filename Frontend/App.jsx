import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'

// استيراد صفحاتك
import Home from './Pages/Home'
import Idont from './Pages/HomePage'
import Login from './Pages/login'
import Register from './Pages/rigi'
import AdminHome from './Pages/Admin/admin_home'
import Games from './Pages/Games'
import Settings from './Pages/Settings'
import EnrichmentPage from './Pages/enrichmentPage'
import EnrichmentPreview from './Pages/enrichmentPreview'
import Enrichments from './Pages/Admin/enrichments'
import Addenrichments from './Pages/Admin/enrichmentAdd'
import ServerDown from './Pages/ServerDown'
import TermsOfCondition from './TermsOfCondition/Terms'

function ServerChecker({ children }) {
  // الحالة الافتراضية "ok" عشان ما تظهر شاشة تحميل
  const [isDown, setIsDown] = useState(false);
  const API_BASE_URL = "https://api.almaharat2.com"; // تأكد من تحديث هذا العنوان ليتوافق مع إعداداتك في vite.config.js

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/health`, {
          headers: {
            "ngrok-skip-browser-warning": "true",
            "Accept": "application/json"
          }
        });

        // wait for 1.5s to check if it ok or not
        await new Promise(resolve => setTimeout(resolve, 1500));

        if (!response.ok) {
          setIsDown(true);
        } else {
          setIsDown(false); // السيرفر عاد للعمل
        }
      } catch (error) {
        setIsDown(true); // فشل الاتصال تماماً
      }
    };

    // فحص فوري عند تحميل التطبيق لأول مرة
    checkHealth();

    // فحص دوري كل 0.5 ثوانٍ في الخلفية بدون ما يحس المستخدم
    const interval = setInterval(checkHealth, 500);

    return () => clearInterval(interval);
  }, []);

  // إذا انقطع الاتصال، اظهر صفحة ServerDown فوراً
  if (isDown) {
    return <ServerDown />;
  }

  // غير كذا، اعرض المحتوى الطبيعي للموقع
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <ServerChecker>
        <Routes>
          <Route path="/home" element={<Idont />} />
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin/admin_home" element={<AdminHome />} />
          <Route path="/Games" element={<Games />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/server-down" element={<ServerDown />} />
          <Route path="/enrichments" element={<EnrichmentPage />} />
          <Route path="/enrichments/:id" element={<EnrichmentPreview />} />
          <Route path="/admin/enrichments" element={<Enrichments />} />
          <Route path="/admin/enrichments/add" element={<Addenrichments />} />
          <Route path="/terms" element={<TermsOfCondition />} />
        </Routes>
      </ServerChecker>
    </BrowserRouter>
  )
}