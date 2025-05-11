import { useAuth0 } from "@auth0/auth0-react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import axios from "axios";
import { useEffect } from "react";
import { AppEventSource } from "../utils/sse";
export const Route = createFileRoute("/sse")({
  component: About,
});

function About() {
  useEffect(() => {
    const sseVoiceStream = () => {
      const urlDev = "http://localhost:3131/sse";
      const res = new AppEventSource(urlDev, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Credentials": "true",
          Connection: "keep-alive",
        },
      });
      res.onerror = (error) => {
        console.log("error", error);
      };

      res.onmessage = (data) => {
        console.log("data.data", data.data);
      };
    };
    sseVoiceStream();
  }, []);
  return (
    <>
      <div className="p-2">Hello from sse!</div>
    </>
  );
}
