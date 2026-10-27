import { handleChat } from '../../src/data/chat.js';

const requests = new Map();

export default async (request) => {
  const ip = request.headers.get('x-nf-client-connection-ip') || 'unknown';
  return handleChat(request, process.env, ip, requests);
};

export const config = {
  path: '/api/chat',
};
