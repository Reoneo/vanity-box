import { useEffect } from "react";

const TARGET_URL = "https://get.unstoppabledomains.com/vanity/";

const UdRedirect = () => {
  useEffect(() => {
    window.location.replace(TARGET_URL);
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "hsl(var(--background))",
      color: "hsl(var(--foreground))",
      fontFamily: "system-ui, sans-serif",
    }}>
      <p>
        Redirecting to{" "}
        <a href={TARGET_URL} style={{ color: "#D4AF37" }}>
          Unstoppable Domains
        </a>
        …
      </p>
    </div>
  );
};

export default UdRedirect;
