'use client';
import { useEffect } from 'react';

declare global {
  interface Window {
    Chatbot: {
      init: (config: any) => void;
    };
  }
}

interface FlowiseWidgetProps {
  chatflowid?: string;
  apiHost?: string;
}

export default function FlowiseWidget({
  chatflowid = process.env.NEXT_PUBLIC_FLOWISE_CHATFLOW_ID || "00000000-0000-0000-0000-000000000000",
  apiHost = process.env.NEXT_PUBLIC_FLOWISE_API_HOST || "https://ia.innovationia.com.br"
}: FlowiseWidgetProps) {

  useEffect(() => {
    // Inject the Flowise embed script
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://cdn.jsdelivr.net/npm/flowise-embed/dist/web.js';
    script.onload = () => {
      if (window.Chatbot) {
        window.Chatbot.init({
          chatflowid,
          apiHost,
          chatflowConfig: {
            // Optional: Preset prompt variables or system message overrides
          },
          theme: {
            button: {
              backgroundColor: '#8b5cf6', // Innovation Purple
              right: 20,
              bottom: 20,
              size: 'medium',
              iconColor: 'white',
              customIconSrc: 'https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/google-messages.svg',
            },
            chatWindow: {
              welcomeMessage: 'Olá! Sou a Ana IA, sua assistente de RH e Finanças. Como posso ajudar?',
              backgroundColor: '#1f2937',
              height: 700,
              width: 400,
              fontSize: 16,
              poweredByTextColor: '#303235',
              botMessage: {
                backgroundColor: '#374151',
                textColor: '#ffffff',
                showAvatar: true,
                avatarSrc: 'https://raw.githubusercontent.com/zahidkhawaja/langchain-chat-nextjs/main/public/parroticon.png',
              },
              userMessage: {
                backgroundColor: '#8b5cf6',
                textColor: '#ffffff',
                showAvatar: true,
                avatarSrc: 'https://raw.githubusercontent.com/zahidkhawaja/langchain-chat-nextjs/main/public/usericon.png',
              },
              textInput: {
                placeholder: 'Digite sua dúvida...',
                backgroundColor: '#303235',
                textColor: '#ffffff',
                sendButtonColor: '#8b5cf6',
              }
            }
          }
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup if needed (remove script or hide widget)
      document.body.removeChild(script);
    };
  }, [chatflowid, apiHost]);

  return null; // The widget renders itself outside the React tree
}
