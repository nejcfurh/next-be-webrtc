'use server';

import {
  KinesisVideoClient,
  GetSignalingChannelEndpointCommand,
} from '@aws-sdk/client-kinesis-video';
import {
  KinesisVideoSignalingClient,
  GetIceServerConfigCommand,
} from '@aws-sdk/client-kinesis-video-signaling';
import { SigV4RequestSigner } from 'amazon-kinesis-video-streams-webrtc';
import type {
  KVSSignalingConfig,
  SignalingChannelEndpoints,
  IceServer,
} from '@/types/kvs';

const REGION = process.env.AWS_REGION || 'us-east-1';
const CHANNEL_ARN = process.env.KVS_CHANNEL_ARN!;

export async function getSignalingChannelEndpoints(): Promise<SignalingChannelEndpoints> {
  const kinesisVideoClient = new KinesisVideoClient({
    region: REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  const response = await kinesisVideoClient.send(
    new GetSignalingChannelEndpointCommand({
      ChannelARN: CHANNEL_ARN,
      SingleMasterChannelEndpointConfiguration: {
        Protocols: ['WSS', 'HTTPS'],
        Role: 'VIEWER',
      },
    })
  );

  const endpoints = response.ResourceEndpointList?.reduce(
    (acc: SignalingChannelEndpoints, endpoint) => {
      if (endpoint.Protocol && endpoint.ResourceEndpoint) {
        acc[endpoint.Protocol as keyof SignalingChannelEndpoints] =
          endpoint.ResourceEndpoint;
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

export async function getIceServers(
  httpsEndpoint: string
): Promise<IceServer[]> {
  const kinesisVideoSignalingClient = new KinesisVideoSignalingClient({
    region: REGION,
    endpoint: httpsEndpoint,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  const response = await kinesisVideoSignalingClient.send(
    new GetIceServerConfigCommand({
      ChannelARN: CHANNEL_ARN,
    })
  );

  const iceServers: IceServer[] = [
    { urls: `stun:stun.kinesisvideo.${REGION}.amazonaws.com:443` },
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
  const requestSigner = new SigV4RequestSigner(
    REGION,
    {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    'kinesisvideo'
  );

  // Create query parameters
  const queryParams = {
    'X-Amz-ChannelARN': CHANNEL_ARN,
    'X-Amz-ClientId': clientId,
  };

  // Get signed URL using KVS WebRTC signer
  return await requestSigner.getSignedURL(wssEndpoint, queryParams);
}

export async function initializeKVSViewer(
  userId: string
): Promise<KVSSignalingConfig> {
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
