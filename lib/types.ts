export interface UserSession {
  user?: {
    id: string;
    email: string;
    name: string;
    role: 'CLIENT' | 'DRIVER' | 'ADMIN';
  };
  expires: string;
}

export interface RideData {
  id: string;
  originAddress: string;
  destinationAddress: string;
  status: 'REQUESTED' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';
  fare: number | null;
  clientName: string;
  driverName?: string;
  createdAt: Date;
}
