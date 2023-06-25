import type { WebSocket } from 'ws';

export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export type WebSocketMessage =
  | {
      type: 'error';
      error: Error;
    }
  | {
      type: 'joinRoom';
      roomId: string;
    }
  | { type: 'joinedRoom'; roomId: string };

export const sendMessage = (socket: WebSocket, message: WebSocketMessage) => {
  const stringifiedMessage = JSON.stringify(message);
  socket.send(stringifiedMessage);
};

export const parseMessage = (rawMessage: any): WebSocketMessage => {
  return JSON.parse(rawMessage.toString());
};

export const waitForMessage = async (
  socket: WebSocket,
  messageType: WebSocketMessage['type'],
  validation?: {
    field: string;
    value: string;
  },
  maxWait = 30000
) => {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const messageData: any = await new Promise((resolve) => {
      socket.onmessage = (event) => {
        resolve(event.data);
      };
    });
    const data = parseMessage(messageData);
    if (data?.type === messageType) {
      if (validation) {
        //@ts-expect-error
        const matches = data[validation.field] === validation.value;
        if (matches) {
          return data;
        } else {
          return null;
        }
      } else {
        return data;
      }
    }
    await wait(50);
  }
  return null;
};

export const waitForSocketState = (
  socket: WebSocket,
  state: WebSocket['OPEN']
) => {
  return new Promise(function (resolve) {
    setTimeout(function () {
      if (socket.readyState === state) {
        resolve(1);
      } else {
        waitForSocketState(socket, state).then(resolve);
      }
    }, 5);
  });
};
