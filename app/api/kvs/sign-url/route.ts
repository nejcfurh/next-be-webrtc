import { NextRequest, NextResponse } from 'next/server';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { URL } from 'url';

const REGION = process.env.AWS_REGION || 'us-east-1';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, queryParams } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: 'endpoint is required' },
        { status: 400 }
      );
    }

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

    const url = new URL(endpoint);
    
    // Add any query parameters from the request
    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        url.searchParams.set(key, value as string);
      });
    }

    const httpRequest = new HttpRequest({
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

    const signedRequest = await signer.sign(httpRequest);
    
    // Construct the signed URL
    const signedUrl = `${url.protocol}//${url.hostname}${url.pathname}?`;
    const signedQueryParams = new URLSearchParams(signedRequest.query as Record<string, string>);
    const finalSignedUrl = signedUrl + signedQueryParams.toString();

    return NextResponse.json(
      { signedUrl: finalSignedUrl },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );

  } catch (error: any) {
    console.error('Failed to sign URL:', error);
    return NextResponse.json(
      { error: 'Failed to sign URL', details: error.message },
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

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}