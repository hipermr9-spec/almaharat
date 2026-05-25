import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./App.css";

export default function EnrichmentDetails() {
  const { id } = useParams();
  const [item, setItem] = useState(null);

  useEffect(() => {
    fetch(`https://api.almaharat2.com/api/enrichments/${id}`)
      .then(res => res.json())
      .then(res => setItem(res))
      .catch(err => console.error(err));
  }, [id]);

  if (!item) return <p>Loading...</p>;

  return (
    <div className="container">
      <h1 className="title">{item.title}</h1>
      <p>{item.description}</p>

      <div className="content">
        {item.type === "image" && (
          <img src={item.content} alt="" />
        )}

        {item.type === "video" && (
          <video controls src={item.content} />
        )}

        {item.type === "pdf" && (
          <iframe src={item.content} title="pdf" />
        )}

        {item.type === "audio" && (
          <audio controls src={item.content} />
        )}

        {item.type === "link" && (
          <a href={item.content} target="_blank">
            Open Link
          </a>
        )}
      </div>
    </div>
  );
}