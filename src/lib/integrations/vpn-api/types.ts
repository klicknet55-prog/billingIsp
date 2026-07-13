export interface VpnApiCredentials {
  baseUrl: string;
  username: string;
  password: string;
}

export interface CreateVpnUserInput {
  username: string;
  password: string;
  ip: string;
}

export interface CreatePortForwardingInput {
  name: string;
  protocol: "tcp";
  listenPort: number;
  destinationIp: string;
  destinationPort: number;
}

export interface VpnApiClient {
  createUser(input: CreateVpnUserInput): Promise<void>;
  deleteUser(username: string): Promise<void>;
  disableUser(username: string): Promise<void>;
  enableUser(username: string): Promise<void>;
  createPortForwarding(input: CreatePortForwardingInput): Promise<void>;
  deletePortForwarding(name: string): Promise<void>;
}
