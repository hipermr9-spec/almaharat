import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import Loading from './Pages/Loading'
import Privacy from './Pages/privacy'

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
      <p>
        يمكنك الدخول من خلال:
      </p>

      <a
        href="https://almaharat2.com"
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
            "ngrok-skip-browser-warning": "true",
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

export default function App() {

  // اسم الدومين الحالي
  const hostname = window.location.hostname
  const pagename = window.location.pathname

  // إذا دخل من الدومين القديم
  if (hostname === "almaharat.ngrok.app") {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<OldDomainPage />} />
        </Routes>
      </BrowserRouter>
    )
  }

  // الدومين الرسمي
  return (
    <BrowserRouter>
      <ServerChecker>
        <Routes>
          <Route path="/Home" element={<Idont />} />
          <Route path="/" element={<Home />} />
          <Route path="/Login" element={<Login />} />
          <Route path="/Register" element={<Register />} />
          <Route path="/Admin/Home" element={<AdminHome />} />
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
          <Route path="/Ranks" element={<Rank />} />
          <Route path="/Stats" element={<StudentStats />} />
          <Route path="/404" element={<Error404 />} />
          <Route path="/Change/Password" element={<ChangePassword />} />
          <Route path="/port/users/user/:id/tokens/:token" element={<tokens />} />
          <Route path="/Help" element={<Help />} />
          <Route path="/Help/Verify/requirements" element={<HelpVRR />} />
          <Route path="/Chat" element={<Chat />} />
          <Route path="/Profile" element={<Profile />} />
          <Route path="/:userid" element={<Profile />} />
          <Route path="/Loading" element={<Loading />} />
          <Route path="/Privacy" element={<Privacy />} />
          <Route path="*" element={<Error404 />} />
        </Routes>
      </ServerChecker>
    </BrowserRouter>
  )
}