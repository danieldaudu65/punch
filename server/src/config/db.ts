import mongoose from 'mongoose';
import dns from 'node:dns';
import { env, isProduction } from './env';

// Some home and campus networks cannot resolve Atlas "mongodb+srv" addresses.
// Using public DNS servers locally avoids "querySrv ECONNREFUSED". Not needed on Render.
function usePublicDnsLocally() {
  if (isProduction) return;
  try {
    dns.setServers(['1.1.1.1', '8.8.8.8']);
    dns.setDefaultResultOrder('ipv4first');
  } catch (err) {
    console.warn('Could not change DNS servers, continuing with the defaults:', err);
  }
}

export async function connectDatabase(): Promise<void> {
  usePublicDnsLocally();
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI);
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
