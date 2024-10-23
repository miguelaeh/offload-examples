"use client"; // The Offload Widget cannot run in the server

import Offload from 'offload-ai';
import { ChatMessage, OffloadObjectResponse, OffloadRequest, OffloadStreamResponse } from 'offload-ai/dist/sdk/types';
import { useEffect, useState } from "react";
import Link from "next/link";

// configure Offload - you should update the IDs by the ones in your dashboard
Offload.config({
  appUuid: "b370195d-a8ad-47bd-9d25-2818a6905896",
  promptUuids: {
    // Here we just map prompt uuids from the dashboard to keys, which are easier to be referenced in your code
    user_text: "4e151113-22ae-41e8-abf1-c8b358163cc9", // This prompt in the dashboard contains just the following, which is a variable: {{message}}
  }
});

function LoadingIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} fill="currentColor" className="mr-2 animate-spin" viewBox="0 0 1792 1792" xmlns="http://www.w3.org/2000/svg">
      <path d="M526 1394q0 53-37.5 90.5t-90.5 37.5q-52 0-90-38t-38-90q0-53 37.5-90.5t90.5-37.5 90.5 37.5 37.5 90.5zm498 206q0 53-37.5 90.5t-90.5 37.5-90.5-37.5-37.5-90.5 37.5-90.5 90.5-37.5 90.5 37.5 37.5 90.5zm-704-704q0 53-37.5 90.5t-90.5 37.5-90.5-37.5-37.5-90.5 37.5-90.5 90.5-37.5 90.5 37.5 37.5 90.5zm1202 498q0 52-38 90t-90 38q-53 0-90.5-37.5t-37.5-90.5 37.5-90.5 90.5-37.5 90.5 37.5 37.5 90.5zm-964-996q0 66-47 113t-113 47-113-47-47-113 47-113 113-47 113 47 47 113zm1170 498q0 53-37.5 90.5t-90.5 37.5-90.5-37.5-37.5-90.5 37.5-90.5 90.5-37.5 90.5 37.5 37.5 90.5zm-640-704q0 80-56 136t-136 56-136-56-56-136 56-136 136-56 136 56 56 136zm530 206q0 93-66 158.5t-158 65.5q-93 0-158.5-65.5t-65.5-158.5q0-92 65.5-158t158.5-66q92 0 158 66t66 158z">
      </path>
    </svg>
  );
}

export default function Home() {
  const [intent, setIntent] = useState<string>("");
  const [reply, setReply] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    // Load the widget after the render
    Offload.Widget('offload-widget-container'); // You can change the container id as far as it matches the id provided to the div container
    Offload.onError(async (error) => setError(error.message));
  }, []);

  const onPrompt = async () => {
    setLoading(true);

    const updatedMessages: ChatMessage[] = [...chatMessages, { role: "user", content: intent }];
    /**
     * This block uses data streaming
     */
    try {
      const responseStream = await Offload.offload({
        promptKey: "user_text",
        stream: true,
        variables: { message: intent }, // The prompt we configured in the dashboard contains a {{messsage}} variable. This will replace the variable with the user message
        maxTokens: 256, // Stop generation after 256 tokens
        temperature: 0, // How creative to be
        messages: updatedMessages,
      });

      let acum = "";
      for await (const textChunk of (responseStream as OffloadStreamResponse).textStream as any) {
        acum += textChunk;
        setReply(acum);
      }
      const usage = await responseStream.usage;
      console.log(usage);
      const finishReason = await responseStream.finishReason;
      console.log(finishReason);
      setChatMessages([...updatedMessages, { role: "assistant", content: acum }]);
      setReply(""); // Reset reply
      setIntent(""); // clean the text area
    } catch (e: any) {
      console.log(e)
    }

    /**
    * This block uses non-data streaming and forces a JSON schema
    */

    /*try {
      const response = await Offload.offload({
        promptKey: "user_text",
        variables: {
          message: intent, // The prompt we configured in the dashboard contains a {{messsage}} variable. This will replace the variable with the user message
        },
        stream: false,
        schema: {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "type": "object",
          "properties": {
            "name": {
              "type": "string"
            },
            "age": {
              "type": "integer"
            }
          }
        },
        messages: updatedMessages,
        temperature: 1,
      });
      const resObject = (response as OffloadObjectResponse).object; // Note we use response.object here instead of reponse.text since we are forcing the schema
      setReply(JSON.stringify(resObject));
      console.log(response.finishReason);
      console.log(response.usage);
      setChatMessages([...updatedMessages, { role: "assistant", content: JSON.stringify(resObject) }]);
      setReply(""); // Reset reply
      setIntent(""); // clean the text area
    } catch (e: any) {
      console.error(e);
    }*/

    setLoading(false);
  };

  // Handle send by pressing enter
  const handleEnter = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onPrompt();
    }
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">

        {/* Create a div for the widget */}
        <div id="offload-widget-container"></div>

        <div className="min-w-xl max-w-4xl max-h-96 space-y-3 overflow-y-auto px-3">
          {chatMessages.map((m, k) =>
            <div key={k} className={`flex w-full ${m.role === "assistant" ? "justify-start" : "justify-end"}`}>
              <p className={`p-2 bg-gray-50 border border-gray-200 rounded-md w-2/3 break-words`}>{m.content?.toString()}</p>
            </div>
          )}
          { /* While loading, show the generated text here so the user can see the stream during generation */
            loading && <div className='flex gap-4'>
              <div className='justify-left'>
                <p className="bg-gray-100 border border-gray-200 rounded-md min-h-24 w-full break-words">{reply}</p>
              </div>
              <p className="flex gap-3">{loading && <LoadingIcon />}</p>
            </div>
          }
        </div>

        <div className="flex rounded-lg border shadow-lg w-full px-4 py-2 items-center gap-6 bg-white">
          <div>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.9473 10.5616L17.1647 10.6703C18.0434 11.1232 18.7589 11.8388 19.2118 12.7174L19.3205 12.9348C19.7553 13.7953 20.9872 13.7953 21.431 12.9348L21.5397 12.7174C21.9926 11.8388 22.7082 11.1232 23.5868 10.6703L23.8042 10.5616C24.6647 10.1268 24.6647 8.89493 23.8042 8.45109L23.5868 8.3424C22.7082 7.8895 21.9926 7.17392 21.5397 6.2953L21.431 6.07791C20.9963 5.2174 19.7644 5.2174 19.3205 6.07791L19.2118 6.2953C18.7589 7.17392 18.0434 7.8895 17.1647 8.3424L16.9473 8.45109C16.0868 8.88588 16.0868 10.1178 16.9473 10.5616Z" fill="black" />
              <path d="M18.6593 19.0489C19.547 18.596 19.547 17.337 18.6593 16.8841L17.3368 16.2047C16.1593 15.5978 15.1992 14.6377 14.5923 13.4602L13.9129 12.1377C13.46 11.25 12.201 11.25 11.7481 12.1377L11.0687 13.4602C10.4618 14.6377 9.5017 15.5978 8.32416 16.2047L7.0017 16.8841C6.11402 17.337 6.11402 18.596 7.0017 19.0489L8.32416 19.7283C9.5017 20.3352 10.4618 21.2953 11.0687 22.4728L11.7481 23.7953C12.201 24.683 13.46 24.683 13.9129 23.7953L14.5923 22.4728C15.1992 21.2953 16.1593 20.3352 17.3368 19.7283L18.6593 19.0489Z" fill="black" />
              <path d="M35.6521 24.4656L34.3115 23.7772C32.6901 22.9529 31.3948 21.6576 30.5705 20.0362L29.8821 18.6957C29.2753 17.5 28.0615 16.7573 26.7209 16.7573C25.3803 16.7573 24.1666 17.5 23.5597 18.6957L22.8713 20.0362C22.047 21.6576 20.7517 22.9529 19.1303 23.7772L17.7897 24.4656C16.5941 25.0725 15.8513 26.2862 15.8513 27.6268C15.8513 28.9674 16.5941 30.1812 17.7897 30.788L19.1303 31.4765C20.7517 32.3007 22.047 33.596 22.8713 35.2174L23.5597 36.558C24.1666 37.7536 25.3803 38.4964 26.7209 38.4964C28.0615 38.4964 29.2753 37.7536 29.8821 36.558L30.5705 35.2174C31.3948 33.596 32.6901 32.3007 34.3115 31.4765L35.6521 30.788C36.8477 30.1812 37.5905 28.9674 37.5905 27.6268C37.5905 26.2862 36.8477 25.0725 35.6521 24.4656ZM34.4202 28.3696L33.0796 29.058C30.9419 30.1449 29.239 31.8478 28.1521 33.9855L27.4637 35.3261C27.2553 35.7337 26.8749 35.779 26.7209 35.779C26.5669 35.779 26.1865 35.7337 25.9781 35.3261L25.2897 33.9855C24.2028 31.8478 22.4999 30.1449 20.3622 29.058L19.0216 28.3696C18.614 28.1612 18.5687 27.7808 18.5687 27.6268C18.5687 27.4728 18.614 27.0924 19.0216 26.8841L20.3622 26.1957C22.4999 25.1087 24.2028 23.4058 25.2897 21.2681L25.9781 19.9275C26.1865 19.5199 26.5669 19.4746 26.7209 19.4746C26.8749 19.4746 27.2553 19.5199 27.4637 19.9275L28.1521 21.2681C29.239 23.4058 30.9419 25.1087 33.0796 26.1957L34.4202 26.8841C34.8278 27.0924 34.8731 27.4728 34.8731 27.6268C34.8731 27.7808 34.8278 28.1612 34.4202 28.3696Z" fill="black" />
            </svg>
          </div>
          <textarea onKeyDown={handleEnter} className="grow focus:outline-none" rows={1} onChange={(e) => setIntent(e.target.value)} value={intent} />
          <button onClick={onPrompt}>
            <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="25" cy="25" r="25" fill="#D9D9D9" />
              <path d="M24.9998 34.3333V15.6667M24.9998 15.6667L15.6665 25M24.9998 15.6667L34.3332 25" stroke="#1E1E1E" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        { error && <p className='text-red-500 bg-red-50 px-3 py-1 rounded-md'>{error}</p>}

        <div className="flex w-full justify-center">
          <Link className="hover:underline bg-white shadow-md px-2 py-1 border border-gray-200 text-gray-500 font-semibold rounded-md" target="_blank" href="https://github.com/miguelaeh/offload-examples/tree/main/nextjs">Click here to see code on GitHub</Link>
        </div>
      </main>
    </div>
  );
}
