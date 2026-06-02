import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1); // الرجوع للصفحة السابقة
    } else {
      navigate("/Home"); // إذا لا توجد صفحة سابقة
    }
  };

  return (
<div className="App">
  <h1>404</h1>
  <p>Page Not Found</p>

  <button onClick={handleBack}>
    Go Back
  </button>
</div>
  );
}