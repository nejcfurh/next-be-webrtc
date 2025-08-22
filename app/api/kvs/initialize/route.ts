import { NextRequest, NextResponse } from 'next/server';
import {
  KinesisVideoClient,
  DescribeSignalingChannelCommand,
  GetSignalingChannelEndpointCommand,
} from '@aws-sdk/client-kinesis-video';
import {
  KinesisVideoSignalingClient,
  GetIceServerConfigCommand,
} from '@aws-sdk/client-kinesis-video-signaling';
import { SigV4RequestSigner } from 'amazon-kinesis-video-streams-webrtc';

const REGION = process.env.AWS_REGION || 'us-east-1';
const CHANNEL_NAME = process.env.KVS_CHANNEL_NAME!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received request body:', body);
    const { userId, channelName } = body;

    if (!userId) {
      console.log('Missing userId in request body:', body);
      return NextResponse.json(
        { error: 'userId is required', receivedBody: body },
        { status: 400 }
      );
    }

    // Use channelName from request or fallback to env variable
    const targetChannelName = channelName || CHANNEL_NAME;
    if (!targetChannelName) {
      return NextResponse.json(
        {
          error:
            'channelName is required either in request body or environment variable',
        },
        { status: 400 }
      );
    }

    // Step 1: Get channel ARN by describing the signaling channel
    const kinesisVideoClient = new KinesisVideoClient({
      region: REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    // First, describe the signaling channel to get its ARN
    const channelInfo = await kinesisVideoClient.send(
      new DescribeSignalingChannelCommand({
        ChannelName: targetChannelName,
      })
    );

    const dynamicChannelArn = channelInfo.ChannelInfo?.ChannelARN;
    if (!dynamicChannelArn) {
      throw new Error(`Channel '${targetChannelName}' not found`);
    }

    console.log('Found channel ARN:', dynamicChannelArn);

    // Step 2: Get signaling channel endpoints
    const endpointResponse = await kinesisVideoClient.send(
      new GetSignalingChannelEndpointCommand({
        ChannelARN: dynamicChannelArn,
        SingleMasterChannelEndpointConfiguration: {
          Protocols: ['WSS', 'HTTPS'],
          Role: 'VIEWER',
        },
      })
    );

    const endpoints = endpointResponse.ResourceEndpointList?.reduce(
      (acc: Record<string, string>, endpoint) => {
        if (endpoint.Protocol && endpoint.ResourceEndpoint) {
          acc[endpoint.Protocol] = endpoint.ResourceEndpoint;
        }
        return acc;
      },
      {}
    );

    if (!endpoints || !endpoints.WSS || !endpoints.HTTPS) {
      throw new Error('Failed to get signaling channel endpoints');
    }

    // Step 2: Get ICE servers
    const kinesisVideoSignalingClient = new KinesisVideoSignalingClient({
      region: REGION,
      endpoint: endpoints.HTTPS,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const iceResponse = await kinesisVideoSignalingClient.send(
      new GetIceServerConfigCommand({
        ChannelARN: dynamicChannelArn,
      })
    );

    const iceServers: Array<{
      urls: string;
      username?: string;
      credential?: string;
    }> = [{ urls: `stun:stun.kinesisvideo.${REGION}.amazonaws.com:443` }];

    iceResponse.IceServerList?.forEach(iceServer => {
      if (iceServer.Uris?.[0]) {
        iceServers.push({
          urls: iceServer.Uris[0],
          ...(iceServer.Username && { username: iceServer.Username }),
          ...(iceServer.Password && { credential: iceServer.Password }),
        });
      }
    });

    // Step 3: Generate client ID
    const clientId = `VIEWER-${userId}`;

    // Step 4: Create signed WebSocket URL using KVS WebRTC signer
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
      'X-Amz-ChannelARN': dynamicChannelArn,
      'X-Amz-ClientId': clientId,
    };

    // Get signed URL using KVS WebRTC signer
    const finalSignedUrl = await requestSigner.getSignedURL(
      endpoints.WSS,
      queryParams
    );

    console.log(
      'Generated signed URL:',
      finalSignedUrl.substring(0, 100) + '...'
    );

    // Return all necessary configuration to the mobile client
    return NextResponse.json(
      {
        channelEndpoint: finalSignedUrl,
        channelARN: dynamicChannelArn,
        channelArn: dynamicChannelArn,
        clientId,
        region: REGION,
        httpsEndpoint: endpoints.HTTPS,
        iceServers,
        signaling: {
          wssEndpoint: finalSignedUrl,
          httpsEndpoint: endpoints.HTTPS,
          channelArn: dynamicChannelArn,
          clientId,
          region: REGION,
        },
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*', // For development - restrict in production
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to initialize KVS:', error);
    return NextResponse.json(
      { error: 'Failed to initialize KVS connection', details: errorMessage },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
