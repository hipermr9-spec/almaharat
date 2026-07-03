import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'

// استيراد صفحاتك
import Home from './Pages/Home'
import Idont from './Pages/HomePage'
import Login from './Pages/login'
import Register from './Pages/rigi'
import AdminHome from './Pages/Admin/admin_home'
import OwnerHome from './Pages/Website/owner_home'
import Games from './Pages/Games'
import Settings from './Pages/Settings'
import EnrichmentPage from './Pages/enrichmentPage'
import EnrichmentPreview from './Pages/enrichmentPreview'
import Enrichments from './Pages/Admin/enrichments'
import Addenrichments from './Pages/Admin/enrichmentAdd'
import ServerDown from './Pages/ServerDown'
import TermsOfCondition from './TermsOfCondition/Terms'
import Posts from './Pages/postsPage'
import AddPost from './Pages/AddPost'
import Rank from './Pages/Ranks'
import StudentStats from './Pages/stats'
import Error404 from './Pages/error404'
import ChangePassword from './Pages/changepassword'
import tokens from './Pages/tokens'
import Help from './Pages/Help'
import HelpVRR from './Pages/verifiyrequirments'
import Chat from './Pages/chat'
import Profile from './Pages/Profile'
import Privacy from './Pages/privacy'
import Ownerhomepage from './Pages/Website/owner_home'
import BlockedPages from './Pages/Website/BlockedPages'
import InWorkingPages from './Pages/Website/In_WorkingPages'
import BlockedPosts from './Pages/Website/BlockedPosts'
import RequestVerify from './Pages/sendrequest'
import PostLink from './Pages/PostLink'

function OldDomainPage() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        textAlign: 'center',
        padding: '20px'
      }}
    >
      <h1>404</h1>
      <p>هذا دومين قديم.</p>
      <p>يمكنك الدخول من خلال:</p>

      <a
        href="https://www.almaharat2.com"
        style={{
          color: '#007bff',
          fontSize: '20px',
          textDecoration: 'none',
          marginTop: '10px'
        }}
      >
        almaharat2.com
      </a>
    </div>
  )
}

function ServerChecker({ children }) {
  const [isDown, setIsDown] = useState(false)
  const API_BASE_URL = "https://api.almaharat2.com"

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/health`, {
          headers: {
            "Accept": "application/json"
          }
        })

        await new Promise(resolve => setTimeout(resolve, 1500))

        if (!response.ok) {
          setIsDown(true)
        } else {
          setIsDown(false)
        }
      } catch (error) {
        setIsDown(true)
      }
    }

    checkHealth()

    const interval = setInterval(checkHealth, 500)

    return () => clearInterval(interval)
  }, [])

  if (isDown) {
    return <ServerDown />
  }

  return children
}

function PageBlocker({ children }) {
  const location = useLocation();
  const [status, setStatus] = useState(null);
  const API_BASE_URL = "https://api.almaharat2.com";

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/pages/check?path=${encodeURIComponent(location.pathname)}`);
        if (!active) return;
        if (res.status === 426) {
          const d = await res.json();
          setStatus(d.type || 'blocked');
        } else {
          setStatus(null);
        }
      } catch (e) {
        setStatus(null);
      }
    };
    check();
    return () => { active = false; };
  }, [location.pathname]);

  if (status === 'in_working') {
    return (
      <div className="page-status-frame">الصفحة قيد العمل</div>
    );
  }
  if (status === 'blocked') {
    return (
      <div className="page-status-frame">الصفحة محظورة</div>
    );
  }
  return children;
}

export default function App() {
  const hostname = window.location.hostname

  if (hostname === "almaharat.ngrok.app") {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<OldDomainPage />} />
        </Routes>
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      <ServerChecker>
        <PageBlocker>
          <Routes>
          <Route path="/Home" element={<Idont />} />
          <Route path="/" element={<Home />} />
          <Route path="/Login" element={<Login />} />
          <Route path="/Register" element={<Register />} />
          <Route path="/Admin/Home" element={<AdminHome />} />
          <Route path="/Owner/Home" element={<OwnerHome />} />
          <Route path="/Games" element={<Games />} />
          <Route path="/Settings" element={<Settings />} />
          <Route path="/Server-Down" element={<ServerDown />} />
          <Route path="/Enrichments" element={<EnrichmentPage />} />
          <Route path="/Enrichments/:id" element={<EnrichmentPreview />} />
          <Route path="/Admin/Enrichments" element={<Enrichments />} />
          <Route path="/Admin/Enrichments/Add" element={<Addenrichments />} />
          <Route path="/Terms" element={<TermsOfCondition />} />
          <Route path="/Posts" element={<Posts />} />
          <Route path="/Posts/Add" element={<AddPost />} />
          <Route path="/Posts/link/:token" element={<PostLink />} />
          <Route path="/Ranks" element={<Rank />} />
          <Route path="/Stats/:id" element={<StudentStats />} />
          <Route path="/404" element={<Error404 />} />
          <Route path="/Change/Password" element={<ChangePassword />} />
          <Route path="/port/users/user/:id/tokens/:token" element={<tokens />} />
          <Route path="/Help" element={<Help />} />
          <Route path="/Help/Verify/requirements" element={<HelpVRR />} />
          
          {/* 🛠️ روابط الدردشة الجديدة متضمنة تحويل مسار تلقائي */}
          <Route path="/Chat" element={<Navigate to="/Chat/New" replace />} />
          <Route path="/Chat/New" element={<Chat />} />
          <Route path="/Chat/:chatid" element={<Chat />} />
          
          <Route path="/Profile" element={<Profile />} />
          <Route path="/:userid" element={<Profile />} />
          <Route path="/Privacy" element={<Privacy />} />
          <Route path="/Owner/" element={<Ownerhomepage />} />
          <Route path="/Owner/Blocked/Pages" element={<BlockedPages />} />
          <Route path="/Owner/Working/Pages" element={<InWorkingPages />} />
          <Route path="/Owner/Blocked/Posts" element={<BlockedPosts />} />
          <Route path="/Send/Verify/Request" element={<RequestVerify />} />
          <Route path="*" element={<Error404 />} />
          </Routes>
        </PageBlocker>
      </ServerChecker>
    </BrowserRouter>
  )
}