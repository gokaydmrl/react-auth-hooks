import { createFileRoute } from "@tanstack/react-router";
import { AppEventSource } from "../utils/sse";
// import { useState } from "react";
import { RealtimePCMPlayer } from "../utils/WavStreamPlayer";
export const Route = createFileRoute("/sound")({
  component: Sound,
});

function Sound() {
  //  const [audioBuffer, setAudioBuffer] = useState();
  const player = new RealtimePCMPlayer({ sampleRate: 24000 });

  const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Njg4MDEyLCJpYXQiOjE3NDY3MjYxMDAsImV4cCI6MzE3MjkxMTY4NTAwfQ.WqKc5G-sgElnuB3RaoGXWtZRqYJlQOwBtDpEg-tuGU0`;

  const sseVoiceStream = () => {
    const urlDev = "http://localhost:7575/api/ai/getStreamAudioStartTest";
    console.log("hello worlddd");
    const res = new AppEventSource(urlDev, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Credentials": "true",
        Connection: "keep-alive",
        Authorization: token,
      },
      body: JSON.stringify({
        // messages: chunkDialogue.value,
        //  messages: [{ role: "user", content: chunkQuestionPrompt.content }],
        text: "Merhaba iyi değilim",
        userId: 688012,
      }),
    });
    res.onerror = (error) => {
      console.log("error", error);
    };

    res.onmessage = (data) => {
      console.log("data.data", data.data);
      const a = JSON.parse(data.data);

      if (a.type === "response.created") {
        console.log("a", a);
      }
      if (a.type === "response.audio.delta") {
        console.log(
          "response.audio.delta response.audio.delta response.audio.delta"
        );
        player.enqueueChunk(a.delta);
      }
    };
  };

  return (
    <>
      <div className="p-2">Hello from Sound!</div>
      <button onClick={sseVoiceStream}>getAnswer</button>
    </>
  );
}
