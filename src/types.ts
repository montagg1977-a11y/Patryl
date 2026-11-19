export type Sector = 'home' | 'green' | 'yellow' | 'red';

export interface EmergencyContact {
  name: string;
  phone: string;
}

export interface SosSettings {
  contacts: EmergencyContact[];
  messageTemplate: string;
}

export interface AccessRequest {
  contact: string;
  timestamp: number;
}

export interface SituationProposal {
  description: string;
  contact: string;
}

export interface TopicVote {
  id: string;
  title: string;
  votes: number;
  voted: boolean;
}
