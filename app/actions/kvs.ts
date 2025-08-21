'use server';

import AWS from 'aws-sdk';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { URL } from 'url';
import type { 
  KVSSignalingConfig, 
  SignalingChannelEndpoints, 
  IceServer 
} from '@/types/kvs';

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  region: process.env.AWS_REGION || 'us-east-1',
});

const REGION = process.env.AWS_REGION || 'us-east-1';
const CHANNEL_NAME = process.env.KVS_CHANNEL_NAME!;
const CHANNEL_ARN = process.env.KVS_CHANNEL_ARN!;

export async function getSignalingChannelEndpoints(): Promise<SignalingChannelEndpoints> {
  const kinesisVideoClient = new AWS.KinesisVideo({
    region: REGION,
    correctClockSkew: true,
  });

  const response = await kinesisVideoClient
    .getSignalingChannelEndpoint({
      ChannelARN: CHANNEL_ARN,
      SingleMasterChannelEndpointConfiguration: {
        Protocols: ['WSS', 'HTTPS'],
        Role: 'VIEWER',
      },
    })
    .promise();

  const endpoints = response.ResourceEndpointList?.reduce(
    (acc: SignalingChannelEndpoints, endpoint) => {
      if (endpoint.Protocol && endpoint.ResourceEndpoint) {
        acc[endpoint.Protocol as keyof SignalingChannelEndpoints] = endpoint.ResourceEndpoint;
      }
      return acc;
    },
    {}
  );

  if (!endpoints || !endpoints.WSS || !endpoints.HTTPS) {
    throw new Error('Failed to get signaling channel endpoints');
  }

  return endpoints;
}

export async function getIceServers(httpsEndpoint: string): Promise<IceServer[]> {
  const kinesisVideoSignalingClient = new AWS.KinesisVideoSignalingChannels({
    region: REGION,
    endpoint: httpsEndpoint,
    correctClockSkew: true,
  });

  const response = await kinesisVideoSignalingClient
    .getIceServerConfig({
      ChannelARN: CHANNEL_ARN,
    })
    .promise();

  const iceServers: IceServer[] = [
    { urls: `stun:stun.kinesisvideo.${REGION}.amazonaws.com:443` }
  ];

  response.IceServerList?.forEach(iceServer => {
    if (iceServer.Uris?.[0]) {
      iceServers.push({
        urls: iceServer.Uris[0],
        ...(iceServer.Username && { username: iceServer.Username }),
        ...(iceServer.Password && { credential: iceServer.Password }),
      });
    }
  });

  return iceServers;
}

export async function getSignedWebSocketUrl(
  wssEndpoint: string,
  clientId: string
): Promise<string> {
  const credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  };

  const signer = new SignatureV4({
    credentials,
    region: REGION,
    service: 'kinesisvideo',
    sha256: Sha256,
  });

  const url = new URL(wssEndpoint);
  
  // Add query parameters
  url.searchParams.set('X-Amz-ChannelARN', CHANNEL_ARN);
  url.searchParams.set('X-Amz-ClientId', clientId);

  const request = new HttpRequest({
    method: 'GET',
    protocol: url.protocol,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams.entries()),
    headers: {
      host: url.hostname,
    },
    hostname: url.hostname,
    port: url.port ? parseInt(url.port) : undefined,
  });

  const signedRequest = await signer.sign(request);
  
  // Construct the signed URL
  const signedUrl = `${url.protocol}//${url.hostname}${url.pathname}?`;
  const queryParams = new URLSearchParams(signedRequest.query as Record<string, string>);
  
  return signedUrl + queryParams.toString();
}

export async function initializeKVSViewer(userId: string): Promise<KVSSignalingConfig> {
  try {
    // Get signaling channel endpoints
    const endpoints = await getSignalingChannelEndpoints();
    
    // Get ICE servers configuration
    const iceServers = await getIceServers(endpoints.HTTPS!);
    
    // Generate client ID
    const clientId = `VIEWER-${userId}-${Date.now()}`;
    
    // Get signed WebSocket URL
    const signedWssUrl = await getSignedWebSocketUrl(endpoints.WSS!, clientId);
    
    return {
      channelEndpoint: signedWssUrl,
      channelArn: CHANNEL_ARN,
      clientId,
      iceServers,
      region: REGION,
    };
  } catch (error) {
    console.error('Failed to initialize KVS viewer:', error);
    throw new Error('Failed to initialize KVS connection');
  }
}

export async function refreshIceServers(): Promise<IceServer[]> {
  try {
    const endpoints = await getSignalingChannelEndpoints();
    return await getIceServers(endpoints.HTTPS!);
  } catch (error) {
    console.error('Failed to refresh ICE servers:', error);
    throw new Error('Failed to refresh ICE servers');
  }
}