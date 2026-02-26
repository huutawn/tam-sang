import { useQuery } from "@tanstack/react-query";
import { DonationService, LiveDonation } from "@/services/donation.service";
import { useEffect, useCallback, useRef } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8081/ws";

export function useRecentDonations() {
  return useQuery({
    queryKey: ["donations", "recent"],
    queryFn: DonationService.getRecentDonations,
  });
}

/**
 * Hook quản lý live donation feed: fetch initial + subscribe WebSocket
 */
export function useLiveDonationFeed() {
  const { data: initialDonations, isLoading } = useRecentDonations();
  const stompClientRef = useRef<Client | null>(null);
  const onNewDonationRef = useRef<((donation: LiveDonation) => void) | null>(null);

  const subscribe = useCallback((onNewDonation: (donation: LiveDonation) => void) => {
    onNewDonationRef.current = onNewDonation;
  }, []);

  // Connect to STOMP WebSocket
  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        console.log("[WS] Connected to live-feed");
        client.subscribe("/topic/donations/live-feed", (message) => {
          try {
            const donation: LiveDonation = JSON.parse(message.body);
            onNewDonationRef.current?.(donation);
          } catch (err) {
            console.error("[WS] Failed to parse message:", err);
          }
        });
      },
      onStompError: (frame) => {
        console.error("[WS] STOMP error:", frame.headers["message"]);
      },
      onDisconnect: () => {
        console.log("[WS] Disconnected");
      },
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      if (stompClientRef.current?.active) {
        stompClientRef.current.deactivate();
      }
    };
  }, []);

  return {
    initialDonations: initialDonations ?? [],
    isLoading,
    subscribe,
  };
}
