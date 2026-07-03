import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./App.css";

// Helper to validate URL is safe
function isValidUrl(string) {
  try {
    const url = new URL(string);
    // Only allow http/https protocols
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

export default function EnrichmentDetails() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadEnrichment = async () => {
      try {
        const res = await fetch(`https://api.almaharat2.com/api/enrichments/${id}`);
        if (!res.ok) throw new Error('Failed to load enrichment');
        const data = await res.json();
        if (isMounted) setItem(data);
      } catch (err) {
        if (isMounted) {
          console.error(err);
          setError('Failed to load enrichment. Please try again.');
        }
      }
    };

    loadEnrichment();
    
    // Cleanup: prevent setState on unmounted component
    return () => { isMounted = false; };
  }, [id]);

  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!item) return <p>Loading...</p>;

  return (
    <div className="container">
      <h1 className="title">{item.title}</h1>
      <p>{item.description}</p>

      <div className="content">
        {item.type === "image" && isValidUrl(item.content) && (
          <img src={item.content} alt="" />
        )}

        {item.type === "video" && isValidUrl(item.content) && (
          <video controls src={item.content} />
        )}

        {item.type === "pdf" && isValidUrl(item.content) && (
          <iframe src={item.content} title="pdf" />
        )}

        {item.type === "audio" && isValidUrl(item.content) && (
          <audio controls src={item.content} />
        )}

        {item.type === "link" && isValidUrl(item.content) && (
          <a href={item.content} target="_blank" rel="noopener noreferrer">
            Open Link
          </a>
        )}
        
        {!isValidUrl(item.content) && (
          <p style={{ color: 'orange' }}>Invalid or unsafe content URL</p>
        )}
      </div>
    </div>
  );
}