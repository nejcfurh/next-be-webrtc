export interface SignalingChannelEndpoints {
  WSS?: string;
  HTTPS?: string;
}

export interface IceServer {
  urls: string;
  username?: string;
  credential?: string;
}

export interface KVSSignalingConfig {
  channelEndpoint: string;
  channelArn: string;
  clientId: string;
  iceServers: IceServer[];
  region: string;
}
