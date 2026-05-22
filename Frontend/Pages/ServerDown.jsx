import "./App.css"

export default function ServerDown() {
  return (
    <div className="server-down">
      <div className="card">
        <h1>⚠️ Server Offline</h1>
        <p>السيرفر متوقف حاليًا... حاول مرة اخرى لاحقا</p>

        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    </div>
  )
}